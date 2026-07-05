import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Liveblocks } from "@liveblocks/node";
import { mutateFlow, type MutateFlowOptions } from "@liveblocks/react-flow/node";
import { logger, task } from "@trigger.dev/sdk";
import type { MarkerType } from "@xyflow/react";
import { generateObject } from "ai";
import { z } from "zod";

import { getLiveblocks } from "@/lib/liveblocks";
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeShape,
} from "@/types/canvas";
import {
  AI_PRESENCE_NAME,
  AI_PRESENCE_USER_ID,
  AI_STATUS_FEED_ID,
  type AiStatusMessage,
  type AiTaskPhase,
} from "@/types/tasks";

interface DesignAgentPayload {
  prompt: string;
  roomId: string;
}

/** Gemini model used to interpret the prompt into a structured design.
 * Defaults to `gemini-flash-latest` (the account has quota for it, whereas
 * `gemini-2.0-flash` returns free-tier `limit: 0`). Overridable via
 * `GOOGLE_AI_MODEL` so the model can be switched without a code change. */
const AI_MODEL = process.env.GOOGLE_AI_MODEL ?? "gemini-flash-latest";

/** Grid spacing (px) used to lay generated nodes out with clear separation. */
const COLUMN_GAP = 320;
const ROW_GAP = 200;

/** Bounds on generated graph size to keep the canvas readable. */
const MAX_NODES = 20;
const MAX_EDGES = 40;

/** AI agent presence appearance (indigo `--accent-ai`). */
const AI_COLOR = "#6457f9";

/** Presence lifetime (seconds) while the task runs; refreshed on each update. */
const PRESENCE_TTL = 120;
/** Short lifetime so the AI cursor disappears quickly once the task finishes. */
const PRESENCE_CLEAR_TTL = 2;

/** Named color roles the model chooses from, mapped to the canvas palette. */
const COLOR_ROLES = [
  "neutral",
  "blue",
  "purple",
  "orange",
  "red",
  "pink",
  "green",
  "teal",
] as const;
type ColorRole = (typeof COLOR_ROLES)[number];

// Each role maps to an index in NODE_COLORS (ui-context palette order).
const COLOR_ROLE_INDEX: Record<ColorRole, number> = {
  neutral: 0,
  blue: 1,
  purple: 2,
  orange: 3,
  red: 4,
  pink: 5,
  green: 6,
  teal: 7,
};

const SHAPE_VALUES = NODE_SHAPES.map((definition) => definition.shape) as [
  CanvasNodeShape,
  ...CanvasNodeShape[],
];

// Default pixel size per shape (drives the width/height written to each node).
const SHAPE_SIZE = new Map(
  NODE_SHAPES.map((definition) => [definition.shape, definition.defaultSize]),
);

// Structured design the model must return. A flat nodes/edges shape (no unions)
// keeps Gemini's structured output reliable. Layout is expressed as a grid
// (column/row) and turned into pixel positions here so spacing is enforced
// deterministically rather than trusted from the model.
const designSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z
          .string()
          .min(1)
          .describe("Unique kebab-case id, e.g. 'api-gateway'"),
        label: z.string().min(1).describe("Short label shown on the node"),
        shape: z.enum(SHAPE_VALUES).describe("Node shape role"),
        color: z.enum(COLOR_ROLES).describe("Node color role"),
        column: z
          .number()
          .int()
          .min(0)
          .max(12)
          .describe("Grid column, left-to-right flow (0 = leftmost)"),
        row: z
          .number()
          .int()
          .min(0)
          .max(12)
          .describe("Grid row, top-to-bottom (0 = topmost)"),
      }),
    )
    .min(1)
    .max(MAX_NODES),
  edges: z
    .array(
      z.object({
        source: z.string().min(1).describe("id of the source node"),
        target: z.string().min(1).describe("id of the target node"),
        label: z
          .string()
          .optional()
          .describe("Optional short label for the connection"),
      }),
    )
    .max(MAX_EDGES),
});

type DesignOutput = z.infer<typeof designSchema>;

