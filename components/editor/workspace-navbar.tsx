"use client"

import {
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

interface WorkspaceNavbarProps {
  projectName: string
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  isAiOpen: boolean
  onToggleAi: () => void
  onShare: () => void
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

        <UserButton />
      </div>
    </header>
  )
}
