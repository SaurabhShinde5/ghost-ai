"use client"

import { FolderOpen, Pencil, Plus, Trash2, Users, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Project } from "@/types/project"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  ownedProjects: Project[]
  sharedProjects: Project[]
  onCreateProject: () => void
  onRenameProject: (project: Project) => void
  onDeleteProject: (project: Project) => void
}

export function ProjectSidebar({
  isOpen,
  onClose,
  ownedProjects,
  sharedProjects,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  return (
    <aside
      data-state={isOpen ? "open" : "closed"}
      aria-hidden={!isOpen}
      className={cn(
        "absolute inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-surface-border bg-surface/95 backdrop-blur-sm transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "pointer-events-none -translate-x-full"
      )}
    >
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <h2 className="text-sm font-medium text-copy-primary">Projects</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close projects"
        >
          <X />
        </Button>
      </div>

      <Tabs
        defaultValue="my-projects"
        className="flex flex-1 flex-col gap-0 overflow-hidden px-4 py-3"
      >
        <TabsList className="w-full">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>

        <TabsContent value="my-projects" className="mt-4 min-h-0 flex-1">
          {ownedProjects.length > 0 ? (
            <ul className="space-y-1">
              {ownedProjects.map((project) => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  onRename={() => onRenameProject(project)}
                  onDelete={() => onDeleteProject(project)}
                />
              ))}
            </ul>
          ) : (
            <SidebarEmptyState
              icon={<FolderOpen className="h-8 w-8" />}
              title="No projects yet"
              description="Create your first project to get started."
            />
          )}
        </TabsContent>

        <TabsContent value="shared" className="mt-4 min-h-0 flex-1">
          {sharedProjects.length > 0 ? (
            <ul className="space-y-1">
              {sharedProjects.map((project) => (
                <ProjectItem key={project.id} project={project} />
              ))}
            </ul>
          ) : (
            <SidebarEmptyState
              icon={<Users className="h-8 w-8" />}
              title="Nothing shared yet"
              description="Projects shared with you will appear here."
            />
          )}
        </TabsContent>
      </Tabs>

      <div className="border-t border-surface-border p-3">
        <Button className="w-full" onClick={onCreateProject}>
          <Plus />
          New Project
        </Button>
      </div>
    </aside>
  )
}

interface ProjectItemProps {
  project: Project
  onRename?: () => void
  onDelete?: () => void
}

function ProjectItem({ project, onRename, onDelete }: ProjectItemProps) {
  return (
    <li className="group flex items-center gap-1 rounded-xl px-2.5 py-2 transition-colors hover:bg-elevated">
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left text-sm text-copy-secondary"
        title={project.name}
      >
        {project.name}
      </button>

      {onRename && onDelete ? (
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRename}
            aria-label={`Rename ${project.name}`}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDelete}
            aria-label={`Delete ${project.name}`}
          >
            <Trash2 />
          </Button>
        </div>
      ) : null}
    </li>
  )
}

interface SidebarEmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
}

function SidebarEmptyState({ icon, title, description }: SidebarEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-surface-border px-4 py-10 text-center">
      <span className="text-copy-faint">{icon}</span>
      <p className="text-sm font-medium text-copy-secondary">{title}</p>
      <p className="text-xs text-copy-muted">{description}</p>
    </div>
  )
}