const SYSTEM_PROMPT = `You are Ghost AI, a system-design assistant that turns a natural-language description into a clean architecture diagram on a shared canvas.

Return a graph of nodes and edges that represents the requested system.

Node shapes (use each for its intended role):
- rectangle: general-purpose component or service
- pill: service / process
- circle: event or endpoint
- diamond: decision / gateway
- cylinder: database / storage
- hexagon: external system / boundary

Node colors (choose the role that best fits each node):
- neutral (default), blue, purple, orange, red, pink, green, teal
Use color to group related concerns (e.g. all databases teal, external systems purple). Prefer a small, consistent set of colors.

Layout rules:
- Arrange the system as a left-to-right flow using the "column" field (0 is leftmost). Downstream components go in higher columns.
- Use the "row" field to separate parallel components in the same stage.
- Keep the graph readable: no more than ${MAX_NODES} nodes. Avoid crossing edges where possible by ordering rows sensibly.
- Give every node a unique kebab-case id and a concise label.

Edges:
- Connect nodes to show data/control flow. Reference nodes by their id.
- Add a short edge label only when it clarifies the relationship (e.g. "reads", "publishes").

Only describe the requested system. Do not invent unrelated components.`;

/**
 * Full AI design generation task. Interprets the user's prompt with Gemini,
 * writes the resulting nodes/edges into the shared Liveblocks room through the
 * collaborative flow utility (`mutateFlow`, the server counterpart of the
 * canvas's `useLiveblocksFlow`), and publishes AI presence + status so every
 * participant sees progress in real time.
 */
export const designAgent = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload) => {
    const { prompt, roomId } = payload;
    const liveblocks = getLiveblocks();

    await ensureStatusFeed(liveblocks, roomId);
    await publishStatus(liveblocks, roomId, {
      phase: "start",
      text: "Ghost AI is interpreting your prompt…",
    });
    await setAiPresence(liveblocks, roomId, { cursor: null, thinking: true });

    try {
      await publishStatus(liveblocks, roomId, {
        phase: "processing",
        text: "Designing your architecture…",
      });

      const google = createGoogleGenerativeAI({ apiKey: resolveGoogleApiKey() });

      const { object } = await generateObject({
        model: google(AI_MODEL),
        schema: designSchema,
        system: SYSTEM_PROMPT,
        prompt,
      });

      const { nodes, edges } = buildGraph(object);

      if (nodes.length === 0) {
        throw new Error("The model did not return any nodes");
      }

      // Park the AI cursor over the new design so participants see where it is
      // working, then apply the graph through the collaborative flow.
      await setAiPresence(liveblocks, roomId, {
        cursor: centroidOf(nodes),
        thinking: true,
      });

      const client = liveblocks as unknown as MutateFlowOptions<
        CanvasNode,
        CanvasEdge
      >["client"];

      await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
        flow.addNodes(nodes);
        flow.addEdges(edges);
      });

      await publishStatus(liveblocks, roomId, {
        phase: "complete",
        text: `Added ${nodes.length} ${nodes.length === 1 ? "node" : "nodes"} and ${edges.length} ${edges.length === 1 ? "connection" : "connections"}.`,
      });

      logger.info("Design agent completed", {
        roomId,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      });

      return { roomId, nodeCount: nodes.length, edgeCount: edges.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error("Design agent failed", { roomId, error: message });

      await publishStatus(liveblocks, roomId, {
        phase: "error",
        text: "Ghost AI couldn't generate a design. Please try again.",
      });

      throw error;
    } finally {
      // Always clear AI presence once the task finishes, success or failure.
      await clearAiPresence(liveblocks, roomId);
    }
  },
});

