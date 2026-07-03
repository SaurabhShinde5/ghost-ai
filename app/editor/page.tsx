"use client"

import { useState } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { EditorHome } from "@/components/editor/editor-home"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"
import { isOwnedProject } from "@/types/project"
import { MOCK_PROJECTS } from "@/lib/mock-projects"

const ownedProjects = MOCK_PROJECTS.filter(isOwnedProject)
const sharedProjects = MOCK_PROJECTS.filter(
  (project) => !isOwnedProject(project)
)

export default function EditorPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const dialogs = useProjectDialogs()

  return (
    <div className="flex h-screen flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />

      <div className="relative flex-1 overflow-hidden bg-base">
        <EditorHome onNewProject={dialogs.openCreate} />

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
          onCreateProject={dialogs.openCreate}
          onRenameProject={dialogs.openRename}
          onDeleteProject={dialogs.openDelete}
        />
      </div>

      <ProjectDialogs dialogs={dialogs} />
    </div>
  )
}
