"use client"

import { useEffect, useRef, useState } from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

/** Lifecycle of a canvas autosave, surfaced to the editor's save indicator. */
export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error"

// How long the canvas must be quiet before a save fires. Batches rapid edits
// (dragging, typing labels, recoloring) into a single write.
const DEBOUNCE_MS = 1000

// Transient failures (a dropped/reset connection, a dev-server recompile, a
// browser extension intercepting `fetch` → "Failed to fetch") are retried before
// the save is reported as failed.
const MAX_ATTEMPTS = 3
const RETRY_BACKOFF_MS = 800

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

interface UseCanvasAutosaveOptions {
  /** Project ID — also the Liveblocks room ID and the canvas API path segment. */
  projectId: string
  /** Current canvas nodes from Liveblocks Storage. */
  nodes: CanvasNode[]
  /** Current canvas edges from Liveblocks Storage. */
  edges: CanvasEdge[]
}

// Strip volatile, view-only fields before persisting/comparing so transient
// interactions (selection, dragging, measured size) don't count as changes and
// trigger redundant saves.
function serializeCanvas(nodes: CanvasNode[], edges: CanvasEdge[]): string {
  const cleanNodes = nodes.map((node) => {
    const clean = { ...node }
    delete clean.selected
    delete clean.dragging
    delete clean.measured
    return clean
  })
  const cleanEdges = edges.map((edge) => {
    const clean = { ...edge }
    delete clean.selected
    return clean
  })
  return JSON.stringify({ nodes: cleanNodes, edges: cleanEdges })
}

/**
 * Debounced canvas autosave. Watches the canvas nodes and edges and persists
 * them through `PUT /api/projects/[projectId]/canvas` (which uploads to Vercel
 * Blob and stores the blob URL on the project record).
 *
 * The first render is treated as the baseline (the just-loaded state), so a save
 * only fires once the graph actually changes. Returns the current save status so
 * the editor can render a save indicator.
 */
export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
}: UseCanvasAutosaveOptions): CanvasSaveStatus {
  const [status, setStatus] = useState<CanvasSaveStatus>("idle")
  // The last content we've saved (or the baseline on first render), so we skip
  // writes when nothing meaningful changed.
  const lastSaved = useRef<string | null>(null)
  // ETag of the last snapshot we persisted, echoed back as `If-Match` so the
  // server can make each save conditional (optimistic concurrency). Null until
  // the first successful save, when the write is unconditional.
  const etagRef = useRef<string | null>(null)

  useEffect(() => {
    const serialized = serializeCanvas(nodes, edges)

    // Baseline the initial (loaded) state without saving it.
    if (lastSaved.current === null) {
      lastSaved.current = serialized
      return
    }

    if (serialized === lastSaved.current) {
      setStatus((current) => (current === "saving" ? "saved" : current))
      return
    }

    setStatus("saving")

    // A newer change (or unmount) supersedes this save. We don't abort an
    // in-flight request — aborting mid-flight both surfaces an AbortError in dev
    // and can starve the write when rapid edits keep cancelling it. Instead we
    // cancel the pending debounce and, once cancelled, ignore any in-flight
    // result; the newer change schedules the next save, so the latest canvas
    // state still converges to the blob.
    let cancelled = false

    const save = async () => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const response = await fetch(`/api/projects/${projectId}/canvas`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(etagRef.current ? { "If-Match": etagRef.current } : {}),
            },
            body: serialized,
          })

          if (cancelled) return

          // A conflict means another save advanced the blob past the version
          // this write was based on. Drop the stale ETag and retry
          // unconditionally so the current (shared, authoritative) canvas state
          // still persists.
          if (response.status === 409) {
            etagRef.current = null
            if (attempt < MAX_ATTEMPTS) continue
            setStatus("error")
            return
          }

          if (!response.ok) {
            throw new Error(`Canvas save failed: ${response.status}`)
          }

          const result = (await response.json().catch(() => null)) as {
            etag?: string
          } | null
          if (result && typeof result.etag === "string") {
            etagRef.current = result.etag
          }

          lastSaved.current = serialized
          setStatus("saved")
          return
        } catch {
          if (cancelled) return

          // Retry transient failures with a linear backoff; only the final
          // attempt surfaces the error to the indicator.
          if (attempt < MAX_ATTEMPTS) {
            await sleep(RETRY_BACKOFF_MS * attempt)
            if (cancelled) return
            continue
          }

          setStatus("error")
        }
      }
    }

    const timeout = window.setTimeout(() => {
      void save()
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [projectId, nodes, edges])

  return status
}
