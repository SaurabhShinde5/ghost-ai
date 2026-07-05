"use client"

import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
  useSelf,
} from "@liveblocks/react"
import { useCallback, useMemo, useRef } from "react"

import {
  AI_CHAT_FEED_ID,
  AI_PRESENCE_NAME,
  parseChatMessage,
  type AiChatMessage,
  type ChatMessageRole,
} from "@/types/tasks"

/** A validated chat message paired with its feed message id (for React keys). */
export interface AiChatFeedMessage extends AiChatMessage {
  /** Liveblocks feed message id — stable, used as the render key. */
  id: string
  /** Whether the message was sent by the current participant. */
  isOwn: boolean
}

export interface UseAiChat {
  /** Validated messages ordered oldest → newest. */
  messages: AiChatFeedMessage[]
  /** True while the feed is loading for the first time. */
  isLoading: boolean
  /**
   * Send `content` to the shared chat feed. Defaults to a `user` message from
   * the current participant; pass `{ role: "assistant" }` to post an AI reply
   * (sent as "Ghost AI"). Used for the design agent's final/error messages.
   */
  sendMessage: (
    content: string,
    options?: { role?: ChatMessageRole },
  ) => Promise<void>
}

// Subscribes to the shared room chat feed (`ai-chat`) and exposes a validated,
// time-ordered message list plus a `sendMessage` helper. This feed is kept
// entirely separate from the AI status feed — it carries human chat only.
//
// Every feed message is validated with `parseChatMessage` before being surfaced
// (feed payloads are network data), and invalid payloads are ignored rather than
// rendered.
export function useAiChat(): UseAiChat {
  const result = useFeedMessages(AI_CHAT_FEED_ID)
  const createFeed = useCreateFeed()
  const createFeedMessage = useCreateFeedMessage()
  const self = useSelf()

  // The current participant's display name, used as the message sender and to
  // flag own messages for alignment.
  const senderName = self?.info?.name?.trim() || "Anonymous"

  // Only attempt to create the feed once per mount; subsequent sends assume it
  // exists (creating an existing feed throws, which we swallow).
  const feedEnsured = useRef(false)

  const feedMessages =
    result.isLoading || result.error ? undefined : result.messages

  const messages = useMemo<AiChatFeedMessage[]>(() => {
    if (!feedMessages || feedMessages.length === 0) return []

    const parsed: AiChatFeedMessage[] = []
    for (const raw of feedMessages) {
      const message = parseChatMessage(raw.data)
      if (!message) continue
      parsed.push({
        ...message,
        id: raw.id,
        isOwn: message.role === "user" && message.sender === senderName,
      })
    }

    parsed.sort((a, b) => a.timestamp - b.timestamp)
    return parsed
  }, [feedMessages, senderName])

  const sendMessage = useCallback(
    async (content: string, options?: { role?: ChatMessageRole }) => {
      const trimmed = content.trim()
      if (!trimmed) return

      const role = options?.role ?? "user"
      // AI replies are attributed to Ghost AI; human messages use the sender's
      // resolved display name.
      const sender = role === "assistant" ? AI_PRESENCE_NAME : senderName

      const message: AiChatMessage = {
        sender,
        role,
        content: trimmed,
        timestamp: Date.now(),
      }

      // Validate before sending so we never publish a malformed payload.
      const valid = parseChatMessage(message)
      if (!valid) throw new Error("Invalid chat message")

      // Ensure the feed exists before posting. Creating an already-existing feed
      // throws, so the error is swallowed (idempotent), matching the pattern the
      // design-agent task uses server-side.
      if (!feedEnsured.current) {
        try {
          await createFeed(AI_CHAT_FEED_ID)
        } catch {
          // Feed already exists.
        }
        feedEnsured.current = true
      }

      await createFeedMessage(
        AI_CHAT_FEED_ID,
        // AiChatMessage is structurally JSON but lacks the index signature the
        // SDK's JsonObject type requires.
        valid as unknown as Parameters<typeof createFeedMessage>[1]
      )
    },
    [createFeed, createFeedMessage, senderName]
  )

  return { messages, isLoading: result.isLoading, sendMessage }
}
