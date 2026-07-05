"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { useOthers } from "@liveblocks/react/suspense"
import { useMemo } from "react"

// How many collaborator avatars to show before collapsing the rest into a
// "+N" overflow chip.
const MAX_VISIBLE = 5

interface Collaborator {
  /** Clerk user ID. */
  id: string
  name: string
  avatar: string
  color: string
}

// Derive up-to-two-letter initials from a display name for the image fallback.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Participant presence for the editor canvas view: collaborator avatars on the
// left, then the current user's Clerk `UserButton`. The current user is
// resolved from the active Clerk session and filtered out of the Liveblocks
// presence list so they are never rendered twice. Collaborator avatars are
// display-only.
export function PresenceAvatars() {
  const { user } = useUser()

  // Collaborators = everyone in the room except the current Clerk user,
  // de-duplicated by user ID so multiple tabs/devices collapse to one avatar.
  const collaborators = useOthers((others) => {
    const seen = new Set<string>()
    const list: Collaborator[] = []

    for (const other of others) {
      if (!other.id || other.id === user?.id) continue
      if (seen.has(other.id)) continue
      seen.add(other.id)
      list.push({
        id: other.id,
        name: other.info?.name ?? "Anonymous",
        avatar: other.info?.avatar ?? "",
        color: other.info?.color ?? "var(--accent-primary)",
      })
    }

    return list
  })

  const { visible, overflow } = useMemo(
    () => ({
      visible: collaborators.slice(0, MAX_VISIBLE),
      overflow: Math.max(collaborators.length - MAX_VISIBLE, 0),
    }),
    [collaborators]
  )

  const hasCollaborators = collaborators.length > 0

  return (
    <div className="absolute right-4 top-4 z-20 flex items-center gap-3">
      {hasCollaborators ? (
        <div className="flex items-center -space-x-2">
          {visible.map((collaborator) => (
            <CollaboratorAvatar key={collaborator.id} collaborator={collaborator} />
          ))}
          {overflow > 0 ? (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-[11px] font-semibold text-copy-secondary ring-2 ring-base"
              title={`${overflow} more`}
            >
              +{overflow}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasCollaborators ? (
        <div className="h-6 w-px bg-surface-border" aria-hidden />
      ) : null}

      <UserButton
        appearance={{
          elements: { userButtonAvatarBox: "h-8 w-8" },
        }}
      />
    </div>
  )
}

// Display-only collaborator avatar: profile photo when available, initials as a
// fallback. A subtle ring keeps overlapping avatars readable on the dark canvas.
function CollaboratorAvatar({ collaborator }: { collaborator: Collaborator }) {
  const ringClass = "ring-2 ring-base"

  if (collaborator.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={collaborator.avatar}
        alt={collaborator.name}
        title={collaborator.name}
        className={`h-8 w-8 rounded-full object-cover ${ringClass}`}
      />
    )
  }

  return (
    <div
      title={collaborator.name}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ${ringClass}`}
      style={{ backgroundColor: collaborator.color }}
    >
      {initialsOf(collaborator.name)}
    </div>
  )
}
