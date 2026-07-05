import { get, put } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import type { CanvasSnapshot } from "@/types/canvas";

// Vercel Blob object path for a project's canvas snapshot (see
// architecture-context.md → Storage Model). Kept stable per project so each
// save overwrites the previous snapshot rather than accumulating blobs.
function canvasBlobPath(projectId: string): string {
  return `canvas/${projectId}.json`;
}

// Narrow an unknown request body into a canvas snapshot: `{ nodes, edges }`
// where both are arrays. Metadata lives in Prisma; the blob only holds graph
// content, so we validate just enough to trust the shape before uploading.
function parseCanvasSnapshot(input: unknown): CanvasSnapshot | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as { nodes?: unknown; edges?: unknown };

  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) {
    return null;
  }

  return {
    nodes: candidate.nodes as CanvasSnapshot["nodes"],
    edges: candidate.edges as CanvasSnapshot["edges"],
  };
}

// PUT /api/projects/[projectId]/canvas — persist the latest canvas JSON.
// Uploads the snapshot to Vercel Blob and stores the returned URL on the
// project record. Any project member (owner or collaborator) may save.
export async function PUT(
  request: NextRequest,
  { params }: RouteContext<"/api/projects/[projectId]/canvas">,
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await getAccessibleProject(projectId, identity);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A valid canvas JSON body is required" },
      { status: 400 },
    );
  }

  const snapshot = parseCanvasSnapshot(parsed);

  if (!snapshot) {
    return NextResponse.json(
      { error: "A valid canvas JSON body is required" },
      { status: 400 },
    );
  }

  try {
    const blob = await put(
      canvasBlobPath(projectId),
      JSON.stringify(snapshot),
      {
        // The Blob store is configured with private access; canvas snapshots are
        // read back server-side via the SDK (see GET below), never linked
        // publicly.
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      },
    );

    await prisma.project.update({
      where: { id: projectId },
      data: { canvasJsonPath: blob.url },
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Canvas save failed", error);
    return NextResponse.json(
      { error: "Failed to save canvas" },
      { status: 500 },
    );
  }
}

// GET /api/projects/[projectId]/canvas — return the saved canvas state. Reads
// the blob URL from Prisma and fetches the canvas JSON from Vercel Blob. Returns
// `{ canvas: null }` when the project has no saved snapshot yet.
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/projects/[projectId]/canvas">,
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await getAccessibleProject(projectId, identity);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!project.canvasJsonPath) {
    return NextResponse.json({ canvas: null });
  }

  try {
    // The store is private, so the blob URL isn't publicly fetchable — read it
    // back through the SDK, which authenticates with the read-write token.
    const result = await get(project.canvasJsonPath, { access: "private" });

    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ canvas: null });
    }

    const canvas = (await new Response(result.stream).json()) as CanvasSnapshot;

    return NextResponse.json({ canvas });
  } catch (error) {
    console.error("Canvas load failed", error);
    return NextResponse.json({ canvas: null });
  }
}
