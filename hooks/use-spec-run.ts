"use client"

import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { useCallback, useEffect, useState } from "react"

import type { generateSpec } from "@/trigger/generate-spec"

/** A design-conversation message forwarded to the spec task for context. */
export interface SpecChatContext {
  role?: string
  sender?: string
  content: string
}

export interface UseSpecRun {
  /** True while a spec run is being triggered or is executing. */
  isRunning: boolean
  /**
   * Trigger a spec generation run. Resolves once the run has been kicked off
   * (or, on failure, after reporting the error). Never throws — failures go
   * through the `onError` callback.
   */
  start: (chatHistory?: SpecChatContext[]) => Promise<void>
}

interface UseSpecRunOptions {
  /** Liveblocks room id (which is also the project id). */
  roomId: string
  /** Called once when the run completes successfully. */
  onComplete: () => void
  /** Called with a user-facing message when triggering or the run fails. */
  onError: (message: string) => void
}

const JSON_HEADERS = { "Content-Type": "application/json" } as const

// Drives a single spec generation run from the Specs tab: it triggers the run
// via `POST /api/ai/spec`, mints a run-scoped read token via
// `POST /api/ai/spec/token`, then subscribes to the run in realtime with
// `useRealtimeRun`. The canvas graph is read server-side by the task, so only
// the (optional) chat history is sent from the client.
export function useSpecRun({
  roomId,
  onComplete,
  onError,
}: UseSpecRunOptions): UseSpecRun {
  const [runId, setRunId] = useState<string>()
  const [publicToken, setPublicToken] = useState<string>()
  const [isTriggering, setIsTriggering] = useState(false)

  // `useRealtimeRun` tears down its SSE subscription with an AbortController,
  // which can surface a benign "signal is aborted without reason" AbortError as
  // an unhandled rejection. Next.js's dev overlay reports every unhandled
  // rejection, so intercept that one benign abort in the capture phase (same
  // approach as `use-design-run`).
  useEffect(() => {
    const suppressBenignAbort = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { name?: string } | undefined
      if (reason?.name === "AbortError") {
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    }

    window.addEventListener("unhandledrejection", suppressBenignAbort, {
      capture: true,
    })
    return () =>
      window.removeEventListener("unhandledrejection", suppressBenignAbort, {
        capture: true,
      })
  }, [])

  useRealtimeRun<typeof generateSpec>(runId, {
    accessToken: publicToken,
    enabled: Boolean(runId && publicToken),
    onComplete: (completedRun, err) => {
      setRunId(undefined)
      setPublicToken(undefined)

      if (err || completedRun.status !== "COMPLETED") {
        onError(
          "Ghost AI couldn't generate the specification. Please try again.",
        )
        return
      }

      onComplete()
    },
  })

  // A run is active from the moment we start triggering until the realtime
  // subscription reports completion (which clears `runId`).
  const isRunning = isTriggering || Boolean(runId)

  const start = useCallback(
    async (chatHistory: SpecChatContext[] = []) => {
      if (isRunning) return

      setIsTriggering(true)
      try {
        const specResponse = await fetch("/api/ai/spec", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ roomId, chatHistory }),
        })
        if (!specResponse.ok) throw new Error("Failed to start spec run")

        const { runId: newRunId } = (await specResponse.json()) as {
          runId?: string
        }
        if (!newRunId) throw new Error("No runId returned")

        const tokenResponse = await fetch("/api/ai/spec/token", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ runId: newRunId }),
        })
        if (!tokenResponse.ok) throw new Error("Failed to mint run token")

        const { token } = (await tokenResponse.json()) as { token?: string }
        if (!token) throw new Error("No token returned")

        setRunId(newRunId)
        setPublicToken(token)
      } catch {
        onError(
          "Ghost AI couldn't start generating the specification. Please try again.",
        )
      } finally {
        setIsTriggering(false)
      }
    },
    [isRunning, roomId, onError],
  )

  return { isRunning, start }
}
