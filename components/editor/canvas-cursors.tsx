"use client"

import { useOthers } from "@liveblocks/react/suspense"
import { useViewport, ViewportPortal } from "@xyflow/react"

// Renders live cursors for every other participant in the room. The current
// user is never rendered here (`useOthers` already excludes self). Each cursor
// reads its position from `presence.cursor` and its color/name from the user's
// presence info, so the pointer and badge match the participant's color.
//
// Cursors are placed inside React Flow's `ViewportPortal`, so they live in flow
// coordinates and pan/zoom with the canvas automatically. An inverse-zoom scale
// keeps each pointer a constant on-screen size regardless of the zoom level.
export function CanvasCursors() {
  const { zoom } = useViewport()
  const others = useOthers()

  return (
    <ViewportPortal>
      {others.map((other) => {
        const cursor = other.presence.cursor
        if (!cursor) return null

        const color = other.info?.color ?? "var(--accent-primary)"
        const name = other.info?.name ?? "Anonymous"

        return (
          <div
            key={other.connectionId}
            className="pointer-events-none absolute left-0 top-0"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px) scale(${1 / zoom})`,
              transformOrigin: "top left",
            }}
          >
            <Pointer color={color} />
            <span
              className="ml-3 mt-0.5 inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              {name}
            </span>
          </div>
        )
      })}
    </ViewportPortal>
  )
}

// Small colored arrow pointer matching the participant's presence color.
function Pointer({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="drop-shadow-sm"
      style={{ color }}
    >
      <path
        d="M1 1L6.5 15L8.7 8.7L15 6.5L1 1Z"
        fill="currentColor"
        stroke="var(--bg-base)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}
