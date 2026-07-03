"use client"

import * as React from "react"
import { Check, Copy, Loader2, Trash2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EditorDialog } from "@/components/editor/editor-dialog"
import type { Collaborator } from "@/types/collaborator"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  /** Whether the current user owns the project — gates invite/remove/copy. */
  isOwner: boolean
}

const INVITE_FORM_ID = "invite-collaborator-form"

// Owner-managed sharing surface opened from the workspace navbar. Owners invite
// and remove collaborators and copy the project link; collaborators see the
// list read-only. Collaborator profiles come from Clerk when available.
export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  isOwner,
}: ShareDialogProps) {
  const [collaborators, setCollaborators] = React.useState<Collaborator[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [email, setEmail] = React.useState("")
  const [isInviting, setIsInviting] = React.useState(false)
  const [inviteError, setInviteError] = React.useState<string | null>(null)

  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  // Load collaborators each time the dialog opens.
  React.useEffect(() => {
    if (!open) return

    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const response = await fetch(
          `/api/projects/${projectId}/collaborators`,
          { signal: controller.signal }
        )
        if (!response.ok) throw new Error("Failed to load collaborators")
        const data = (await response.json()) as {
          collaborators: Collaborator[]
        }
        setCollaborators(data.collaborators)
      } catch {
        if (!controller.signal.aborted) {
          setLoadError("Could not load collaborators.")
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void load()

    return () => controller.abort()
  }, [open, projectId])

  // Reset transient state whenever the dialog is dismissed.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEmail("")
      setInviteError(null)
      setCopied(false)
      setRemovingId(null)
    }
    onOpenChange(next)
  }

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || isInviting) return

    setIsInviting(true)
    setInviteError(null)

    try {
      const response = await fetch(
        `/api/projects/${projectId}/collaborators`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        }
      )

      const data = (await response.json().catch(() => null)) as
        | { collaborator?: Collaborator; error?: string }
        | null

      if (!response.ok || !data?.collaborator) {
        setInviteError(data?.error ?? "Could not invite this person.")
        return
      }

      setCollaborators((current) => [...current, data.collaborator!])
      setEmail("")
    } catch {
      setInviteError("Could not invite this person.")
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (removingId) return
    setRemovingId(id)

    try {
      const response = await fetch(
        `/api/projects/${projectId}/collaborators/${id}`,
        { method: "DELETE" }
      )

      if (response.ok) {
        setCollaborators((current) =>
          current.filter((collaborator) => collaborator.id !== id)
        )
      }
    } catch {
      // Leave the collaborator in place on failure.
    } finally {
      setRemovingId(null)
    }
  }

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/editor/${projectId}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — no feedback shown.
    }
  }

  return (
    <EditorDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Share project"
      description={
        isOwner
          ? `Invite people to collaborate on “${projectName}”.`
          : `People with access to “${projectName}”.`
      }
    >
      <div className="space-y-4">
        {isOwner ? (
          <form
            id={INVITE_FORM_ID}
            onSubmit={handleInvite}
            className="space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (inviteError) setInviteError(null)
                }}
                placeholder="teammate@example.com"
                aria-label="Collaborator email"
                disabled={isInviting}
              />
              <Button
                type="submit"
                disabled={isInviting || email.trim().length === 0}
              >
                {isInviting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <UserPlus />
                )}
                Invite
              </Button>
            </div>
            {inviteError ? (
              <p className="text-xs text-error">{inviteError}</p>
            ) : null}
          </form>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-medium text-copy-muted">
            Collaborators
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-copy-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : loadError ? (
            <p className="py-6 text-center text-xs text-copy-muted">
              {loadError}
            </p>
          ) : collaborators.length === 0 ? (
            <p className="py-6 text-center text-xs text-copy-muted">
              No collaborators yet.
            </p>
          ) : (
            <ScrollArea className="max-h-56">
              <ul className="space-y-1 pr-3">
                {collaborators.map((collaborator) => (
                  <CollaboratorRow
                    key={collaborator.id}
                    collaborator={collaborator}
                    canRemove={isOwner}
                    isRemoving={removingId === collaborator.id}
                    onRemove={() => handleRemove(collaborator.id)}
                  />
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>

        {isOwner ? (
          <div className="flex items-center justify-between gap-2 border-t border-surface-border pt-3">
            <p className="min-w-0 truncate text-xs text-copy-muted">
              Anyone invited can open this project.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              aria-label="Copy project link"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
        ) : null}
      </div>
    </EditorDialog>
  )
}

interface CollaboratorRowProps {
  collaborator: Collaborator
  canRemove: boolean
  isRemoving: boolean
  onRemove: () => void
}

function CollaboratorRow({
  collaborator,
  canRemove,
  isRemoving,
  onRemove,
}: CollaboratorRowProps) {
  const { email, name, imageUrl } = collaborator
  const primaryLabel = name ?? email

  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-subtle">
      <CollaboratorAvatar
        imageUrl={imageUrl}
        label={primaryLabel}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-copy-primary" title={primaryLabel}>
          {primaryLabel}
        </p>
        {name ? (
          <p className="truncate text-xs text-copy-muted" title={email}>
            {email}
          </p>
        ) : null}
      </div>
      {canRemove ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label={`Remove ${primaryLabel}`}
        >
          {isRemoving ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Trash2 />
          )}
        </Button>
      ) : null}
    </li>
  )
}

interface CollaboratorAvatarProps {
  imageUrl: string | null
  label: string
}

function CollaboratorAvatar({ imageUrl, label }: CollaboratorAvatarProps) {
  const initial = label.trim().charAt(0).toUpperCase() || "?"

  if (imageUrl) {
    return (
      // Clerk avatars come from arbitrary external hosts; a plain img avoids
      // configuring next/image remote patterns for every possible domain.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-elevated text-xs font-medium text-copy-secondary">
      {initial}
    </span>
  )
}
