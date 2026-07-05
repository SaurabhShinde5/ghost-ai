"use client"

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react"
import { useEffect, useRef, useState } from "react"
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"

import { useCanvasCallbacks } from "@/components/editor/canvas-context"
import type { CanvasEdge as CanvasEdgeType } from "@/types/canvas"

// Invisible interaction band around the edge. Makes the edge far easier to hover
// and click without changing the visible line thickness.
const INTERACTION_WIDTH = 24

const LABEL_PLACEHOLDER = "Label"
const LABEL_HINT = "Double-click to label"

/**
 * Renderer for the custom `canvasEdge` type. Uses `getSmoothStepPath` for clean
 * right-angle routing, keeps the stroke dimmed at rest and brightens it on hover
 * or selection, and widens only the invisible interaction band so the line stays
 * thin. Double-clicking the edge opens an inline label editor positioned at the
 * path midpoint returned by `getSmoothStepPath`; the label is saved back through
 * the collaborative edge data flow.
 */
export function CanvasEdge({
  id,
  data,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps<CanvasEdgeType>) {
  const { updateEdgeLabel } = useCanvasCallbacks()
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(data?.label ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

  // Right-angle path plus the midpoint (labelX/labelY) used to place the label —
  // no manual midpoint math.
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  const label = data?.label ?? ""
  const active = selected || isHovered

  useEffect(() => {
    if (!isEditing) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [isEditing])

  function startEditing(event: ReactMouseEvent) {
    event.stopPropagation()
    setDraft(label)
    setIsEditing(true)
  }

  // Persist the current draft through the collaborative edge data flow and close
  // the editor. Bound to blur, Enter, and Escape.
  function commit() {
    updateEdgeLabel(id, draft.trim())
    setIsEditing(false)
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault()
      commit()
    }
  }

  // Keep label pointer interactions from dragging the edge or panning the canvas.
  const stopPointer = (event: ReactPointerEvent) => event.stopPropagation()

  // Dimmed at rest; brighter when hovered or selected. The visible stroke width
  // changes only slightly — the interaction band does the hover/click heavy lifting.
  const strokeOpacity = active ? 1 : 0.45
  const strokeWidth = active ? 2 : 1.5

  return (
    <>
      {/* Invisible fat path: easy to hover/click while the visible line stays thin. */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={INTERACTION_WIDTH}
        className="react-flow__edge-interaction"
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={startEditing}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: "var(--edge-stroke)",
          strokeOpacity,
          strokeWidth,
          strokeLinecap: "round",
          transition: "stroke-opacity 120ms ease, stroke-width 120ms ease",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onDoubleClick={startEditing}
          onPointerDown={stopPointer}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commit}
              placeholder={LABEL_PLACEHOLDER}
              // Grow with the text; clamp so the empty/short input stays usable.
              style={{ width: `${Math.max(draft.length, 5)}ch` }}
              className="nodrag nopan rounded-full border border-surface-border bg-elevated px-2 py-0.5 text-center text-xs text-copy-primary outline-none"
            />
          ) : label ? (
            // Saved labels render as small pill badges.
            <span className="cursor-pointer rounded-full border border-surface-border bg-elevated px-2 py-0.5 text-xs text-copy-secondary">
              {label}
            </span>
          ) : active ? (
            // Faint hint on an active edge with no label yet.
            <span className="cursor-pointer rounded-full border border-dashed border-surface-border-subtle px-2 py-0.5 text-xs text-copy-faint">
              {LABEL_HINT}
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
