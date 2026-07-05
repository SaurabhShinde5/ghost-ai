import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeShape,
} from "@/types/canvas"

/**
 * A pre-built canvas the user can import to start from a diagram instead of a
 * blank canvas. Templates use the exact same node/edge schema as user-created
 * content (see architecture-context.md invariant 5), so importing one is just
 * a bulk add of `CanvasNode`s and `CanvasEdge`s.
 */
export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

// Palette lookup by role so the template data below reads by intent rather than
// hex codes. Values come straight from the shared `NODE_COLORS` palette.
const COLOR = {
  neutral: NODE_COLORS[0].fill,
  blue: NODE_COLORS[1].fill,
  purple: NODE_COLORS[2].fill,
  orange: NODE_COLORS[3].fill,
  red: NODE_COLORS[4].fill,
  pink: NODE_COLORS[5].fill,
  green: NODE_COLORS[6].fill,
  teal: NODE_COLORS[7].fill,
} as const

// Each shape's default size, so template nodes match freshly-dropped nodes.
const SHAPE_SIZE = new Map(NODE_SHAPES.map((s) => [s.shape, s.defaultSize]))

/** Build a canvas node, sizing it from the shape's default dimensions. */
function node(
  id: string,
  shape: CanvasNodeShape,
  label: string,
  color: string,
  x: number,
  y: number
): CanvasNode {
  const size = SHAPE_SIZE.get(shape) ?? { width: 160, height: 80 }
  return {
    id,
    type: CANVAS_NODE_TYPE,
    position: { x, y },
    data: { label, color, shape },
    width: size.width,
    height: size.height,
  }
}

interface EdgeOptions {
  label?: string
  sourceHandle?: string
  targetHandle?: string
}

/** Build a canvas edge with a stable id derived from its endpoints. */
function edge(source: string, target: string, options: EdgeOptions = {}): CanvasEdge {
  return {
    id: `${source}->${target}`,
    type: CANVAS_EDGE_TYPE,
    source,
    target,
    sourceHandle: options.sourceHandle,
    targetHandle: options.targetHandle,
    data: options.label ? { label: options.label } : {},
  }
}

// Handle ids for a top-to-bottom flow (see `canvas-node.tsx` HANDLE_POSITIONS).
const DOWN: EdgeOptions = { sourceHandle: "bottom", targetHandle: "top" }
// Handle ids for a left-to-right flow.
const RIGHT: EdgeOptions = { sourceHandle: "right", targetHandle: "left" }

// A microservices architecture: a client behind an API gateway that fans out to
// independent services, each owning its own datastore.
const microservices: CanvasTemplate = {
  id: "microservices",
  name: "Microservices",
  description:
    "An API gateway routing a web client to independent services, each backed by its own database.",
  nodes: [
    node("client", "pill", "Web Client", COLOR.blue, 220, 0),
    node("gateway", "rectangle", "API Gateway", COLOR.purple, 220, 140),
    node("auth", "rectangle", "Auth Service", COLOR.teal, 0, 300),
    node("orders", "rectangle", "Orders Service", COLOR.green, 220, 300),
    node("payments", "rectangle", "Payments Service", COLOR.orange, 440, 300),
    node("auth-db", "cylinder", "Users DB", COLOR.neutral, 20, 440),
    node("orders-db", "cylinder", "Orders DB", COLOR.neutral, 240, 440),
    node("payments-db", "cylinder", "Payments DB", COLOR.neutral, 460, 440),
  ],
  edges: [
    edge("client", "gateway", DOWN),
    edge("gateway", "auth", DOWN),
    edge("gateway", "orders", DOWN),
    edge("gateway", "payments", DOWN),
    edge("auth", "auth-db", DOWN),
    edge("orders", "orders-db", DOWN),
    edge("payments", "payments-db", DOWN),
  ],
}

// A CI/CD pipeline: a linear commit → build → test → approve → deploy flow with
// a manual approval gate before production.
const cicdPipeline: CanvasTemplate = {
  id: "ci-cd-pipeline",
  name: "CI/CD Pipeline",
  description:
    "A commit-to-production flow: build and test on every commit, gated by a manual approval before deploy.",
  nodes: [
    node("commit", "circle", "Commit", COLOR.blue, 0, 60),
    node("build", "rectangle", "Build", COLOR.purple, 180, 80),
    node("test", "rectangle", "Test", COLOR.teal, 380, 80),
    node("approve", "diamond", "Approve?", COLOR.orange, 580, 60),
    node("staging", "rectangle", "Deploy Staging", COLOR.green, 800, 80),
    node("prod", "rectangle", "Deploy Prod", COLOR.red, 1000, 80),
  ],
  edges: [
    edge("commit", "build", RIGHT),
    edge("build", "test", RIGHT),
    edge("test", "approve", RIGHT),
    edge("approve", "staging", { ...RIGHT, label: "yes" }),
    edge("staging", "prod", RIGHT),
  ],
}

// An event-driven system: a producer publishing to an event bus that fans out to
// independent consumers, one of which persists to a warehouse.
const eventDriven: CanvasTemplate = {
  id: "event-driven",
  name: "Event-Driven System",
  description:
    "A producer publishing to an event bus that fans events out to independent worker consumers.",
  nodes: [
    node("producer", "rectangle", "Order Service", COLOR.blue, 0, 160),
    node("bus", "hexagon", "Event Bus", COLOR.orange, 240, 150),
    node("email", "rectangle", "Email Worker", COLOR.green, 480, 20),
    node("analytics", "rectangle", "Analytics Worker", COLOR.teal, 480, 160),
    node("inventory", "rectangle", "Inventory Worker", COLOR.purple, 480, 300),
    node("warehouse", "cylinder", "Warehouse DB", COLOR.neutral, 720, 150),
  ],
  edges: [
    edge("producer", "bus", { ...RIGHT, label: "publish" }),
    edge("bus", "email", RIGHT),
    edge("bus", "analytics", RIGHT),
    edge("bus", "inventory", RIGHT),
    edge("analytics", "warehouse", RIGHT),
  ],
}

/** The built-in starter templates offered in the import modal. */
export const CANVAS_TEMPLATES: readonly CanvasTemplate[] = [
  microservices,
  cicdPipeline,
  eventDriven,
]
