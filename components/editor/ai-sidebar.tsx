"use client"

import { Sparkles, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Right-side slide-over placeholder for the future AI chat panel. No chat logic
// yet — the workspace shell only needs the surface to toggle into place.
export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  return (
    <aside
      data-state={isOpen ? "open" : "closed"}
      aria-hidden={!isOpen}
      className={cn(
        "absolute inset-y-0 right-0 z-40 flex w-80 flex-col border-l border-surface-border bg-surface/95 backdrop-blur-sm transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
      )}
    >
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-copy-primary">
          <Sparkles className="h-4 w-4 text-ai" />
          AI Assistant
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI assistant"
        >
          <X />
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium text-copy-secondary">
          AI chat coming soon
        </p>
        <p className="text-xs text-copy-muted">
          Describe a system and the AI will map it onto the canvas.
        </p>
      </div>
    </aside>
  )
}
