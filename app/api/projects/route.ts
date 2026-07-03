import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const DEFAULT_PROJECT_NAME = "Untitled Project";

interface CreateProjectBody {
  id?: unknown;
  name?: unknown;
  description?: unknown;
}

// GET /api/projects — list the authenticated user's owned projects.
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

// POST /api/projects — create a project owned by the authenticated user.
export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateProjectBody = {};

  try {
    const parsed = (await request.json()) as unknown;
    if (parsed && typeof parsed === "object") {
      body = parsed as CreateProjectBody;
    }
  } catch {
    // No/invalid JSON body — fall back to defaults.
  }

  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : DEFAULT_PROJECT_NAME;

  const description =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : undefined;

  // The client derives the id from the slugified name plus a unique suffix so
  // the project id and the Liveblocks room id stay aligned. Fall back to the
  // schema's cuid default when the caller omits it.
  const id =
    typeof body.id === "string" && body.id.trim().length > 0
      ? body.id.trim()
      : undefined;

  const project = await prisma.project.create({
    data: {
      ...(id ? { id } : {}),
      ownerId: userId,
      name,
      description,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
