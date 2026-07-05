import { randomUUID } from "node:crypto";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  mutateFlow,
  type MutateFlowOptions,
} from "@liveblocks/react-flow/node";
import { logger, metadata, task } from "@trigger.dev/sdk";
import { put } from "@vercel/blob";
import { generateText } from "ai";
import { z } from "zod";

import { getLiveblocks } from "@/lib/liveblocks";
import { prisma } from "@/lib/prisma";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

/** Gemini model used to write the spec. Mirrors the design agent's default
 * (`gemini-flash-latest`) and is overridable via `GOOGLE_AI_MODEL`. */
const AI_MODEL = process.env.GOOGLE_AI_MODEL ?? "gemini-flash-latest";

/**
 * A single chat message forwarded from the sidebar conversation. Kept permissive
 * (only `content` is required) so the varied client payloads still validate.
 */
const chatMessageSchema = z.object({
  role: z.string().optional(),
  sender: z.string().optional(),
  content: z.string(),
});

/**
 * Input contract for {@link generateSpec}. The canvas graph is NOT sent by the
 * client — it is read server-side from the shared Liveblocks room (the same
 * source the live canvas renders), so the sidebar doesn't need canvas access.
 * Only the design conversation is forwarded for extra context.
 */
const generateSpecPayloadSchema = z.object({
  projectId: z.string().min(1),
  roomId: z.string().min(1),
  chatHistory: z.array(chatMessageSchema).default([]),
});

export type GenerateSpecPayload = z.input<typeof generateSpecPayloadSchema>;

type GenerateSpecInput = z.output<typeof generateSpecPayloadSchema>;
type SpecChatMessage = GenerateSpecInput["chatHistory"][number];

const SYSTEM_PROMPT = `You are Ghost AI, a senior software architect. You turn a system-design canvas (nodes and edges) and the design conversation that produced it into a clear, professional technical specification.

Write the specification in GitHub-flavored Markdown. Structure it with these sections (use '##' headings), omitting a section only when there is genuinely nothing to say:

## Overview
A concise summary of the system and its purpose.

## Architecture
Describe the major components (canvas nodes) and how they fit together. Group related components.

## Components
For each node, describe its responsibility. Use the node label, shape (which hints at its role: rectangle=service/component, pill=process, circle=event/endpoint, diamond=decision/gateway, cylinder=datastore, hexagon=external system), and its connections.

## Data & Control Flow
Explain how the components interact, following the edges. Describe request/response paths, events, and dependencies.

## Considerations
Note scalability, reliability, security, or operational concerns implied by the design.

Rules:
- Base the spec strictly on the provided canvas and conversation. Do not invent components that are not present.
- Be specific and technical, not generic.
- Output only the Markdown specification — no preamble, no code fences around the whole document.`;

/**
 * Spec generation task. Turns the current canvas graph plus the design
 * conversation into a Markdown technical specification using Gemini, updating
 * run metadata as it progresses so the frontend can track it in realtime, and
 * returns the generated Markdown as the run output.
 */
export const generateSpec = task({
  id: "generate-spec",
  run: async (rawPayload: GenerateSpecPayload) => {
    const payload = generateSpecPayloadSchema.parse(rawPayload);
    const { projectId, roomId, chatHistory } = payload;

    metadata.set("status", "processing");
    metadata.set("phase", "interpreting");
    metadata.set(
      "message",
      "Reviewing the canvas and conversation…",
    );

    try {
      // Read the current canvas graph from the shared Liveblocks room — the same
      // Storage the live canvas renders and the design agent writes to.
      const { nodes, edges } = await readCanvasGraph(roomId);

      logger.info("Generating spec", {
        projectId,
        roomId,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        messageCount: chatHistory.length,
      });

      if (nodes.length === 0) {
        throw new Error("The canvas is empty — add nodes before generating a spec");
      }

      metadata.set("phase", "writing");
      metadata.set("message", "Writing the technical specification…");

      const google = createGoogleGenerativeAI({ apiKey: resolveGoogleApiKey() });

      const { text } = await generateText({
        model: google(AI_MODEL),
        system: SYSTEM_PROMPT,
        prompt: buildPrompt({ chatHistory, nodes, edges }),
      });

      const spec = text.trim();

      if (spec.length === 0) {
        throw new Error("The model returned an empty specification");
      }

      metadata.set("phase", "saving");
      metadata.set("message", "Saving the specification…");

      const specId = await persistSpec({ projectId, spec });

      metadata.set("status", "completed");
      metadata.set("phase", "complete");
      metadata.set("message", "Specification ready.");

      logger.info("Spec generation completed", {
        projectId,
        roomId,
        specId,
        specLength: spec.length,
      });

      return { projectId, roomId, specId, spec };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error("Spec generation failed", { projectId, roomId, error: message });

      metadata.set("status", "error");
      metadata.set("phase", "error");
      metadata.set("message", "Couldn't generate the specification.");

      throw error;
    }
  },
});

