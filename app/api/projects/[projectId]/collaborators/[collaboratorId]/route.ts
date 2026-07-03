import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentIdentity } from "@/lib/project-access";

// DELETE /api/projects/[projectId]/collaborators/[collaboratorId] — remove a
// collaborator from a project. Owner only.
export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: RouteContext<"/api/projects/[projectId]/collaborators/[collaboratorId]">,
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, collaboratorId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.ownerId !== identity.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Scope the delete to this project so a collaborator id from another project
  // can't be removed here. `deleteMany` returns a count instead of throwing.
  const { count } = await prisma.projectCollaborator.deleteMany({
    where: { id: collaboratorId, projectId },
  });

  if (count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
