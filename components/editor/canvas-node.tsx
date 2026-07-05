"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"

import type { CanvasNode as CanvasNodeType } from "@/types/canvas"

// Basic renderer for the custom `canvasNode` type. For this unit every shape is
// drawn as a simple bordered rectangle with the label centered; shape-specific
// visuals (diamond, hexagon, cylinder SVGs, etc.) come in a later unit.
export function CanvasNode({ data, selected }: NodeProps<CanvasNodeType>) {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-xl border px-3 py-2 text-center text-sm"
      style={{
        backgroundColor: data.color,
        borderColor: selected ? "var(--accent-primary)" : "var(--border-subtle)",
      }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <span className="truncate text-copy-primary">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
}
