"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EditorDialog } from "@/components/editor/editor-dialog"
import type { UseProjectActions } from "@/hooks/use-project-actions"

interface ProjectDialogsProps {
  actions: UseProjectActions
}

const CREATE_FORM_ID = "create-project-form"
const RENAME_FORM_ID = "rename-project-form"

export function ProjectDialogs({ actions }: ProjectDialogsProps) {
  const {
    activeDialog,
    targetProject,
    name,
    slug,
    isSubmitting,
    close,
    setName,
    submitCreate,
    submitRename,
    submitDelete,
  } = actions

  const handleOpenChange = (open: boolean) => {
    if (!open) close()
  }

  const submit =
    (run: () => void) => (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      run()
    }

  return (
    <>
      <EditorDialog
        open={activeDialog === "create"}
        onOpenChange={handleOpenChange}
        title="Create project"
        description="Name your architecture workspace. Its slug is generated automatically."
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={CREATE_FORM_ID}
              disabled={isSubmitting || name.trim().length === 0}
            >
              Create
            </Button>
          </>
        }
      >
        <form id={CREATE_FORM_ID} onSubmit={submit(submitCreate)} className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="create-project-name"
              className="text-sm font-medium text-copy-secondary"
            >
              Project name
            </label>
            <Input
              id="create-project-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Realtime Chat Backend"
            />
          </div>
          <p className="text-xs text-copy-muted">
            Room ID:{" "}
            <span className="font-mono text-copy-secondary">
              {slug || "your-project"}
              <span className="text-copy-muted">-…</span>
            </span>
          </p>
        </form>
      </EditorDialog>

      <EditorDialog
        open={activeDialog === "rename"}
        onOpenChange={handleOpenChange}
        title="Rename project"
        description={
          targetProject
            ? `Currently named “${targetProject.name}”.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={RENAME_FORM_ID}
              disabled={isSubmitting || name.trim().length === 0}
            >
              Save
            </Button>
          </>
        }
      >
        <form id={RENAME_FORM_ID} onSubmit={submit(submitRename)}>
          <div className="space-y-1.5">
            <label
              htmlFor="rename-project-name"
              className="text-sm font-medium text-copy-secondary"
            >
              Project name
            </label>
            <Input
              id="rename-project-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </form>
      </EditorDialog>

      <EditorDialog
        open={activeDialog === "delete"}
        onOpenChange={handleOpenChange}
        title="Delete project"
        description={
          targetProject
            ? `“${targetProject.name}” will be permanently deleted. This cannot be undone.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitDelete}
              disabled={isSubmitting}
            >
              Delete
            </Button>
          </>
        }
      />
    </>
  )
}
