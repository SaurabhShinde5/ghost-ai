import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShell } from "@/components/editor/workspace-shell"
import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access"
import { getUserProjects } from "@/lib/projects"

// Server component: enforce access before rendering the workspace shell.
// - unauthenticated  → redirect to /sign-in
// - missing project  → AccessDenied
// - no project access → AccessDenied
export default async function EditorRoomPage(
  props: PageProps<"/editor/[roomId]">
) {
  const { roomId } = await props.params

  const identity = await getCurrentIdentity()

  if (!identity) {
    redirect("/sign-in")
  }

  const project = await getAccessibleProject(roomId, identity)

  if (!project) {
    return <AccessDenied />
  }

  const { owned, shared } = await getUserProjects()

  return (
    <WorkspaceShell
      project={{ id: project.id, name: project.name }}
      ownedProjects={owned}
      sharedProjects={shared}
      isOwner={project.ownerId === identity.userId}
    />
  )
}
