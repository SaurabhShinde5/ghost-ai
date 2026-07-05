"use client"

import { NODE_COLORS, type CanvasNodeShape } from "@/types/canvas"

// Shapes drawn with plain CSS (border + border-radius) rather than SVG.
const CSS_SHAPE_RADIUS: Partial<Record<CanvasNodeShape, string>> = {
  rectangle: "rounded-xl",
  pill: "rounded-full",
  circle: "rounded-full",
}

// Label text color paired with each node fill (see ui-context.md → Node Colors).
const FILL_TO_TEXT = new Map(NODE_COLORS.map((color) => [color.fill, color.text]))

/**
 * Resolve the label text color for a given node fill, falling back to the
 * primary text token. Exported so the inline label editor (`CanvasNode`) tints
 * its textarea to match the resting label without duplicating the mapping.
 */
export function nodeLabelTextColor(fill: string): string {
  return FILL_TO_TEXT.get(fill) ?? "var(--text-primary)"
}

interface NodeShapeProps {
  shape: CanvasNodeShape
  /** Node fill color (a CSS color value). */
  fill: string
  /** Border/stroke color — pass the brighter accent when the node is selected. */
  borderColor: string
  /** Optional centered label. */
  label?: string
}

/**
 * Renders a canvas shape into its `h-full w-full` container. Used both by the
 * node renderer (`CanvasNode`) and by the shape-panel drag preview so the drop
 * result and the ghost preview always share one visual source of truth.
 *
 * Rectangle, pill, and circle use CSS; diamond, hexagon, and cylinder render as
 * inline SVGs that scale with the node size (`preserveAspectRatio="none"`), with
 * a non-scaling stroke so borders stay an even weight at any dimension.
 */
export function NodeShape({ shape, fill, borderColor, label = "" }: NodeShapeProps) {
  const textColor = nodeLabelTextColor(fill)
  const cssRadius = CSS_SHAPE_RADIUS[shape]

  const labelNode = label ? (
    <span className="truncate text-sm" style={{ color: textColor }}>
      {label}
    </span>
  ) : null

  if (cssRadius) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center border px-3 py-2 text-center ${cssRadius}`}
        style={{ backgroundColor: fill, borderColor }}
      >
        {labelNode}
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <ShapeOutline shape={shape} fill={fill} stroke={borderColor} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-3 py-2 text-center">
        {labelNode}
      </div>
    </div>
  )
}

interface ShapeOutlineProps {
  shape: CanvasNodeShape
  fill: string
  stroke: string
}

// SVG geometry for the non-CSS shapes, expressed in the normalized 100x100
// viewBox. `vectorEffect="non-scaling-stroke"` keeps the border a constant
// on-screen weight regardless of the node's (stretched) size.
function ShapeOutline({ shape, fill, stroke }: ShapeOutlineProps) {
  const common = {
    fill,
    stroke,
    strokeWidth: 1.5,
    vectorEffect: "non-scaling-stroke" as const,
  }

  switch (shape) {
    case "diamond":
      return <polygon points="50,1 99,50 50,99 1,50" {...common} />
    case "hexagon":
      return <polygon points="25,1 75,1 99,50 75,99 25,99 1,50" {...common} />
    case "cylinder":
      return (
        <>
          <path d="M0,14 L0,86 A50,14 0 0 1 100,86 L100,14 Z" {...common} />
          <ellipse cx="50" cy="14" rx="50" ry="14" {...common} />
        </>
      )
    default:
      return null
  }
}
