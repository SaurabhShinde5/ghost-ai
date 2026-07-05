"use client"

import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react/suspense"
import { useReactFlow } from "@xyflow/react"
import {
  Maximize,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react"
import { useCallback } from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

// Short animation so zoom / fit movements feel smooth.
const ZOOM_DURATION = 200

interface ControlButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}

function ControlButton({ icon: Icon, label, onClick, disabled }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  )
}

// Floating pill-shaped control bar pinned to the bottom-left of the canvas,
// sitting above the centered shape panel. Groups zoom controls (out / fit /
// in) and history controls (undo / redo), separated by a thin divider. Zoom is
// wired to the React Flow instance; undo/redo to Liveblocks history.
export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow<CanvasNode, CanvasEdge>()

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  const handleZoomIn = useCallback(
    () => void zoomIn({ duration: ZOOM_DURATION }),
    [zoomIn]
  )
  const handleZoomOut = useCallback(
    () => void zoomOut({ duration: ZOOM_DURATION }),
    [zoomOut]
  )
  const handleFitView = useCallback(
    () => void fitView({ duration: ZOOM_DURATION }),
    [fitView]
  )

  return (
    <div className="absolute bottom-6 left-6 z-10 flex items-center gap-1 rounded-full border border-surface-border bg-surface/90 p-1.5 shadow-lg backdrop-blur">
      <ControlButton icon={ZoomOut} label="Zoom out" onClick={handleZoomOut} />
      <ControlButton icon={Maximize} label="Fit view" onClick={handleFitView} />
      <ControlButton icon={ZoomIn} label="Zoom in" onClick={handleZoomIn} />

      <span className="mx-0.5 h-5 w-px bg-surface-border" aria-hidden />

      <ControlButton
        icon={Undo2}
        label="Undo"
        onClick={undo}
        disabled={!canUndo}
      />
      <ControlButton
        icon={Redo2}
        label="Redo"
        onClick={redo}
        disabled={!canRedo}
      />
    </div>
  )
}
