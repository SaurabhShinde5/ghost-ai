import { tasks } from "@trigger.dev/sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import type { generateSpec } from "@/trigger/generate-spec";

// Request body for POST /api/ai/spec. The canvas graph is NOT sent by the client
// — the task reads it server-side from the Liveblocks room. Only `roomId` is
// required (for access control); `chatHistory` is optional context. A
// client-supplied projectId is deliberately ignored — project access is
// resolved from the authenticated user + roomId.
const specRequestSchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(z.unknown()).optional().default([]),
});

// POST /api/ai/spec — trigger a spec generation run and start tracking it.
export async function POST(request: NextRequest) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown = {};

  try {
    rawBody = await request.json();
  } catch {
    // Invalid JSON body — handled by the validation below.
  }

  const parsed = specRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "roomId is required" },
      { status: 400 },
    );
  }

  const { roomId, chatHistory } = parsed.data;

  // Resolve project access from the room, never from a client-supplied id.
  // The Liveblocks room id is the project id throughout the app.
  const project = await getAccessibleProject(roomId, identity);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
    projectId: project.id,
    roomId,
    chatHistory: chatHistory as never,
  });

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId: project.id,
      userId: identity.userId,
    },
  });

  return NextResponse.json({ runId: handle.id }, { status: 202 });
}
