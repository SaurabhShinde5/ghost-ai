"use client"

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"

import { NODE_COLORS } from "@/types/canvas"

interface NodeColorToolbarProps {
  /** Current node fill; the matching swatch renders as active. */
  activeColor: string
  /** Called with the chosen fill when a swatch is picked. */
  onSelect: (fill: string) => void
}

/**
 * Floating palette shown just above a selected node. One swatch per
 * predefined fill/text color pair; the active pair is clearly marked and
 * hovering a swatch shows a tight glow tinted with that pair's text color.
 *
 * Every interactive element carries `nodrag nopan` and stops pointer/click
 * propagation so recoloring never drags the node or pans the canvas.
 */
export function NodeColorToolbar({ activeColor, onSelect }: NodeColorToolbarProps) {
  // Keep clicks and drags from reaching React Flow's pane/node handlers.
  const stop = (event: ReactPointerEvent<HTMLElement>) => event.stopPropagation()

  return (
    <div
      className="nodrag nopan absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-surface-border bg-surface px-2 py-1.5 shadow-lg"
      onPointerDown={stop}
    >
      {NODE_COLORS.map((color) => {
        const isActive = color.fill === activeColor
        return (
          <button
            key={color.fill}
            type="button"
            aria-label={`Set node color`}
            aria-pressed={isActive}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(color.fill)
            }}
            style={
              {
                backgroundColor: color.fill,
                borderColor: color.text,
                "--swatch-glow": color.text,
                // The active ring uses the pair's text color for a clear selected feel.
                "--tw-ring-color": color.text,
              } as CSSProperties
            }
            className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 hover:shadow-[0_0_6px_1px_var(--swatch-glow)] ${
              isActive
                ? "scale-110 ring-2 ring-offset-2 ring-offset-surface"
                : "ring-0"
            }`}
          />
        )
      })}
    </div>
  )
}
