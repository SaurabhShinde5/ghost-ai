import { get } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";

// GET /api/projects/[projectId]/specs/[specId]/download — return a generated
// spec as a downloadable Markdown file. Access is verified before any blob is
// read: the caller must be authenticated, a member of the project, and the spec
// must belong to that project. The blob URL is never exposed to the client — the
// content is streamed back through the SDK (the store is private).
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/projects/[projectId]/specs/[specId]/download">,
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, specId } = await params;

  // Resolves to null when the project doesn't exist or the identity is neither
  // owner nor collaborator — both are treated as "not found" (see canvas route).
  const project = await getAccessibleProject(projectId, identity);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const spec = await prisma.projectSpec.findUnique({
    where: { id: specId },
  });

  // The spec must exist and belong to the project in the path — otherwise a
  // member of one project could download another project's spec by id.
  if (!spec || spec.projectId !== projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // The store is private, so the blob URL isn't publicly fetchable — read it
    // back through the SDK, which authenticates with the read-write token.
    const result = await get(spec.filePath, { access: "private" });

    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const markdown = await new Response(result.stream).text();

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="spec-${specId}.md"`,
      },
    });
  } catch (error) {
    console.error("Spec download failed", error);
    return NextResponse.json(
      { error: "Failed to download spec" },
      { status: 500 },
    );
  }
}