/**
 * Resolve the Gemini API key. The project's `.env.local` uses `GOOGLE_API_KEY`;
 * fall back to the other common names so the task works regardless of which the
 * Trigger.dev environment provides.
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

// Turn the model's structured output into canvas nodes/edges, enforcing the
// palette, shapes, and grid spacing rules. Invalid or duplicate ids and edges
// referencing unknown nodes are dropped so the graph is always consistent.
function buildGraph(output: DesignOutput): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
} {
  const nodes: CanvasNode[] = [];
  const positions = new Map<string, { column: number; row: number }>();

  for (const raw of output.nodes) {
    if (positions.has(raw.id)) continue; // skip duplicate ids

    const size = SHAPE_SIZE.get(raw.shape) ?? NODE_SHAPES[0].defaultSize;
    const fill = NODE_COLORS[COLOR_ROLE_INDEX[raw.color]].fill;

    positions.set(raw.id, { column: raw.column, row: raw.row });
    nodes.push({
      id: raw.id,
      type: CANVAS_NODE_TYPE,
      position: { x: raw.column * COLUMN_GAP, y: raw.row * ROW_GAP },
      data: { label: raw.label, color: fill, shape: raw.shape },
      width: size.width,
      height: size.height,
    });
  }

  const edges: CanvasEdge[] = [];
  const seen = new Set<string>();

  output.edges.forEach((raw, index) => {
    const from = positions.get(raw.source);
    const to = positions.get(raw.target);
    if (!from || !to) return; // edge references an unknown node

    const key = `${raw.source}->${raw.target}`;
    if (seen.has(key)) return;
    seen.add(key);

    const { source: sourceHandle, target: targetHandle } = edgeHandles(from, to);
    const label = raw.label?.trim();

    edges.push({
      id: `ai-edge-${index}-${raw.source}-${raw.target}`,
      source: raw.source,
      target: raw.target,
      sourceHandle,
      targetHandle,
      type: CANVAS_EDGE_TYPE,
      data: label ? { label } : {},
      markerEnd: {
        type: "arrowclosed" as MarkerType,
        color: "var(--edge-stroke)",
        width: 18,
        height: 18,
      },
    });
  });

  return { nodes, edges };
}

// Pick the connection handles for an edge from the relative grid positions of
// its endpoints, matching the node's four-side handle ids so routing is clean.
function edgeHandles(
  from: { column: number; row: number },
  to: { column: number; row: number },
): { source: string; target: string } {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;

  if (Math.abs(columnDelta) >= Math.abs(rowDelta)) {
    return columnDelta >= 0
      ? { source: "right", target: "left" }
      : { source: "left", target: "right" };
  }

  return rowDelta >= 0
    ? { source: "bottom", target: "top" }
    : { source: "top", target: "bottom" };
}

// Center point (flow coordinates) of the generated nodes, used to place the AI
// cursor over the new design.
function centroidOf(nodes: CanvasNode[]): { x: number; y: number } {
  const total = nodes.reduce(
    (acc, node) => {
      acc.x += node.position.x + (node.width ?? 0) / 2;
      acc.y += node.position.y + (node.height ?? 0) / 2;
      return acc;
    },
    { x: 0, y: 0 },
  );

  return { x: total.x / nodes.length, y: total.y / nodes.length };
}

// --- Liveblocks presence + status feed helpers -----------------------------
// All are best-effort: a Liveblocks hiccup must never fail the canvas update,
// which is the core deliverable.

// Ensure the shared AI status feed exists. Creating it is idempotent from the
// task's point of view — if it already exists the error is swallowed.
async function ensureStatusFeed(
  liveblocks: Liveblocks,
  roomId: string,
): Promise<void> {
  try {
    await liveblocks.createFeed({ roomId, feedId: AI_STATUS_FEED_ID });
  } catch {
    // Feed already exists (or feeds are unavailable) — messages still work.
  }
}

// Publish a status message to the shared AI status feed so every participant
// can see the current progress.
async function publishStatus(
  liveblocks: Liveblocks,
  roomId: string,
  status: Pick<AiStatusMessage, "phase" | "text"> & { phase: AiTaskPhase },
): Promise<void> {
  const data = {
    kind: "design",
    phase: status.phase,
    ...(status.text !== undefined ? { text: status.text } : {}),
    at: Date.now(),
  } satisfies AiStatusMessage;

  try {
    await liveblocks.createFeedMessage({
      roomId,
      feedId: AI_STATUS_FEED_ID,
      // The feed message payload must be JSON; AiStatusMessage is structurally
      // JSON but lacks the index signature the SDK's Json type requires.
      data: data as unknown as Parameters<
        typeof liveblocks.createFeedMessage
      >[0]["data"],
    });
  } catch (error) {
    logger.warn("Failed to publish AI status", {
      roomId,
      phase: status.phase,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Set the AI agent's ephemeral presence in the room. This surfaces the AI as a
// participant in the existing presence UI (live cursor + avatar) without a
// WebSocket connection, reusing the same presence shape as human participants.
async function setAiPresence(
  liveblocks: Liveblocks,
  roomId: string,
  data: { cursor: { x: number; y: number } | null; thinking: boolean },
): Promise<void> {
  try {
    await liveblocks.setPresence(roomId, {
      userId: AI_PRESENCE_USER_ID,
      data,
      userInfo: { name: AI_PRESENCE_NAME, avatar: "", color: AI_COLOR },
      ttl: PRESENCE_TTL,
    });
  } catch (error) {
    logger.warn("Failed to set AI presence", {
      roomId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Clear the AI agent's presence with a short TTL so its cursor disappears
// quickly once generation finishes.
async function clearAiPresence(
  liveblocks: Liveblocks,
  roomId: string,
): Promise<void> {
  try {
    await liveblocks.setPresence(roomId, {
      userId: AI_PRESENCE_USER_ID,
      data: { cursor: null, thinking: false },
      userInfo: { name: AI_PRESENCE_NAME, avatar: "", color: AI_COLOR },
      ttl: PRESENCE_CLEAR_TTL,
    });
  } catch (error) {
    logger.warn("Failed to clear AI presence", {
      roomId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
