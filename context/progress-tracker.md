# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Foundation — design system and UI primitives

## Current Goal

- Implement `context/feature-specs/02-editor-chrome.md`: build the base editor chrome — top `EditorNavbar` (sidebar toggle) and floating `ProjectSidebar` overlay (tabs + New Project) — plus a reusable dialog pattern component ready for future use.

## Completed

- `02-editor-chrome` — base editor chrome built. `components/editor/editor-navbar.tsx`: fixed-height (`h-14`) top bar, left/center/right sections, ghost sidebar-toggle button swapping `PanelLeftOpen`/`PanelLeftClose` on the `isSidebarOpen` prop, `bg-surface` + subtle bottom border, right section empty. `components/editor/project-sidebar.tsx`: floating overlay (`absolute inset-y-0 left-0`, does not push content) that slides in via `translate-x` on the `isOpen` prop, "Projects" header + close button, shadcn `Tabs` (My Projects / Shared) each with an empty placeholder state, full-width `New Project` button with `Plus` icon at the bottom. `components/editor/editor-dialog.tsx`: reusable dialog pattern wrapping shadcn `Dialog` with title/description/footer slots, `rounded-3xl` and `globals.css` color tokens — ready for future use, no concrete dialogs wired yet. Verified with `tsc --noEmit` and `eslint`.
- `01-design-system` — shadcn/ui installed and configured (radix + Nova preset, `components.json`, RSC). Added primitives: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea (`components/ui/*`, unmodified). `lucide-react` installed. `lib/utils.ts` exposes `cn()`. `app/globals.css` defines the dark-only token layer from `ui-context.md`; app is dark by default (`dark` class on `<html>`). Verified with `tsc --noEmit` and `next build`.

## In Progress

- None.

## Next Up

- Wire the editor chrome into an editor route/layout and add the center canvas surface.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Dark-only theme: shadcn's light `:root` / dark `.dark` split is collapsed into a single dark palette in `globals.css` (values from `ui-context.md`), and `<html>` carries the `dark` class so shadcn `dark:` variants stay active. No light mode.
- Design tokens from `ui-context.md` are exposed as Tailwind utilities via `@theme inline` (e.g. `bg-base`, `bg-surface`, `text-copy-*`, `text-brand`, `bg-accent-dim`, `text-ai`), layered alongside shadcn's semantic tokens.

## Session Notes

- Add context needed to resume work in the next session.
