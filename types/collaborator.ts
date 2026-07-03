/**
 * A project collaborator, keyed by email in the database and optionally enriched
 * with Clerk profile data. `name` and `imageUrl` are `null` when no Clerk user is
 * found for the email — callers fall back to showing the email only.
 */
export interface Collaborator {
  /** `ProjectCollaborator.id` — used to target removal. */
  id: string
  email: string
  name: string | null
  imageUrl: string | null
}
