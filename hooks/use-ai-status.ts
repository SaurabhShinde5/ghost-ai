"use client"

import { useFeedMessages } from "@liveblocks/react"
import { useMemo } from "react"

import {
  AI_STATUS_FEED_ID,
  parseAiStatusMessage,
  type AiStatusMessage,
} from "@/types/tasks"

export interface AiStatus {
  /** The most recent valid status message on the feed, or null when none. */
  message: AiStatusMessage | null
  /** Whether an AI generation is currently in progress. */
  isActive: boolean
}

// Phases that mean a generation is still running. `complete`/`error` are done.
const ACTIVE_PHASES: ReadonlySet<AiStatusMessage["phase"]> = new Set([
  "start",
  "processing",
])

// Subscribes to the shared AI status feed and derives the single most recent
// valid status message plus whether generation is active. Feed messages come
// from the network, so each one is validated with `parseAiStatusMessage` before
// being trusted; invalid payloads are ignored. Only the latest message (by its
// producer timestamp) is surfaced — never the full history.
export function useAiStatus(): AiStatus {
  const result = useFeedMessages(AI_STATUS_FEED_ID)
  const messages =
    result.isLoading || result.error ? undefined : result.messages

  return useMemo<AiStatus>(() => {
    if (!messages || messages.length === 0) {
      return { message: null, isActive: false }
    }

    let latest: AiStatusMessage | null = null
    for (const raw of messages) {
      const parsed = parseAiStatusMessage(raw.data)
      if (!parsed) continue
      if (!latest || parsed.at > latest.at) latest = parsed
    }

    return {
      message: latest,
      isActive: latest ? ACTIVE_PHASES.has(latest.phase) : false,
    }
  }, [messages])
}
