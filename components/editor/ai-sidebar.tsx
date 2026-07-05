"use client"

import { useRef, useState } from "react"
import { Bot, Download, FileText, Send, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const idRef = useRef(0)

  const nextId = () => {
    idRef.current += 1
    return `msg-${Date.now()}-${idRef.current}`
  }

  const send = () => {
    const content = draft.trim()
    if (!content) return
    // UI-only: append the user's message plus a static placeholder reply so both
    // bubble styles render. No AI generation happens here yet.
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", content },
      {
        id: nextId(),
        role: "assistant",
        content:
          "Ghost AI isn't connected yet — architecture generation is coming soon.",
      },
    ])
    setDraft("")
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
      send()
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
                Describe the system you want to build
              </p>
              <p className="text-xs text-copy-muted">
                Ghost AI will map it onto your canvas.
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
            {messages.map((message) =>
              message.role === "user" ? (
                <div
                  key={message.id}
                  className="max-w-[85%] self-end rounded-2xl border-2 border-brand/50 bg-accent-dim px-3 py-2 text-sm text-copy-primary"
                >
                  {message.content}
                </div>
              ) : (
                <div
                  key={message.id}
                  className="max-w-[85%] self-start rounded-2xl border border-surface-border bg-elevated px-3 py-2 text-sm text-ai-text"
                >
                  {message.content}
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="border-t border-surface-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a system to architect…"
            className="max-h-40 min-h-[72px] resize-none"
          />
          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={!draft.trim()}
            aria-label="Send message"
            className="h-[72px] bg-ai text-white hover:bg-ai/90"
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  )
}

function SpecsTab() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <Button
        type="button"
        className="w-full bg-ai text-white hover:bg-ai/90"
      >
        <FileText />
        Generate Spec
      </Button>

      <div className="rounded-2xl border border-surface-border bg-elevated p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate text-sm font-medium text-copy-primary">
              System Architecture Spec
            </h3>
            <p className="text-xs leading-relaxed text-copy-muted">
              A generated technical specification will appear here — services,
              data flow, and infrastructure notes derived from your canvas.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            aria-label="Download spec"
          >
            <Download />
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}
