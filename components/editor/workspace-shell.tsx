"use client"

import { useState } from "react"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import { CanvasRoom } from "@/components/editor/canvas-room"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { WorkspaceNavbar } from "@/components/editor/workspace-navbar"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"
import { useProjectActions } from "@/hooks/use-project-actions"
import type { Project } from "@/types/project"

interface WorkspaceProject {
  id: string
  name: string
}

interface WorkspaceShellProps {
  project: WorkspaceProject
  ownedProjects: Project[]
  sharedProjects: Project[]
  /** Whether the current user owns this project — gates the share controls. */
  isOwner: boolean
}

// Client shell for `/editor/[roomId]`: navbar + project sidebar + a canvas
// placeholder + the AI sidebar placeholder. No canvas or AI logic yet.
export function WorkspaceShell({
  project,
  ownedProjects,
  sharedProjects,
  isOwner,
}: WorkspaceShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  // The templates modal opens from the navbar but imports through the canvas'
  // collaborative state, so its open flag lives here and is threaded down into
  // `CanvasRoom` where the import handler has access to node/edge sync.
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  // Canvas autosave runs inside the Liveblocks room (in `CanvasRoom`), so its
  // status is lifted here to drive the navbar Save indicator.
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle")
  const actions = useProjectActions()

  return (
    <div className="flex h-screen flex-col">
      <WorkspaceNavbar
        projectName={project.name}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        isAiOpen={isAiOpen}
        onToggleAi={() => setIsAiOpen((open) => !open)}
        onShare={() => setIsShareOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        saveStatus={saveStatus}
      />

      <div className="relative flex-1 overflow-hidden bg-base">
        <CanvasRoom
          roomId={project.id}
          isTemplatesOpen={isTemplatesOpen}
          onTemplatesOpenChange={setIsTemplatesOpen}
          onSaveStatusChange={setSaveStatus}
        />

        {isSidebarOpen ? (
          <div
            className="absolute inset-0 z-30 bg-black/40 lg:hidden"
            aria-hidden
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
          activeProjectId={project.id}
          onCreateProject={actions.openCreate}
          onRenameProject={actions.openRename}
          onDeleteProject={actions.openDelete}
        />

        <AiSidebar isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
      </div>

      <ProjectDialogs actions={actions} />

      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        projectId={project.id}
        projectName={project.name}
        isOwner={isOwner}
      />
    </div>
  )
}
