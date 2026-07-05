"use client"

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useErrorListener,
} from "@liveblocks/react/suspense"
import type { ReactNode } from "react"
import { useState } from "react"

import { Canvas } from "@/components/editor/canvas"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"

interface CanvasRoomProps {
  /** Liveblocks room ID — the project ID. */
  roomId: string
  /** Whether the starter templates modal is open. */
  isTemplatesOpen: boolean
  /** Called when the templates modal requests a change to its open state. */
  onTemplatesOpenChange: (open: boolean) => void
  /** Called whenever the canvas autosave status changes. */
  onSaveStatusChange: (status: CanvasSaveStatus) => void
}

// Client wrapper that sets up the Liveblocks room around the collaborative
// canvas: provider + room, a loading state while Storage syncs, and an error
// fallback for connection failures.
export function CanvasRoom({
  roomId,
  isTemplatesOpen,
  onTemplatesOpenChange,
  onSaveStatusChange,
}: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, thinking: false }}
      >
        <ConnectionGuard>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <Canvas
              projectId={roomId}
              isTemplatesOpen={isTemplatesOpen}
              onTemplatesOpenChange={onTemplatesOpenChange}
              onSaveStatusChange={onSaveStatusChange}
            />
          </ClientSideSuspense>
        </ConnectionGuard>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

// Swaps in an error fallback when the room connection fails (auth, access, or
// full-room errors surfaced by Liveblocks).
function ConnectionGuard({ children }: { children: ReactNode }) {
  const [hasConnectionError, setHasConnectionError] = useState(false)

  useErrorListener((error) => {
    if (error.context.type === "ROOM_CONNECTION_ERROR") {
      setHasConnectionError(true)
    }
  })

  if (hasConnectionError) {
    return <CanvasError />
  }

  return <>{children}</>
}

function CanvasLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium text-copy-secondary">Loading canvas…</p>
    </div>
  )
}

function CanvasError() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium text-copy-secondary">
        Couldn’t connect to the canvas
      </p>
      <p className="text-xs text-copy-muted">
        Check your connection and reload the page to try again.
      </p>
    </div>
  )
}
