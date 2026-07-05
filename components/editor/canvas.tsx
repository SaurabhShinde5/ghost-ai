"use client"

import { useRedo, useUndo, useUpdateMyPresence } from "@liveblocks/react/suspense"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import type { DragEvent, MouseEvent as ReactMouseEvent } from "react"

import { CanvasControls } from "@/components/editor/canvas-controls"
import { CanvasCursors } from "@/components/editor/canvas-cursors"
import { CanvasEdge as CanvasEdgeRenderer } from "@/components/editor/canvas-edge"
import { CanvasNode } from "@/components/editor/canvas-node"
import { CanvasCallbacksProvider } from "@/components/editor/canvas-context"
import { PresenceAvatars } from "@/components/editor/presence-avatars"
import { ShapePanel } from "@/components/editor/shape-panel"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import {
  useCanvasAutosave,
  type CanvasSaveStatus,
} from "@/hooks/use-canvas-autosave"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  SHAPE_DRAG_MIME,
  type CanvasEdge,
  type CanvasNode as CanvasNodeModel,
  type CanvasSnapshot,
  type ShapeDragPayload,
} from "@/types/canvas"

import "@xyflow/react/dist/style.css"

interface CanvasProps {
  /** Project ID — also the Liveblocks room ID and canvas API path segment. */
  projectId: string
  /** Whether the starter templates modal is open. */
  isTemplatesOpen: boolean
  /** Called when the templates modal requests a change to its open state. */
  onTemplatesOpenChange: (open: boolean) => void
  /** Called whenever the canvas autosave status changes. */
  onSaveStatusChange: (status: CanvasSaveStatus) => void
}

// React Flow canvas backed by Liveblocks Storage. Nodes and edges are synced
// through `useLiveblocksFlow`; the bottom shape panel drags new nodes onto the
// canvas. Canvas state is autosaved to (and loaded from) Vercel Blob via the
// project's canvas API route.
export function Canvas({
  projectId,
  isTemplatesOpen,
  onTemplatesOpenChange,
  onSaveStatusChange,
}: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner
        projectId={projectId}
        isTemplatesOpen={isTemplatesOpen}
        onTemplatesOpenChange={onTemplatesOpenChange}
        onSaveStatusChange={onSaveStatusChange}
      />
    </ReactFlowProvider>
  )
}

