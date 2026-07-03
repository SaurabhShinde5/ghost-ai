import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { enrichCollaborators, isValidEmail } from "@/lib/collaborators";
import { prisma } from "@/lib/prisma";
import { getCurrentIdentity, hasProjectAccess } from "@/lib/project-access";

interface InviteBody {
  email?: unknown;
}

// GET /api/projects/[projectId]/collaborators — list collaborators, enriched
// with Clerk profile data. Any project member (owner or collaborator) may read.
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/projects/[projectId]/collaborators">,
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: {
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!hasProjectAccess(project, identity)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const collaborators = await enrichCollaborators(project.collaborators);
  const isOwner = project.ownerId === identity.userId;

  return NextResponse.json({ collaborators, isOwner });
}

// POST /api/projects/[projectId]/collaborators — invite a collaborator by
// email. Owner only.
export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/api/projects/[projectId]/collaborators">,
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  let body: InviteBody = {};

  try {
    const parsed = (await request.json()) as unknown;
    if (parsed && typeof parsed === "object") {
      body = parsed as InviteBody;
    }
  } catch {
    // Invalid JSON body — handled by the validation below.
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "A valid email is required" },
      { status: 400 },
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.ownerId !== identity.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.projectCollaborator.findUnique({
    where: { projectId_email: { projectId, email } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "This person is already a collaborator" },
      { status: 409 },
    );
  }

  const record = await prisma.projectCollaborator.create({
    data: { projectId, email },
    select: { id: true, email: true },
  });

  const [collaborator] = await enrichCollaborators([record]);

  return NextResponse.json({ collaborator }, { status: 201 });
}
