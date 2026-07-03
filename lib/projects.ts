import { auth, currentUser } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/slug"
import type { Project, ProjectRole } from "@/types/project"

export interface UserProjects {
  owned: Project[]
  shared: Project[]
}

function toClientProject(
  project: { id: string; name: string },
  role: ProjectRole
): Project {
  return {
    id: project.id,
    name: project.name,
    slug: slugify(project.name),
    role,
  }
}

/**
 * Fetch the signed-in user's projects for the editor home, server-side.
 *
 * - `owned`: projects whose `ownerId` is the current user.
 * - `shared`: projects where one of the user's Clerk email addresses matches a
 *   collaborator record (excluding ones the user already owns).
 *
 * Returns empty lists when there is no authenticated user.
 */
export async function getUserProjects(): Promise<UserProjects> {
  const { userId } = await auth()

  if (!userId) {
    return { owned: [], shared: [] }
  }

  const user = await currentUser()
  const emails =
    user?.emailAddresses.map((address) => address.emailAddress) ?? []

  const [ownedRecords, sharedRecords] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    }),
    emails.length > 0
      ? prisma.project.findMany({
          where: {
            ownerId: { not: userId },
            collaborators: { some: { email: { in: emails } } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ])

  return {
    owned: ownedRecords.map((project) => toClientProject(project, "owner")),
    shared: sharedRecords.map((project) =>
      toClientProject(project, "collaborator")
    ),
  }
}
