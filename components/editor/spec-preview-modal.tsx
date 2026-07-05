"use client"

import { useEffect, useState } from "react"
import { CircleAlert, Download, Loader2 } from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"

import {
  downloadSpec,
  specDownloadUrl,
  type ProjectSpecSummary,
} from "@/hooks/use-project-specs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SpecPreviewModalProps {
  projectId: string
  /** The spec to preview, or `null` when the modal is closed. */
  spec: ProjectSpecSummary | null
  onClose: () => void
}

// Preview a generated spec as rendered Markdown. Content is fetched on open
// through the existing download endpoint (the private blob URL is never touched
// from the client) and is dropped from state as soon as the modal closes, so no
// spec content lingers in long-term frontend state.
export function SpecPreviewModal({
  projectId,
  spec,
  onClose,
}: SpecPreviewModalProps) {
  const [content, setContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const specId = spec?.id

  useEffect(() => {
    // No spec selected (modal closed) — nothing to fetch. The cleanup below
    // releases any previously fetched content so it never lingers in state.
    if (!specId) return

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(specDownloadUrl(projectId, specId))
        if (!response.ok) throw new Error("Failed to load spec content")

        const markdown = await response.text()
        if (cancelled) return
        setContent(markdown)
      } catch {
        if (cancelled) return
        setError("Couldn’t load this spec. Please try again.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      // Drop the fetched content when the spec changes or the modal closes.
      setContent(null)
      setError(null)
    }
  }, [projectId, specId])

  return (
    <Dialog
      open={spec !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 rounded-3xl bg-surface p-0 sm:max-w-2xl">
        <DialogHeader className="flex-row items-start gap-3 border-b border-surface-border p-4 pr-12">
          <div className="min-w-0 flex-1 space-y-1">
            <DialogTitle className="truncate text-sm text-copy-primary">
              {spec?.filename ?? "Spec"}
            </DialogTitle>
            {spec ? (
              <p className="text-xs text-copy-muted">
                Generated {formatDate(spec.createdAt)}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              spec && downloadSpec(projectId, spec.id, spec.filename)
            }
            disabled={!spec}
            aria-label="Download spec"
          >
            <Download />
            Download
          </Button>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            {isLoading ? (
              <div
                className="flex items-center gap-2 py-8 text-sm text-copy-muted"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span>Loading spec…</span>
              </div>
            ) : error ? (
              <div
                className="flex items-center gap-2 py-8 text-sm text-error"
                role="alert"
              >
                <CircleAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : content ? (
              <div className="space-y-3 text-sm text-copy-secondary">
                <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="py-8 text-sm text-copy-muted">
                This spec is empty.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

// Map Markdown elements onto the workspace's tokens (no Tailwind typography
// plugin in the project). Kept minimal — headings, text, lists, code, quotes.
const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="text-[15px] font-semibold text-copy-primary">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="pt-2 text-sm font-semibold text-copy-primary">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="pt-1 text-sm font-medium text-copy-primary">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="leading-relaxed text-copy-secondary">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-5 text-copy-secondary">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5 text-copy-secondary">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-copy-primary">{children}</strong>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-subtle px-1 py-0.5 font-mono text-xs text-copy-primary">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-xl border border-surface-border bg-elevated p-3 font-mono text-xs text-copy-secondary">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-surface-border pl-3 text-copy-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-surface-border" />,
}
