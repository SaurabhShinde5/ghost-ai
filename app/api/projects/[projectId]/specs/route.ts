import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";

// GET /api/projects/[projectId]/specs — list the generated specs for a project.
// Metadata only: the blob URL (`filePath`) is never exposed to the client, so
// the client can't fetch the private blob directly (content is read back
// server-side via the download route). Any project member (owner or
// collaborator) may list, matching the download route's access model.
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/projects/[projectId]/specs">,
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

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({
    specs: specs.map((spec) => ({
      id: spec.id,
      // No human-authored filename is stored; derive one that matches the file
      // the download route serves (`Content-Disposition: spec-{id}.md`).
      filename: `spec-${spec.id}.md`,
      createdAt: spec.createdAt.toISOString(),
    })),
  });
}
