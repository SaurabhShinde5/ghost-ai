"use client"

import { createContext, useContext } from "react"

/**
 * Imperative callbacks the canvas exposes to its custom nodes. Custom node
 * components render deep inside React Flow and cannot reach the Liveblocks sync
 * handlers directly, so `CanvasInner` provides them through this context. Every
 * callback must route mutations through the existing `onNodesChange` sync flow.
 */
export interface CanvasCallbacks {
  /** Write a node's label back through the collaborative sync flow. */
  updateNodeLabel: (id: string, label: string) => void
  /** Write a node's fill color back through the collaborative sync flow. */
  updateNodeColor: (id: string, color: string) => void
}

const CanvasCallbacksContext = createContext<CanvasCallbacks | null>(null)

export const CanvasCallbacksProvider = CanvasCallbacksContext.Provider

export function useCanvasCallbacks(): CanvasCallbacks {
  const callbacks = useContext(CanvasCallbacksContext)
  if (!callbacks) {
    throw new Error("useCanvasCallbacks must be used within a CanvasCallbacksProvider")
  }
  return callbacks
}
