import { clerkClient } from "@clerk/nextjs/server"

import type { Collaborator } from "@/types/collaborator"

interface CollaboratorRecord {
  id: string
  email: string
}

interface ClerkProfile {
  name: string | null
  imageUrl: string | null
}

/** Basic RFC-lite email shape check for input validation at the API boundary. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/**
 * Enrich collaborator records (stored by email) with Clerk display name and
 * avatar. Collaborators are not backed by a local user table, so profile data is
 * resolved on demand via the Clerk Backend API.
 *
 * If Clerk has no user for an email — or the lookup fails entirely — the
 * collaborator is returned with `name`/`imageUrl` as `null` so the UI can fall
 * back to showing the email only.
 */
export async function enrichCollaborators(
  records: CollaboratorRecord[]
): Promise<Collaborator[]> {
  if (records.length === 0) {
    return []
  }

  const emails = records.map((record) => record.email)
  const profilesByEmail = new Map<string, ClerkProfile>()

  try {
    const client = await clerkClient()
    const { data } = await client.users.getUserList({
      emailAddress: emails,
      limit: Math.min(emails.length, 100),
    })

    for (const user of data) {
      const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim()
      const name = fullName.length > 0 ? fullName : user.username ?? null
      const profile: ClerkProfile = { name, imageUrl: user.imageUrl ?? null }

      for (const address of user.emailAddresses) {
        profilesByEmail.set(address.emailAddress.toLowerCase(), profile)
      }
    }
  } catch {
    // Clerk lookup failed — fall through to email-only rendering.
  }

  return records.map((record) => {
    const profile = profilesByEmail.get(record.email.toLowerCase())
    return {
      id: record.id,
      email: record.email,
      name: profile?.name ?? null,
      imageUrl: profile?.imageUrl ?? null,
    }
  })
}