function CanvasInner({
  projectId,
  isTemplatesOpen,
  onTemplatesOpenChange,
  onSaveStatusChange,
}: CanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNodeModel, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  const reactFlow = useReactFlow<CanvasNodeModel, CanvasEdge>()
  const { screenToFlowPosition, getNode, getEdge } = reactFlow

  // Liveblocks history drives undo/redo; the same handlers back both the
  // control bar and the keyboard shortcuts.
  const undo = useUndo()
  const redo = useRedo()

  useKeyboardShortcuts({ reactFlow, undo, redo })

  // Broadcasts this user's live cursor position to the room via presence.
  const updateMyPresence = useUpdateMyPresence()

  // Debounced autosave of the canvas graph to Vercel Blob; the status drives the
  // navbar Save indicator.
  const saveStatus = useCanvasAutosave({ projectId, nodes, edges })

  useEffect(() => {
    onSaveStatusChange(saveStatus)
  }, [saveStatus, onSaveStatusChange])

  // Snapshot of the room state + sync handlers as they were on mount. The load
  // effect reads from here so it can run exactly once (deps: just `projectId`)
  // without listing `nodes`/`edges` — which it mutates — in its deps. Because the
  // canvas mounts under `ClientSideSuspense` with `suspense: true`, these mount
  // values already reflect the settled Liveblocks Storage state.
  const loadContext = useRef({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    reactFlow,
  })

  // Load the saved canvas once per room, but only into an empty room — if the
  // room already has active collaboration (nodes or edges), skip the load
  // entirely so we never overwrite live work. No `AbortController` here: the
  // fetch is short and cancelling it mid-flight only surfaces a spurious
  // `AbortError`; a `cancelled` flag guards against applying results post-unmount.
  useEffect(() => {
    const {
      nodes: initialNodes,
      edges: initialEdges,
      onNodesChange: addNodes,
      onEdgesChange: addEdges,
      reactFlow: flow,
    } = loadContext.current

    if (initialNodes.length > 0 || initialEdges.length > 0) return

    let cancelled = false

    void (async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/canvas`)
        if (cancelled || !response.ok) return

        const data = (await response.json()) as { canvas: CanvasSnapshot | null }
        if (cancelled || !data.canvas) return

        if (data.canvas.nodes.length > 0) {
          addNodes(data.canvas.nodes.map((item) => ({ type: "add", item })))
        }
        if (data.canvas.edges.length > 0) {
          addEdges(data.canvas.edges.map((item) => ({ type: "add", item })))
        }

        window.setTimeout(() => {
          if (!cancelled) {
            void flow.fitView({ duration: 300, padding: 0.2 })
          }
        }, 80)
      } catch {
        // Load failures leave the room empty; the user can still start fresh.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [projectId])

  // Monotonic counter so IDs stay unique even when several nodes are dropped
  // within the same millisecond.
  const idCounter = useRef(0)

  const nodeTypes = useMemo(() => ({ [CANVAS_NODE_TYPE]: CanvasNode }), [])
  const edgeTypes = useMemo(
    () => ({ [CANVAS_EDGE_TYPE]: CanvasEdgeRenderer }),
    []
  )

  // New connections adopt the custom edge renderer, a light rounded stroke, and
  // an arrowhead at the target end.
  const defaultEdgeOptions = useMemo(
    () => ({
      type: CANVAS_EDGE_TYPE,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "var(--edge-stroke)",
        width: 18,
        height: 18,
      },
      style: {
        stroke: "var(--edge-stroke)",
        strokeWidth: 1.5,
        strokeLinecap: "round" as const,
      },
    }),
    []
  )

  // Route a node's label edit back through the same `onNodesChange` sync path as
  // every other change (a `replace` change reconciles the node in Storage).
  const updateNodeLabel = useCallback(
    (id: string, label: string) => {
      const node = getNode(id)
      if (!node) return
      onNodesChange([
        { type: "replace", id, item: { ...node, data: { ...node.data, label } } },
      ])
    },
    [getNode, onNodesChange]
  )

  // Recolor a node through the same `replace`-change sync path. Only the fill
  // (`data.color`) is stored; the paired text color is derived from it, so the
  // node UI (and its label) updates immediately on the next Storage render.
  const updateNodeColor = useCallback(
    (id: string, color: string) => {
      const node = getNode(id)
      if (!node) return
      onNodesChange([
        { type: "replace", id, item: { ...node, data: { ...node.data, color } } },
      ])
    },
    [getNode, onNodesChange]
  )

  // Route an edge's label edit through the same `onEdgesChange` sync path as
  // every other edge change (a `replace` change reconciles the edge in Storage).
  const updateEdgeLabel = useCallback(
    (id: string, label: string) => {
      const edge = getEdge(id)
      if (!edge) return
      onEdgesChange([
        { type: "replace", id, item: { ...edge, data: { ...edge.data, label } } },
      ])
    },
    [getEdge, onEdgesChange]
  )

  const canvasCallbacks = useMemo(
    () => ({ updateNodeLabel, updateNodeColor, updateEdgeLabel }),
    [updateNodeLabel, updateNodeColor, updateEdgeLabel]
  )

  // Replace the current canvas with a starter template: clear every existing
  // edge and node, then add the template's nodes and edges. Everything routes
  // through the same `onNodesChange`/`onEdgesChange` sync path (so it stays in
  // the collaborative Storage flow), and the view is fit once the new nodes
  // have rendered and been measured.
  const importTemplate = useCallback(
    (template: CanvasTemplate) => {
      if (edges.length > 0) {
        onEdgesChange(edges.map((edge) => ({ type: "remove", id: edge.id })))
      }
      if (nodes.length > 0) {
        onNodesChange(nodes.map((node) => ({ type: "remove", id: node.id })))
      }

      onNodesChange(template.nodes.map((item) => ({ type: "add", item })))
      onEdgesChange(template.edges.map((item) => ({ type: "add", item })))

      window.setTimeout(() => {
        void reactFlow.fitView({ duration: 300, padding: 0.2 })
      }, 80)
    },
    [nodes, edges, onNodesChange, onEdgesChange, reactFlow]
  )

  // Broadcast the cursor in flow coordinates so it stays anchored to the canvas
  // across pan/zoom for every viewer.
  const onCanvasMouseMove = useCallback(
    (event: ReactMouseEvent) => {
      const cursor = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      updateMyPresence({ cursor })
    },
    [screenToFlowPosition, updateMyPresence]
  )

  const onCanvasMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null })
  }, [updateMyPresence])

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const raw = event.dataTransfer.getData(SHAPE_DRAG_MIME)
      if (!raw) return

      let payload: ShapeDragPayload
      try {
        payload = JSON.parse(raw) as ShapeDragPayload
      } catch {
        return
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: CanvasNodeModel = {
        id: `${payload.shape}-${Date.now()}-${idCounter.current++}`,
        type: CANVAS_NODE_TYPE,
        position,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR.fill,
          shape: payload.shape,
        },
        width: payload.size.width,
        height: payload.size.height,
      }

      onNodesChange([{ type: "add", item: newNode }])
    },
    [onNodesChange, screenToFlowPosition]
  )

  return (
    <CanvasCallbacksProvider value={canvasCallbacks}>
      <div className="relative h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDelete={onDelete}
          onMouseMove={onCanvasMouseMove}
          onMouseLeave={onCanvasMouseLeave}
          connectionMode={ConnectionMode.Loose}
          connectionLineStyle={{
            stroke: "var(--edge-stroke)",
            strokeWidth: 1.5,
            strokeOpacity: 0.6,
          }}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} />
          <CanvasCursors />
        </ReactFlow>
        <PresenceAvatars />
        <CanvasControls />
        <ShapePanel />
        <StarterTemplatesModal
          open={isTemplatesOpen}
          onOpenChange={onTemplatesOpenChange}
          onImport={importTemplate}
        />
      </div>
    </CanvasCallbacksProvider>
  )
}
