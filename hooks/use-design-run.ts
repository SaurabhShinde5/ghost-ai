"use client"

import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { useCallback, useEffect, useState } from "react"

import type { designAgent } from "@/trigger/design-agent"

export interface UseDesignRun {
  /** True while a design run is being triggered or is executing. */
  isRunning: boolean
  /**
   * Trigger a design generation run for `prompt`. Resolves once the run has
   * been kicked off (or, on failure, after reporting the error). Never throws —
   * failures are surfaced through the `onError` callback.
   */
  start: (prompt: string) => Promise<void>
}

interface UseDesignRunOptions {
  /** Liveblocks room id (which is also the project id). */
  roomId: string
  /**
   * Called once when the run completes successfully, with a short summary
   * message to post to the chat feed.
   */
  onComplete: (message: string) => void
  /** Called with a user-facing message when triggering or the run fails. */
  onError: (message: string) => void
}

const JSON_HEADERS = { "Content-Type": "application/json" } as const

// Drives a single AI design generation run from the sidebar: it triggers the
// run via `POST /api/ai/design`, mints a run-scoped read token via
// `POST /api/ai/design/token`, then subscribes to the run in realtime with
// `useRealtimeRun`. Canvas updates are NOT applied here — they flow into the
// shared Liveblocks room from the background task and render automatically.
export function useDesignRun({
  roomId,
  onComplete,
  onError,
}: UseDesignRunOptions): UseDesignRun {
  const [runId, setRunId] = useState<string>()
  const [publicToken, setPublicToken] = useState<string>()
  const [isTriggering, setIsTriggering] = useState(false)

  // `useRealtimeRun` manages its SSE subscription with an AbortController and
  // tears it down (on unmount, on stop-after-completion, and on transient
  // reconnects). That teardown can escape as an unhandled "signal is aborted
  // without reason" AbortError — expected and harmless, but Next.js's dev error
  // overlay reports every unhandled rejection (its listener ignores
  // `preventDefault`). We intercept in the capture phase and stop propagation
  // for that one benign abort so the overlay never sees it, while leaving all
  // other rejections untouched.
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

  useRealtimeRun<typeof designAgent>(runId, {
    accessToken: publicToken,
    enabled: Boolean(runId && publicToken),
    onComplete: (completedRun, err) => {
      setRunId(undefined)
      setPublicToken(undefined)

      if (err || completedRun.status !== "COMPLETED") {
        onError("Ghost AI couldn't finish generating your design. Please try again.")
        return
      }

      const output = completedRun.output
      onComplete(
        output
          ? `Added ${output.nodeCount} ${output.nodeCount === 1 ? "node" : "nodes"} and ${output.edgeCount} ${output.edgeCount === 1 ? "connection" : "connections"} to the canvas.`
          : "Your design is ready on the canvas.",
      )
    },
  })

  // A run is active from the moment we start triggering until the realtime
  // subscription reports completion (which clears `runId`).
  const isRunning = isTriggering || Boolean(runId)

  const start = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim()
      if (!trimmed || isRunning) return

      setIsTriggering(true)
      try {
        const designResponse = await fetch("/api/ai/design", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ prompt: trimmed, roomId, projectId: roomId }),
        })
        if (!designResponse.ok) throw new Error("Failed to start design run")

        const { runId: newRunId } = (await designResponse.json()) as {
          runId?: string
        }
        if (!newRunId) throw new Error("No runId returned")

        const tokenResponse = await fetch("/api/ai/design/token", {
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
        onError("Ghost AI couldn't start generating your design. Please try again.")
      } finally {
        setIsTriggering(false)
      }
    },
    [isRunning, roomId, onError],
  )

  return { isRunning, start }
}
