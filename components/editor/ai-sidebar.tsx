"use client"

import { useState } from "react"
import {
  Bot,
  Check,
  CircleAlert,
  Download,
  FileText,
  Loader2,
  Send,
  X,
} from "lucide-react"

import { useRoom } from "@liveblocks/react"

import { cn } from "@/lib/utils"
import { useAiStatus } from "@/hooks/use-ai-status"
import { useAiChat, type AiChatFeedMessage } from "@/hooks/use-ai-chat"
import { useDesignRun } from "@/hooks/use-design-run"
import {
  downloadSpec,
  useProjectSpecs,
  type ProjectSpecSummary,
} from "@/hooks/use-project-specs"
import { useSpecRun } from "@/hooks/use-spec-run"
import type { AiStatusMessage } from "@/types/tasks"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SpecPreviewModal } from "@/components/editor/spec-preview-modal"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

// Floating AI chat sidebar. UI-only for now: no backend, no AI generation, and
// no Liveblocks wiring. Open/close is controlled by the parent workspace shell,
// which preserves the existing slide-in-from-the-right behavior.
export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  return (
    <aside
      data-state={isOpen ? "open" : "closed"}
      aria-hidden={!isOpen}
      className={cn(
        "absolute inset-y-0 right-0 z-40 flex w-96 flex-col border-l border-surface-border bg-base/95 shadow-2xl shadow-black/40 backdrop-blur-sm transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
      )}
    >
      <SidebarHeader onClose={onClose} />

      <Tabs
        defaultValue="architect"
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="px-4 pt-3">
          <TabsList className="w-full bg-elevated">
            <TabsTrigger
              value="architect"
              className="flex-1 text-copy-muted! data-active:bg-ai! data-active:text-ai-text!"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="flex-1 text-copy-muted! data-active:bg-ai! data-active:text-ai-text!"
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="architect"
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <ArchitectTab />
        </TabsContent>

        <TabsContent
          value="specs"
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <SpecsTab />
        </TabsContent>
      </Tabs>
    </aside>
  )
}

function SidebarHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-surface-border px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
        <Bot className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-copy-primary">
          AI Workspace
        </h2>
        <p className="truncate text-xs text-copy-muted">
          Collaborate with Ghost AI
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Close AI workspace"
      >
        <X />
      </Button>
    </div>
  )
}

function ArchitectTab() {
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  // The Liveblocks room id is the project id; used to trigger generation.
  const room = useRoom()
  // Collaborative room chat, read from the `ai-chat` feed. Kept entirely
  // separate from the AI status feed below.
  const { messages, sendMessage } = useAiChat()
  // Shared AI activity, read from the `ai-status-feed`. Visible to everyone in
  // the room, so any participant sees when generation is in progress.
  const { message: status, isActive } = useAiStatus()
  // Drives the design generation run (trigger → token → realtime subscribe).
  // Canvas updates are applied by the background task and reflected through
  // Liveblocks automatically, so nothing is synced here.
  const designRun = useDesignRun({
    roomId: room.id,
    onComplete: (message) => {
      void sendMessage(message, { role: "assistant" })
    },
    onError: (message) => {
      // Surface generation failures as an AI message in the shared chat feed.
      void sendMessage(message, { role: "assistant" })
    },
  })

  // Submit is busy while the chat message is in flight or a run is active.
  const isBusy = isSending || designRun.isRunning

  const send = async () => {
    const content = draft.trim()
    if (!content || isBusy) return

    setIsSending(true)
    setSendError(null)
    try {
      // Post the prompt to the shared chat feed, then kick off generation.
      await sendMessage(content)
      setDraft("")
      await designRun.start(content)
    } catch {
      setSendError("Couldn’t send your message. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ignore Enter while an IME composition is active so confirming a candidate
    // (e.g. Japanese/Chinese/Korean input) doesn't send unfinished text.
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      void send()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ai/15 text-ai-text">
              <Bot className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-copy-primary">
                Describe a system to design
              </p>
              <p className="text-xs text-copy-muted">
                Ghost AI builds it on the canvas — shared live with everyone in
                this room.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setDraft(prompt)}
                  className="rounded-full bg-subtle px-3 py-1.5 text-xs text-ai-text transition-colors hover:bg-subtle/70"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      {/* Only shown while a run is active (this client's run or any room run). */}
      {status && (isActive || designRun.isRunning) ? (
        <AiStatusIndicator status={status} isActive={isActive} />
      ) : null}

      {sendError ? (
        <div
          className="flex items-center gap-2 border-t border-surface-border px-4 py-2 text-xs text-error"
          role="alert"
        >
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{sendError}</span>
        </div>
      ) : null}

      <div className="border-t border-surface-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              designRun.isRunning
                ? "Ghost AI is working…"
                : "Describe a system to design…"
            }
            disabled={isBusy}
            className="max-h-40 min-h-[72px] resize-none disabled:opacity-60"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void send()}
            disabled={isBusy || !draft.trim()}
            aria-label="Send message"
            aria-busy={isBusy}
            className="h-[72px] bg-ai text-white hover:bg-ai/90"
          >
            {isBusy ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>
    </div>
  )
}

