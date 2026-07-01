# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Foundation — design system and UI primitives

## Current Goal

- Implement `context/feature-specs/01-design-system.md`: install and configure shadcn/ui, add UI primitives, wire the `cn()` helper, and match the dark-only theme.

## Completed

- `01-design-system` — shadcn/ui installed and configured (radix + Nova preset, `components.json`, RSC). Added primitives: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea (`components/ui/*`, unmodified). `lucide-react` installed. `lib/utils.ts` exposes `cn()`. `app/globals.css` defines the dark-only token layer from `ui-context.md`; app is dark by default (`dark` class on `<html>`). Verified with `tsc --noEmit` and `next build`.

## In Progress

- None.

## Next Up

- Add the next planned feature unit here.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Dark-only theme: shadcn's light `:root` / dark `.dark` split is collapsed into a single dark palette in `globals.css` (values from `ui-context.md`), and `<html>` carries the `dark` class so shadcn `dark:` variants stay active. No light mode.
- Design tokens from `ui-context.md` are exposed as Tailwind utilities via `@theme inline` (e.g. `bg-base`, `bg-surface`, `text-copy-*`, `text-brand`, `bg-accent-dim`, `text-ai`), layered alongside shadcn's semantic tokens.

## Session Notes

- Add context needed to resume work in the next session.