/**
 * Vercel Blob object path for a generated spec (see architecture-context.md →
 * Storage Model: `specs/{projectId}/{specId}.md`). The spec id is generated up
 * front so the path is known before the upload, matching the canvas persistence
 * pattern where Prisma stores only the blob URL reference.
 */
function specBlobPath(projectId: string, specId: string): string {
  return `specs/${projectId}/${specId}.md`;
}

/**
 * Persist a generated Markdown spec: upload the content to Vercel Blob and store
 * a metadata-only `ProjectSpec` record whose `filePath` references the blob URL.
 * Mirrors canvas persistence — content lives in Blob, metadata lives in Prisma
 * (see architecture-context.md). Returns the new spec id.
 */
async function persistSpec({
  projectId,
  spec,
}: {
  projectId: string;
  spec: string;
}): Promise<string> {
  const specId = randomUUID();

  // The Blob store is configured with private access; the spec is read back
  // server-side through the SDK by the download route, never linked publicly.
  const blob = await put(specBlobPath(projectId, specId), spec, {
    access: "private",
    contentType: "text/markdown",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  await prisma.projectSpec.create({
    data: {
      id: specId,
      projectId,
      filePath: blob.url,
    },
  });

  return specId;
}

/**
 * Read the current canvas graph from the shared Liveblocks room. Uses the same
 * server-side flow utility as the design agent (`mutateFlow`, the counterpart of
 * the canvas's `useLiveblocksFlow`) but only reads — no mutations are applied,
 * so the flush is a no-op. Returns empty arrays when the room has no graph yet.
 */
async function readCanvasGraph(
  roomId: string,
): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> {
  const liveblocks = getLiveblocks();
  const client = liveblocks as unknown as MutateFlowOptions<
    CanvasNode,
    CanvasEdge
  >["client"];

  let nodes: CanvasNode[] = [];
  let edges: CanvasEdge[] = [];

  await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
    const snapshot = flow.toJSON();
    nodes = [...snapshot.nodes];
    edges = [...snapshot.edges];
  });

  return { nodes, edges };
}

/**
 * Resolve the Gemini API key. The project's `.env.local` uses `GOOGLE_API_KEY`;
 * fall back to the other common names so the task works regardless of which the
 * Trigger.dev environment provides. (Mirrors the design agent.)
 */
function resolveGoogleApiKey(): string {
  const key =
    process.env.GOOGLE_API_KEY ??
    process.env.GOOGLE_AI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!key) {
    throw new Error("No Google AI API key is configured");
  }

  return key;
}

/** Build the user prompt: a readable text description of the canvas + chat. */
function buildPrompt({
  chatHistory,
  nodes,
  edges,
}: {
  chatHistory: SpecChatMessage[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}): string {
  const sections: string[] = [];

  sections.push(
    "Generate a technical specification for the following system design.",
  );

  sections.push(`# Canvas Components (${nodes.length})\n${describeNodes(nodes)}`);
  sections.push(
    `# Canvas Connections (${edges.length})\n${describeEdges(nodes, edges)}`,
  );

  if (chatHistory.length > 0) {
    sections.push(
      `# Design Conversation\n${describeConversation(chatHistory)}`,
    );
  }

  return sections.join("\n\n");
}

function describeNodes(nodes: CanvasNode[]): string {
  if (nodes.length === 0) return "(none)";

  return nodes
    .map((node) => {
      const label =
        typeof node.data?.label === "string" && node.data.label.trim().length > 0
          ? node.data.label.trim()
          : node.id;
      const shape =
        typeof node.data?.shape === "string" ? node.data.shape : "unspecified";
      return `- ${label} (id: ${node.id}, shape: ${shape})`;
    })
    .join("\n");
}

function describeEdges(nodes: CanvasNode[], edges: CanvasEdge[]): string {
  if (edges.length === 0) return "(none)";

  const labelById = new Map(
    nodes.map((node) => {
      const label =
        typeof node.data?.label === "string" && node.data.label.trim().length > 0
          ? node.data.label.trim()
          : node.id;
      return [node.id, label] as const;
    }),
  );

  return edges
    .map((edge) => {
      const from = labelById.get(edge.source) ?? edge.source;
      const to = labelById.get(edge.target) ?? edge.target;
      const label =
        typeof edge.data?.label === "string" && edge.data.label.trim().length > 0
          ? ` [${edge.data.label.trim()}]`
          : "";
      return `- ${from} → ${to}${label}`;
    })
    .join("\n");
}

function describeConversation(chatHistory: SpecChatMessage[]): string {
  return chatHistory
    .map((message) => {
      const who = message.sender ?? message.role ?? "participant";
      return `- ${who}: ${message.content.trim()}`;
    })
    .join("\n");
}
