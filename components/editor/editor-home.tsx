"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface EditorHomeProps {
  onNewProject: () => void
}

export function EditorHome({ onNewProject }: EditorHomeProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="max-w-md text-sm text-copy-muted">
          Start a new architecture workspace, or choose a project from the
          sidebar.
        </p>
      </div>

      <Button onClick={onNewProject}>
        <Plus />
        New Project
      </Button>
    </div>
  )
}
