import { currentUser } from "@clerk/nextjs/server";
import { LiveblocksError } from "@liveblocks/node";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUserColor, liveblocks } from "@/lib/liveblocks";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";

interface AuthBody {
  room?: unknown;
}

// POST /api/liveblocks-auth — issue a Liveblocks session token for a project
// room. The Liveblocks room ID is the project ID, so membership is verified
// against the same project the token grants access to.
export async function POST(request: NextRequest) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AuthBody = {};

  try {
    const parsed = (await request.json()) as unknown;
    if (parsed && typeof parsed === "object") {
      body = parsed as AuthBody;
    }
  } catch {
    // Invalid JSON body — handled by the validation below.
  }

  const roomId = typeof body.room === "string" ? body.room : "";

  if (!roomId) {
    return NextResponse.json({ error: "A room is required" }, { status: 400 });
  }

  // The room ID is the project ID; verify access with the existing helper.
  const project = await getAccessibleProject(roomId, identity);

  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ensure the room exists, creating it only if needed. Private by default —
  // access is granted per session via the token below.
  try {
    await liveblocks.getOrCreateRoom(roomId, { defaultAccesses: [] });
  } catch (error) {
    if (error instanceof LiveblocksError) {
      return NextResponse.json(
        { error: "Failed to prepare room" },
        { status: 502 },
      );
    }
    throw error;
  }

  // Resolve display name and avatar for this session.
  const user = await currentUser();
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const name =
    fullName.length > 0
      ? fullName
      : user?.username ?? identity.primaryEmail ?? "Anonymous";
  const avatar = user?.imageUrl ?? "";
  const color = getUserColor(identity.userId);

  const session = liveblocks.prepareSession(identity.userId, {
    userInfo: { name, avatar, color },
  });
  session.allow(roomId, session.FULL_ACCESS);

  const { status, body: token } = await session.authorize();
  return new Response(token, { status });
}
