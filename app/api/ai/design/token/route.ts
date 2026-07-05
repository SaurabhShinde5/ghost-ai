import { auth } from "@trigger.dev/sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCurrentIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

interface TokenRequestBody {
  runId?: unknown;
}

// POST /api/ai/design/token — issue a Trigger.dev public token scoped to a run
// the caller owns, so the frontend can subscribe to it in realtime.
export async function POST(request: NextRequest) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TokenRequestBody = {};

  try {
    const parsed = (await request.json()) as unknown;
    if (parsed && typeof parsed === "object") {
      body = parsed as TokenRequestBody;
    }
  } catch {
    // Invalid JSON body — handled by the validation below.
  }

  const runId =
    typeof body.runId === "string" && body.runId.trim().length > 0
      ? body.runId.trim()
      : null;

  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const taskRun = await prisma.taskRun.findUnique({
    where: { runId },
  });

  if (!taskRun) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (taskRun.userId !== identity.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = await auth.createPublicToken({
    scopes: {
      read: {
        runs: [runId],
      },
    },
  });

  return NextResponse.json({ token });
}
