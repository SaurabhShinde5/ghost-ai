"use client"

import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react"
import { useEffect, useRef, useState } from "react"
import type {
  ChangeEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react"

import { useCanvasCallbacks } from "@/components/editor/canvas-context"
import { NodeColorToolbar } from "@/components/editor/node-color-toolbar"
import { NodeShape, nodeLabelTextColor } from "@/components/editor/node-shape"
import type { CanvasNode as CanvasNodeType } from "@/types/canvas"

// Smallest a node may be resized to (px). Enforced by `NodeResizer`.
const MIN_NODE_SIZE = 48

const LABEL_PLACEHOLDER = "Add label"

// Connection handles on all four sides. Every handle is a `source`; with the
// canvas in `ConnectionMode.Loose`, a connection can be drawn from any handle to
// any other handle regardless of type.
const HANDLE_POSITIONS = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const

// Renderer for the custom `canvasNode` type. The shape-specific visual is
// delegated to `NodeShape` (CSS for rectangle/pill/circle, SVG for
// diamond/hexagon/cylinder); this wrapper adds the connection handles, the
// selection resize handles, and inline label editing. Border is subtle at rest
// and switches to the brand accent when selected.
export function CanvasNode({ id, data, selected }: NodeProps<CanvasNodeType>) {
  const { updateNodeLabel, updateNodeColor } = useCanvasCallbacks()
  const [isEditing, setIsEditing] = useState(false)
  // Local draft keeps typing responsive; each keystroke is also synced.
  const [draft, setDraft] = useState(data.label)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const borderColor = selected ? "var(--accent-primary)" : "var(--border-subtle)"
  const textColor = nodeLabelTextColor(data.color)

  useEffect(() => {
    if (!isEditing) return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [isEditing])

  function startEditing(event: ReactMouseEvent) {
    // Stop React Flow from zooming the pane on the double-click.
    event.stopPropagation()
    setDraft(data.label)
    setIsEditing(true)
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value
    setDraft(value)
    updateNodeLabel(id, value)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      setIsEditing(false)
    }
  }

  const showOverlay = isEditing || !data.label

  return (
    <div className="group relative h-full w-full" onDoubleClick={startEditing}>
      {selected && (
        <NodeColorToolbar
          activeColor={data.color}
          onSelect={(color) => updateNodeColor(id, color)}
        />
      )}
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_SIZE}
        minHeight={MIN_NODE_SIZE}
        color="var(--accent-primary)"
        handleStyle={{ width: 8, height: 8, borderRadius: 2, border: "none" }}
        lineStyle={{ borderColor: "var(--border-subtle)" }}
      />
      {/* Subtle white handles on every side, hidden until the node is hovered.
          `z-10` lifts them above `NodeShape` (rendered below) so the full hit
          area of each side handle is grabbable — otherwise the shape covers the
          inner half and only the top handle reliably starts a connection. */}
      {HANDLE_POSITIONS.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={handle.position}
          className="z-10 h-2! w-2! min-h-0! min-w-0! rounded-full border! opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          style={{
            backgroundColor: "var(--text-primary)",
            borderColor: "var(--bg-base)",
          }}
        />
      ))}
      <NodeShape
        shape={data.shape}
        fill={data.color}
        borderColor={borderColor}
        // Hide the resting label while editing so the textarea can overlay it.
        label={isEditing ? "" : data.label}
      />
      {showOverlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 py-2 text-center">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={() => setIsEditing(false)}
              // Keep text interactions from dragging the node / panning the canvas.
              onPointerDown={(event) => event.stopPropagation()}
              placeholder={LABEL_PLACEHOLDER}
              className="nodrag nopan pointer-events-auto w-full resize-none border-none bg-transparent text-center text-sm outline-none placeholder:text-copy-muted"
              style={{ color: textColor }}
            />
          ) : (
            <span className="truncate text-sm text-copy-muted">
              {LABEL_PLACEHOLDER}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
