"use client"

import { Check, CircleAlert, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"

interface SaveStatusProps {
  status: CanvasSaveStatus
}

interface StatusView {
  icon: typeof Check
  label: string
  className: string
  spin?: boolean
}

// Autosave keeps the canvas persisted, so this "Save" button is a status
// indicator rather than a trigger. It reflects the current autosave lifecycle.
const STATUS_VIEWS: Record<CanvasSaveStatus, StatusView> = {
  idle: { icon: Check, label: "Saved", className: "text-copy-muted" },
  saving: {
    icon: Loader2,
    label: "Saving…",
    className: "text-copy-secondary",
    spin: true,
  },
  saved: { icon: Check, label: "Saved", className: "text-copy-secondary" },
  error: { icon: CircleAlert, label: "Save failed", className: "text-error" },
}

// Small save-status indicator styled as the editor's Save button. Non-interactive
// because saving is automatic; it only communicates the autosave state.
export function SaveStatus({ status }: SaveStatusProps) {
  const view = STATUS_VIEWS[status]
  const Icon = view.icon

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled
      aria-live="polite"
      className={`gap-1.5 disabled:opacity-100 ${view.className}`}
    >
      <Icon className={view.spin ? "animate-spin" : undefined} />
      {view.label}
    </Button>
  )
}
