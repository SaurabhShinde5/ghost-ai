import { auth, currentUser } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"

/**
 * The signed-in Clerk identity, resolved server-side.
 *
 * - `userId` is the Clerk user ID used for project ownership.
 * - `primaryEmail` is the user's primary email address (null if none).
 * - `emails` is every verified address on the account. Collaborators are keyed
 *   by email, so access checks match against the full list (consistent with
 *   `getUserProjects`), not just the primary address.
 */
export interface ClerkIdentity {
  userId: string
  primaryEmail: string | null
  emails: string[]
}

/**
 * Resolve the current Clerk identity, or `null` when unauthenticated.
 */
export async function getCurrentIdentity(): Promise<ClerkIdentity | null> {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const user = await currentUser()
  const emails =
    user?.emailAddresses.map((address) => address.emailAddress) ?? []
  const primaryEmail =
    user?.emailAddresses.find(
      (address) => address.id === user.primaryEmailAddressId
    )?.emailAddress ??
    emails[0] ??
    null

  return { userId, primaryEmail, emails }
}

interface ProjectAccessSubject {
  ownerId: string
  collaborators: { email: string }[]
}

/**
 * Whether the identity may access the project as its owner or a collaborator.
 */
export function hasProjectAccess(
  project: ProjectAccessSubject,
  identity: ClerkIdentity
): boolean {
  if (project.ownerId === identity.userId) {
    return true
  }

  const normalizedEmails = identity.emails.map((email) => email.toLowerCase())
  return project.collaborators.some((collaborator) =>
    normalizedEmails.includes(collaborator.email.toLowerCase())
  )
}


/**
 * Fetch a project the identity is allowed to open, or `null` when the project
 * does not exist or the identity is neither owner nor collaborator. Callers
 * treat both cases the same way (access denied).
 */
export async function getAccessibleProject(
  projectId: string,
  identity: ClerkIdentity
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { collaborators: { select: { email: true } } },
  })

  if (!project || !hasProjectAccess(project, identity)) {
    return null
  }

  return project
}
