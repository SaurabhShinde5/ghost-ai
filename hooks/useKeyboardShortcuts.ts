"use client"

import type { ReactFlowInstance } from "@xyflow/react"
import { useEffect } from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

// Short animation for keyboard-driven zooming so the movement feels smooth,
// matching the on-screen control bar.
const ZOOM_DURATION = 200

interface UseKeyboardShortcutsOptions {
  /** The React Flow instance used to drive zoom actions. */
  reactFlow: ReactFlowInstance<CanvasNode, CanvasEdge>
  /** Undo the last collaborative change. */
  undo: () => void
  /** Redo the last undone collaborative change. */
  redo: () => void
}

// Returns true when the event originates from a field the user is typing into,
// so canvas shortcuts don't hijack text entry (node/edge label editing, inputs).
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  )
}

/**
 * Wires the canvas keyboard shortcuts on `window`:
 * - `+` / `=` → zoom in
 * - `-` → zoom out
 * - Cmd/Ctrl+Z → undo
 * - Cmd/Ctrl+Shift+Z → redo
 * - Cmd/Ctrl+Y → redo
 *
 * Shortcuts are ignored while the user is typing in an editable field.
 */
export function useKeyboardShortcuts({
  reactFlow,
  undo,
  redo,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      const isMod = event.metaKey || event.ctrlKey

      // History shortcuts require the platform modifier.
      if (isMod) {
        const key = event.key.toLowerCase()
        if (key === "z") {
          event.preventDefault()
          if (event.shiftKey) {
            redo()
          } else {
            undo()
          }
          return
        }
        if (key === "y") {
          event.preventDefault()
          redo()
          return
        }
        // Leave other modifier combos (e.g. browser zoom) untouched.
        return
      }

      // Zoom shortcuts fire without a modifier.
      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        void reactFlow.zoomIn({ duration: ZOOM_DURATION })
        return
      }
      if (event.key === "-") {
        event.preventDefault()
        void reactFlow.zoomOut({ duration: ZOOM_DURATION })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [reactFlow, undo, redo])
}
