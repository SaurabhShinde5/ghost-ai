"use client"

import { Fragment } from "react"

import { nodeLabelTextColor } from "@/components/editor/node-shape"
import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from "@/components/editor/starter-templates"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CanvasNode, CanvasNodeShape } from "@/types/canvas"

interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the picked template right before the modal closes. */
  onImport: (template: CanvasTemplate) => void
}

/**
 * Import dialog for the starter template library. Shows each template as a card
 * with a lightweight diagram preview, its name and description, and an import
 * button that replaces the current canvas with the template.
 */
export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  function handleImport(template: CanvasTemplate) {
    onImport(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 rounded-3xl border border-surface-border bg-elevated text-copy-primary sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-copy-primary">Start from a template</DialogTitle>
          <DialogDescription className="text-copy-muted">
            Import a pre-built diagram to start faster. This replaces everything
            currently on the canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {CANVAS_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onImport={() => handleImport(template)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TemplateCardProps {
  template: CanvasTemplate
  onImport: () => void
}

function TemplateCard({ template, onImport }: TemplateCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-3">
      <TemplatePreview template={template} />
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-copy-primary">{template.name}</h3>
        <p className="text-xs leading-relaxed text-copy-muted">
          {template.description}
        </p>
      </div>
      <Button size="sm" className="mt-auto w-full" onClick={onImport}>
        Import
      </Button>
    </div>
  )
}

// Fixed preview viewport (SVG user units). The template is scaled to fit inside
// this box with a little padding.
const PREVIEW_W = 260
const PREVIEW_H = 150
const PREVIEW_PAD = 16

interface TemplatePreviewProps {
  template: CanvasTemplate
}

/**
 * A lightweight, non-interactive preview of a template. Bounds are computed from
 * the node positions/sizes, the diagram is scaled to fit the fixed viewport,
 * edges are drawn as simple lines between node centers, and nodes are drawn
 * using their shape and color data.
 */
function TemplatePreview({ template }: TemplatePreviewProps) {
  const { nodes } = template
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  // Diagram bounds in canvas coordinates.
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    const w = n.width ?? 0
    const h = n.height ?? 0
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x + w)
    maxY = Math.max(maxY, n.position.y + h)
  }

  const contentW = Math.max(maxX - minX, 1)
  const contentH = Math.max(maxY - minY, 1)
  const scale = Math.min(
    (PREVIEW_W - PREVIEW_PAD * 2) / contentW,
    (PREVIEW_H - PREVIEW_PAD * 2) / contentH
  )
  // Center the scaled diagram inside the viewport.
  const offsetX = (PREVIEW_W - contentW * scale) / 2 - minX * scale
  const offsetY = (PREVIEW_H - contentH * scale) / 2 - minY * scale

  const px = (x: number) => x * scale + offsetX
  const py = (y: number) => y * scale + offsetY
  const center = (n: CanvasNode) => ({
    x: px(n.position.x + (n.width ?? 0) / 2),
    y: py(n.position.y + (n.height ?? 0) / 2),
  })

  return (
    <svg
      viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
      className="h-32 w-full rounded-xl bg-base"
      role="img"
      aria-label={`${template.name} diagram preview`}
    >
      {/* Edges first so nodes sit on top of the connecting lines. */}
      {template.edges.map((e) => {
        const source = nodeById.get(e.source)
        const target = nodeById.get(e.target)
        if (!source || !target) return null
        const a = center(source)
        const b = center(target)
        return (
          <line
            key={e.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--edge-stroke)"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        )
      })}

      {nodes.map((n) => (
        <Fragment key={n.id}>
          <PreviewShape
            shape={n.data.shape}
            fill={n.data.color}
            x={px(n.position.x)}
            y={py(n.position.y)}
            w={(n.width ?? 0) * scale}
            h={(n.height ?? 0) * scale}
          />
        </Fragment>
      ))}
    </svg>
  )
}

interface PreviewShapeProps {
  shape: CanvasNodeShape
  fill: string
  x: number
  y: number
  w: number
  h: number
}

// Draws a single node into the preview using its shape + color. Mirrors the
// canvas shape set (see `node-shape.tsx`) but simplified for a static preview.
function PreviewShape({ shape, fill, x, y, w, h }: PreviewShapeProps) {
  const stroke = nodeLabelTextColor(fill)
  const common = {
    fill,
    stroke,
    strokeOpacity: 0.6,
    strokeWidth: 1,
  }

  switch (shape) {
    case "circle":
      return (
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...common} />
      )
    case "pill":
      return <rect x={x} y={y} width={w} height={h} rx={h / 2} {...common} />
    case "diamond":
      return (
        <polygon
          points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`}
          {...common}
        />
      )
    case "hexagon": {
      const inset = w * 0.22
      return (
        <polygon
          points={`${x + inset},${y} ${x + w - inset},${y} ${x + w},${y + h / 2} ${x + w - inset},${y + h} ${x + inset},${y + h} ${x},${y + h / 2}`}
          {...common}
        />
      )
    }
    case "cylinder":
      return <rect x={x} y={y} width={w} height={h} rx={Math.min(w / 2, 6)} {...common} />
    case "rectangle":
    default:
      return <rect x={x} y={y} width={w} height={h} rx={3} {...common} />
  }
}
