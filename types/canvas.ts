import type { Edge, Node } from "@xyflow/react"

// Shared canvas graph types. User-created content and imported templates must
// follow the same node/edge schema (see architecture-context.md invariant 5).

/** Visual shape a canvas node can render as (see ui-context.md → Node Shapes). */
export type CanvasNodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon"

/** Default pixel dimensions for a canvas node. */
export interface CanvasNodeSize {
  width: number
  height: number
}

/**
 * A shape available in the bottom shape panel, with the default size a newly
 * dropped node of that shape should get. Sizes follow the guidance in
 * `12-shape-panel.md`: rectangles are wider than tall, circles are square, and
 * diamonds are slightly larger so labels have room.
 */
export interface NodeShapeDefinition {
  shape: CanvasNodeShape
  /** Human-readable name used for accessibility labels. */
  label: string
  /** Default size applied to a node dropped from the panel. */
  defaultSize: CanvasNodeSize
}

/** The six shapes offered by the shape panel (see ui-context.md → Node Shapes). */
export const NODE_SHAPES: readonly NodeShapeDefinition[] = [
  { shape: "rectangle", label: "Rectangle", defaultSize: { width: 160, height: 80 } },
  { shape: "diamond", label: "Diamond", defaultSize: { width: 160, height: 120 } },
  { shape: "circle", label: "Circle", defaultSize: { width: 120, height: 120 } },
  { shape: "pill", label: "Pill", defaultSize: { width: 160, height: 60 } },
  { shape: "cylinder", label: "Cylinder", defaultSize: { width: 120, height: 140 } },
  { shape: "hexagon", label: "Hexagon", defaultSize: { width: 160, height: 100 } },
] as const

/** A dark node fill paired with a vivid, readable text color. */
export interface NodeColor {
  /** Node background fill (a CSS color value). */
  fill: string
  /** Label text color (a CSS color value). */
  text: string
}

/** The 8 node color pairs from the canvas palette (see ui-context.md). */
export const NODE_COLORS: readonly NodeColor[] = [
  { fill: "#1F1F1F", text: "#EDEDED" }, // Neutral dark (default)
  { fill: "#10233D", text: "#52A8FF" }, // Blue
  { fill: "#2E1938", text: "#BF7AF0" }, // Purple
  { fill: "#331B00", text: "#FF990A" }, // Orange
  { fill: "#3C1618", text: "#FF6166" }, // Red
  { fill: "#3A1726", text: "#F75F8F" }, // Pink
  { fill: "#0F2E18", text: "#62C073" }, // Green
  { fill: "#062822", text: "#0AC7B4" }, // Teal
] as const

/** Default node color pair applied to newly created nodes. */
export const DEFAULT_NODE_COLOR: NodeColor = NODE_COLORS[0]

/**
 * Data carried by every canvas node. Extends `Record<string, unknown>` so it
 * satisfies React Flow's `Node` data constraint.
 */
export interface CanvasNodeData extends Record<string, unknown> {
  /** Text label shown on the node. */
  label: string
  /** Node fill color (a CSS color value). */
  color: string
  /** Visual shape of the node. */
  shape: CanvasNodeShape
}

/**
 * Payload transferred during a shape drag from the panel to the canvas. Carries
 * the shape to create and the default size the new node should use.
 */
export interface ShapeDragPayload {
  shape: CanvasNodeShape
  size: CanvasNodeSize
}

/** `dataTransfer` MIME type used to carry a {@link ShapeDragPayload}. */
export const SHAPE_DRAG_MIME = "application/ghost-ai-shape" as const

/** Data carried by a canvas edge. */
export interface CanvasEdgeData extends Record<string, unknown> {
  /** Optional label shown along the edge. */
  label?: string
}

/** Custom node type literal used by React Flow's `nodeTypes` map. */
export const CANVAS_NODE_TYPE = "canvasNode" as const

/** Custom edge type literal used by React Flow's `edgeTypes` map. */
export const CANVAS_EDGE_TYPE = "canvasEdge" as const

/** A node on the collaborative canvas. */
export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>

/** An edge on the collaborative canvas. */
export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>
