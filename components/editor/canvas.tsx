"use client"

import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react"
import { useCallback, useMemo, useRef } from "react"
import type { DragEvent } from "react"

import { CanvasNode } from "@/components/editor/canvas-node"
import { CanvasCallbacksProvider } from "@/components/editor/canvas-context"
import { ShapePanel } from "@/components/editor/shape-panel"
import {
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  SHAPE_DRAG_MIME,
  type CanvasEdge,
  type CanvasNode as CanvasNodeModel,
  type ShapeDragPayload,
} from "@/types/canvas"

import "@xyflow/react/dist/style.css"

// React Flow canvas backed by Liveblocks Storage. Nodes and edges are synced
// through `useLiveblocksFlow`; the canvas starts empty. The bottom shape panel
// drags new nodes onto the canvas. Custom edge rendering, controls, and
// persistence are intentionally out of scope here.
export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}

function CanvasInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNodeModel, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  const { screenToFlowPosition, getNode } = useReactFlow<CanvasNodeModel, CanvasEdge>()

  // Monotonic counter so IDs stay unique even when several nodes are dropped
  // within the same millisecond.
  const idCounter = useRef(0)

  const nodeTypes = useMemo(() => ({ [CANVAS_NODE_TYPE]: CanvasNode }), [])

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

  const canvasCallbacks = useMemo(
    () => ({ updateNodeLabel, updateNodeColor }),
    [updateNodeLabel, updateNodeColor]
  )

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
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDelete={onDelete}
          connectionMode={ConnectionMode.Loose}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} />
          <MiniMap />
        </ReactFlow>
        <ShapePanel />
      </div>
    </CanvasCallbacksProvider>
  )
}
