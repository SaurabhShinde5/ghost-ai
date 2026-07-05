"use client"

import { useCallback, useEffect, useState } from "react"

/** A generated spec, metadata only. Content is fetched separately on demand. */
export interface ProjectSpecSummary {
  id: string
  filename: string
  /** ISO-8601 creation timestamp. */
  createdAt: string
}

export interface UseProjectSpecs {
  specs: ProjectSpecSummary[]
  isLoading: boolean
  error: string | null
  /** Re-fetch the spec list for the current project. */
  refetch: () => void
}

// Fetches the list of generated specs for a project from
// `GET /api/projects/[projectId]/specs`. Metadata only — spec content is never
// held here (it's fetched on demand when a spec is previewed). Follows the
// app's plain-`fetch` data pattern.
export function useProjectSpecs(projectId: string): UseProjectSpecs {
  const [specs, setSpecs] = useState<ProjectSpecSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped by `refetch` to re-run the effect.
  const [nonce, setNonce] = useState(0)

  const refetch = useCallback(() => setNonce((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/projects/${projectId}/specs`)
        if (!response.ok) throw new Error("Failed to load specs")

        const data = (await response.json()) as {
          specs?: ProjectSpecSummary[]
        }
        if (cancelled) return
        setSpecs(data.specs ?? [])
      } catch {
        if (cancelled) return
        setError("Couldn’t load specs. Please try again.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [projectId, nonce])

  return { specs, isLoading, error, refetch }
}

/** URL of the download endpoint for a spec (returns Markdown, attachment). */
export function specDownloadUrl(projectId: string, specId: string): string {
  return `/api/projects/${projectId}/specs/${specId}/download`
}

// Trigger a file download for a spec. The download route responds with
// `Content-Disposition: attachment`, so navigating a hidden same-origin anchor
// (Clerk session cookies included) lets the browser handle the download without
// ever exposing the private blob URL to the client.
export function downloadSpec(
  projectId: string,
  specId: string,
  filename: string,
): void {
  const anchor = document.createElement("a")
  anchor.href = specDownloadUrl(projectId, specId)
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
