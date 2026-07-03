"use client"

import { useCallback, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { slugify } from "@/lib/slug"
import type { Project } from "@/types/project"

export type ProjectDialog = "create" | "rename" | "delete"

export interface UseProjectActions {
  /** Which dialog is currently open, or `null` when all are closed. */
  activeDialog: ProjectDialog | null
  /** Project targeted by the rename/delete dialogs. */
  targetProject: Project | null
  /** Name input value for the create/rename forms. */
  name: string
  /** Live slug preview derived from `name` — also the room ID prefix. */
  slug: string
  /** Stable unique suffix appended to `slug` to form the room ID. */
  suffix: string
  /** True while a mutation request is in flight. */
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

/** Short, URL-safe suffix used to keep generated room IDs unique. */
function generateSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

/**
 * Owns dialog state and the project create/rename/delete mutations for the
 * editor home. Mutations call the `/api/projects` route handlers and then
 * navigate or refresh so the server-rendered project lists stay in sync.
 *
 * On create, the Liveblocks room ID is derived from the slugified name plus a
 * unique suffix and sent as the project `id`, so the project ID and room ID
 * stay aligned.
 */
export function useProjectActions(): UseProjectActions {
  const router = useRouter()
  const pathname = usePathname()
  const [activeDialog, setActiveDialog] = useState<ProjectDialog | null>(null)
  const [targetProject, setTargetProject] = useState<Project | null>(null)
  const [name, setName] = useState("")
  const [suffix, setSuffix] = useState(generateSuffix)
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
    setSuffix(generateSuffix())
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

  const submitCreate = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    const roomId = `${slugify(trimmed)}-${suffix}`

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roomId, name: trimmed }),
      })

      if (!response.ok) {
        setIsSubmitting(false)
        return
      }

      close()
      router.push(`/editor/${roomId}`)
    } catch {
      setIsSubmitting(false)
    }
  }, [name, suffix, isSubmitting, close, router])

  const submitRename = useCallback(async () => {
    const trimmed = name.trim()
    if (!targetProject || !trimmed || isSubmitting) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/projects/${targetProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })

      if (!response.ok) {
        setIsSubmitting(false)
        return
      }

      close()
      router.refresh()
    } catch {
      setIsSubmitting(false)
    }
  }, [name, targetProject, isSubmitting, close, router])

  const submitDelete = useCallback(async () => {
    if (!targetProject || isSubmitting) return

    const deleted = targetProject
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/projects/${deleted.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        setIsSubmitting(false)
        return
      }

      close()

      // Deleting the workspace currently open leaves nothing to show — go home.
      if (pathname === `/editor/${deleted.id}`) {
        router.push("/editor")
      } else {
        router.refresh()
      }
    } catch {
      setIsSubmitting(false)
    }
  }, [targetProject, isSubmitting, close, pathname, router])

  return {
    activeDialog,
    targetProject,
    name,
    slug: slugify(name),
    suffix,
    isSubmitting,
    openCreate,
    openRename,
    openDelete,
    close,
    setName,
    submitCreate,
    submitRename,
    submitDelete,
  }
}
