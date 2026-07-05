"use client"

import {
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
} from "lucide-react"

import { SaveStatus } from "@/components/editor/save-status"
import { Button } from "@/components/ui/button"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"

interface WorkspaceNavbarProps {
  projectName: string
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  isAiOpen: boolean
  onToggleAi: () => void
  onShare: () => void
  onOpenTemplates: () => void
  /** Current canvas autosave status, shown as the Save button. */
  saveStatus: CanvasSaveStatus
}

// Top bar for the `/editor/[roomId]` workspace: project sidebar toggle + project
// name on the left, share + AI toggle actions on the right.
export function WorkspaceNavbar({
  projectName,
  isSidebarOpen,
  onToggleSidebar,
  isAiOpen,
  onToggleAi,
  onShare,
  onOpenTemplates,
  saveStatus,
}: WorkspaceNavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-surface-border bg-surface px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>

        <h1
          className="min-w-0 truncate text-sm font-medium text-copy-primary"
          title={projectName}
        >
          {projectName}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <SaveStatus status={saveStatus} />

        <Button variant="outline" size="sm" onClick={onOpenTemplates}>
          <LayoutTemplate />
          Templates
        </Button>

        <Button variant="outline" size="sm" onClick={onShare}>
          <Share2 />
          Share
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAi}
          aria-label={isAiOpen ? "Close AI assistant" : "Open AI assistant"}
          aria-pressed={isAiOpen}
        >
          <Sparkles />
        </Button>
      </div>
    </header>
  )
}
