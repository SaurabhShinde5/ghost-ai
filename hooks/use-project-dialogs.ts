"use client"

import { useCallback, useState } from "react"

import { slugify } from "@/lib/slug"
import type { Project } from "@/types/project"

export type ProjectDialog = "create" | "rename" | "delete"

export interface UseProjectDialogs {
  /** Which dialog is currently open, or `null` when all are closed. */
  activeDialog: ProjectDialog | null
  /** Project targeted by the rename/delete dialogs. */
  targetProject: Project | null
  /** Name input value for the create/rename forms. */
  name: string
  /** Live slug preview derived from `name`. */
  slug: string
  /** True while a submit is in flight. */
  isSubmitting: boolean
  openCreate: () => void
  openRename: (project: Project) => void
  openDelete: (project: Project) => void
  close: () => void
  setName: (name: string) => void
  submitCreate: () => void
  submitRename: () => void
  submitDelete: () => void
}

/**
 * Owns dialog, form, and loading state for the project create/rename/delete
 * flows. Submits are mocked — no API calls or persistence yet — but the loading
 * state is wired so real async work can drop in later.
 */
export function useProjectDialogs(): UseProjectDialogs {
  const [activeDialog, setActiveDialog] = useState<ProjectDialog | null>(null)
  const [targetProject, setTargetProject] = useState<Project | null>(null)
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const close = useCallback(() => {
    setActiveDialog(null)
    setTargetProject(null)
    setName("")
    setIsSubmitting(false)
  }, [])

  const openCreate = useCallback(() => {
    setTargetProject(null)
    setName("")
    setActiveDialog("create")
  }, [])

  const openRename = useCallback((project: Project) => {
    setTargetProject(project)
    setName(project.name)
    setActiveDialog("rename")
  }, [])

  const openDelete = useCallback((project: Project) => {
    setTargetProject(project)
    setName("")
    setActiveDialog("delete")
  }, [])

  // Mock submit: no persistence yet. Toggles loading state and closes so the
  // wiring matches the eventual API-backed flow.
  const runSubmit = useCallback(() => {
    setIsSubmitting(true)
    close()
  }, [close])

  return {
    activeDialog,
    targetProject,
    name,
    slug: slugify(name),
    isSubmitting,
    openCreate,
    openRename,
    openDelete,
    close,
    setName,
    submitCreate: runSubmit,
    submitRename: runSubmit,
    submitDelete: runSubmit,
  }
}
