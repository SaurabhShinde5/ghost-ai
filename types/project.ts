/**
 * Access role a signed-in user has on a project. Owners can rename and delete;
 * collaborators only have access to shared projects.
 */
export type ProjectRole = "owner" | "collaborator"

export interface Project {
  id: string
  name: string
  slug: string
  role: ProjectRole
}

export function isOwnedProject(project: Project): boolean {
  return project.role === "owner"
}
