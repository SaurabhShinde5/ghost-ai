// Shared types for AI background tasks (design + spec generation) and the
// realtime signals they publish to the collaborative room.

import { z } from "zod"

/** Which AI background task a status message refers to. Kept generic so both
 * design and spec generation can share the same feed. */
export type AiTaskKind = "design" | "spec"

/** Lifecycle stage a status message reports. */
export type AiTaskPhase = "start" | "processing" | "complete" | "error"

/**
 * A single message on the shared AI status feed (the Liveblocks feed
 * {@link AI_STATUS_FEED_ID}). Intentionally small and generic so every
 * participant can read the most recent AI activity regardless of which task
 * produced it. The `text` field is optional per spec.
 */
export interface AiStatusMessage {
  /** The task that produced this status. */
  kind: AiTaskKind
  /** The lifecycle stage this status reports. */
  phase: AiTaskPhase
  /** Human-readable status shown in the sidebar. */
  text?: string
  /** Epoch milliseconds when the status was produced. */
  at: number
}

/** Liveblocks feed ID for the shared AI status feed. */
export const AI_STATUS_FEED_ID = "ai-status-feed" as const

/** Stable Liveblocks user ID used for the AI agent's presence in a room. */
export const AI_PRESENCE_USER_ID = "ghost-ai" as const

/** Display name shown on the AI agent's cursor and avatar. */
export const AI_PRESENCE_NAME = "Ghost AI" as const

const AI_TASK_KINDS: readonly AiTaskKind[] = ["design", "spec"]
const AI_TASK_PHASES: readonly AiTaskPhase[] = [
  "start",
  "processing",
  "complete",
  "error",
]

/**
 * Validate an unknown value as an {@link AiStatusMessage}. Feed messages come
 * from the network, so they must be validated before being trusted/displayed.
 * Returns the narrowed message or `null` when the shape is invalid.
 */
export function parseAiStatusMessage(value: unknown): AiStatusMessage | null {
  if (!value || typeof value !== "object") return null

  const record = value as Record<string, unknown>

  if (
    typeof record.kind !== "string" ||
    !AI_TASK_KINDS.includes(record.kind as AiTaskKind)
  ) {
    return null
  }

  if (
    typeof record.phase !== "string" ||
    !AI_TASK_PHASES.includes(record.phase as AiTaskPhase)
  ) {
    return null
  }

  if (record.text !== undefined && typeof record.text !== "string") return null
  if (typeof record.at !== "number") return null

  return {
    kind: record.kind as AiTaskKind,
    phase: record.phase as AiTaskPhase,
    text: record.text as string | undefined,
    at: record.at,
  }
}

// --- Sidebar room chat ------------------------------------------------------

/**
 * Liveblocks feed ID for the collaborative sidebar chat. Deliberately separate
 * from {@link AI_STATUS_FEED_ID}: this feed carries only human chat messages,
 * never AI progress/status updates.
 */
export const AI_CHAT_FEED_ID = "ai-chat" as const

/**
 * Who authored a chat message. Only `user` messages are produced today; the
 * `assistant` role is reserved for future AI-generated replies (out of scope
 * for now) so readers already tolerate it.
 */
export const CHAT_MESSAGE_ROLES = ["user", "assistant"] as const

/**
 * Shape of a single message on the {@link AI_CHAT_FEED_ID} feed. Feed messages
 * come from the network, so this Zod schema is used to validate every payload
 * before it is trusted/rendered.
 */
export const chatMessageSchema = z.object({
  /** Display name of the participant who sent the message. */
  sender: z.string().min(1),
  /** Author role of the message. */
  role: z.enum(CHAT_MESSAGE_ROLES),
  /** Message body. */
  content: z.string().min(1),
  /** Epoch milliseconds when the message was sent. */
  timestamp: z.number(),
})

export type ChatMessageRole = (typeof CHAT_MESSAGE_ROLES)[number]

export type AiChatMessage = z.infer<typeof chatMessageSchema>

/**
 * Validate an unknown value as an {@link AiChatMessage}. Returns the narrowed
 * message or `null` when the shape is invalid.
 */
export function parseChatMessage(value: unknown): AiChatMessage | null {
  const result = chatMessageSchema.safeParse(value)
  return result.success ? result.data : null
}
