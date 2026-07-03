import { EditorShell } from "@/components/editor/editor-shell"
import { getUserProjects } from "@/lib/projects"

// Server component: load the user's projects server-side, then hand off to the
// interactive editor shell. No client-side fetching for the initial load.
export default async function EditorPage() {
  const { owned, shared } = await getUserProjects()

  return <EditorShell ownedProjects={owned} sharedProjects={shared} />
}
