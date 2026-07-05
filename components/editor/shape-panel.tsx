"use client"

import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react"
import { useRef, type DragEvent } from "react"

import { NodeShape } from "@/components/editor/node-shape"
import {
  DEFAULT_NODE_COLOR,
  NODE_SHAPES,
  SHAPE_DRAG_MIME,
  type CanvasNodeShape,
  type ShapeDragPayload,
} from "@/types/canvas"

const SHAPE_ICONS: Record<CanvasNodeShape, LucideIcon> = {
  rectangle: RectangleHorizontal,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
}

// Floating pill-shaped toolbar pinned to the bottom-center of the canvas.
// Each button is draggable; dragging one onto the canvas creates a node of that
// shape at the drop position.
export function ShapePanel() {
  // Off-screen ghost previews (one per shape) handed to `setDragImage` so the
  // cursor carries a preview of the exact shape + default size that will drop.
  const ghostRefs = useRef<Partial<Record<CanvasNodeShape, HTMLDivElement | null>>>({})

  function handleDragStart(
    event: DragEvent<HTMLButtonElement>,
    definition: (typeof NODE_SHAPES)[number]
  ) {
    const payload: ShapeDragPayload = {
      shape: definition.shape,
      size: definition.defaultSize,
    }
    event.dataTransfer.setData(SHAPE_DRAG_MIME, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "copy"

    const ghost = ghostRefs.current[definition.shape]
    if (ghost) {
      // Center the preview on the cursor. The browser clears the drag image
      // automatically once the drag drops or is cancelled.
      event.dataTransfer.setDragImage(
        ghost,
        definition.defaultSize.width / 2,
        definition.defaultSize.height / 2
      )
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-surface-border bg-surface/90 p-1.5 shadow-lg backdrop-blur">
        {NODE_SHAPES.map((definition) => {
          const Icon = SHAPE_ICONS[definition.shape]
          return (
            <button
              key={definition.shape}
              type="button"
              draggable
              onDragStart={(event) => handleDragStart(event, definition)}
              title={definition.label}
              aria-label={`Drag to add ${definition.label}`}
              className="flex h-10 w-10 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
            >
              <Icon className="h-5 w-5" />
            </button>
          )
        })}
      </div>

      {/* Off-screen ghost previews used as the drag image. Positioned far off
          the viewport (not hidden) so `setDragImage` can still snapshot them. */}
      <div className="pointer-events-none fixed left-[-9999px] top-0" aria-hidden>
        {NODE_SHAPES.map((definition) => (
          <div
            key={definition.shape}
            ref={(el) => {
              ghostRefs.current[definition.shape] = el
            }}
            style={{
              width: definition.defaultSize.width,
              height: definition.defaultSize.height,
            }}
          >
            <NodeShape
              shape={definition.shape}
              fill={DEFAULT_NODE_COLOR.fill}
              borderColor="var(--border-subtle)"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