// A single chat message: sender + timestamp header over the message bubble.
// Own messages align right with the brand tint; others align left. The
// `assistant` role (reserved for future AI replies) uses the AI tint.
function ChatBubble({ message }: { message: AiChatFeedMessage }) {
  return (
    <div
      className={cn(
        "flex max-w-[85%] flex-col gap-1",
        message.isOwn ? "items-end self-end" : "items-start self-start"
      )}
    >
      <div className="flex items-center gap-1.5 px-1 text-[11px] text-copy-muted">
        <span className="font-medium text-copy-secondary">
          {message.isOwn ? "You" : message.sender}
        </span>
        <span aria-hidden>·</span>
        <time dateTime={new Date(message.timestamp).toISOString()}>
          {formatTime(message.timestamp)}
        </time>
      </div>
      <div
        className={cn(
          "rounded-2xl px-3 py-2 text-sm",
          message.isOwn
            ? "border-2 border-brand/50 bg-accent-dim text-copy-primary"
            : message.role === "assistant"
              ? "border border-surface-border bg-elevated text-ai-text"
              : "border border-surface-border bg-elevated text-copy-primary"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Compact strip that surfaces the most recent shared AI status message. Because
// it reads the room-wide feed, everyone in the room sees the same activity.
function AiStatusIndicator({
  status,
  isActive,
}: {
  status: AiStatusMessage
  isActive: boolean
}) {
  const Icon =
    status.phase === "error"
      ? CircleAlert
      : status.phase === "complete"
        ? Check
        : Loader2

  const text = status.text ?? DEFAULT_STATUS_TEXT[status.phase]

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-surface-border px-4 py-2 text-xs",
        status.phase === "error" ? "text-error" : "text-ai-text"
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive && "animate-spin")} />
      <span className="truncate">{text}</span>
    </div>
  )
}

const DEFAULT_STATUS_TEXT: Record<AiStatusMessage["phase"], string> = {
  start: "Ghost AI is starting…",
  processing: "Ghost AI is working…",
  complete: "Ghost AI finished.",
  error: "Ghost AI ran into a problem.",
}

function SpecsTab() {
  // The Liveblocks room id is the project id.
  const room = useRoom()
  const projectId = room.id
  const { specs, isLoading, error, refetch } = useProjectSpecs(projectId)
  // The design conversation, forwarded to the spec task as extra context.
  const { messages } = useAiChat()
  // The spec being previewed, or null when the modal is closed. Only metadata
  // is held here — content is fetched on demand inside the modal.
  const [selected, setSelected] = useState<ProjectSpecSummary | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  // Drives the spec generation run (trigger → token → realtime subscribe). The
  // canvas graph is read server-side by the task; when the run completes the
  // list is refetched so the new spec appears.
  const specRun = useSpecRun({
    roomId: projectId,
    onComplete: () => {
      setRunError(null)
      refetch()
    },
    onError: (message) => setRunError(message),
  })

  const generate = () => {
    setRunError(null)
    void specRun.start(
      messages.map((message) => ({
        role: message.role,
        sender: message.sender,
        content: message.content,
      })),
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <Button
        type="button"
        onClick={generate}
        disabled={specRun.isRunning}
        aria-busy={specRun.isRunning}
        className="w-full bg-ai text-white hover:bg-ai/90"
      >
        {specRun.isRunning ? (
          <>
            <Loader2 className="animate-spin" />
            Generating spec…
          </>
        ) : (
          <>
            <FileText />
            Generate Spec
          </>
        )}
      </Button>

      {runError ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-xs text-error"
          role="alert"
        >
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          <span>{runError}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div
          className="flex items-center gap-2 py-6 text-sm text-copy-muted"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>Loading specs…</span>
        </div>
      ) : error ? (
        <div
          className="flex items-center gap-2 py-6 text-sm text-error"
          role="alert"
        >
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : specs.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-elevated p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="truncate text-sm font-medium text-copy-primary">
                No specs yet
              </h3>
              <p className="text-xs leading-relaxed text-copy-muted">
                Generated technical specifications will appear here — services,
                data flow, and infrastructure notes derived from your canvas.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {specs.map((spec) => (
            <li key={spec.id}>
              <SpecListItem
                spec={spec}
                projectId={projectId}
                onOpen={() => setSelected(spec)}
              />
            </li>
          ))}
        </ul>
      )}

      <SpecPreviewModal
        projectId={projectId}
        spec={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

// A single spec in the list: clickable to preview, with an inline download
// action. Kept compact per the sidebar layout.
function SpecListItem({
  spec,
  projectId,
  onOpen,
}: {
  spec: ProjectSpecSummary
  projectId: string
  onOpen: () => void
}) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-surface-border bg-elevated p-3 transition-colors hover:border-surface-border/80 hover:bg-subtle">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
          <FileText className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="block truncate text-sm font-medium text-copy-primary">
            {spec.filename}
          </span>
          <span className="block truncate text-xs text-copy-muted">
            {formatDate(spec.createdAt)}
          </span>
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => downloadSpec(projectId, spec.id, spec.filename)}
        aria-label={`Download ${spec.filename}`}
      >
        <Download />
      </Button>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
