# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Editor Home & Project Dialogs — mock-data UI for the `/editor` landing screen and project management dialogs.

## Current Goal

- Implement `context/feature-specs/04-project-dialogs.md`: build the `/editor` home screen (heading, description, `New Project` button), the Create/Rename/Delete project dialogs, sidebar project items with owner-only rename/delete actions, and a mobile backdrop scrim. Mock data only — no API calls or persistence.

## Completed

- `04-project-dialogs` — editor home + project dialogs built on mock data (no persistence). `components/editor/editor-home.tsx`: centered heading (`Create a project or open an existing one`), description, and a `New Project` button with a `Plus` icon — no cards, minimal layout. `hooks/use-project-dialogs.ts`: a dedicated hook owning dialog state (`activeDialog: "create" | "rename" | "delete" | null`), the target project, form `name`, a live `slug` derived via `slugify(name)`, and `isSubmitting` loading state; submits are mocked (toggle loading + close) so real async can drop in later. `lib/slug.ts`: `slugify()` for the live slug preview. `types/project.ts`: `Project` interface + `ProjectRole` + `isOwnedProject()`. `lib/mock-projects.ts`: `MOCK_PROJECTS` (two owned, one collaborator). `components/editor/project-dialogs.tsx`: renders the three dialogs off the hook via the existing `EditorDialog` pattern — Create has a name input + live slug preview and a form-bound submit; Rename prefills + auto-focuses the input, shows the current name in the description, and submits on Enter (form submit); Delete is a destructive confirmation with no input and a `destructive`-variant confirm button. `components/editor/project-sidebar.tsx`: now takes `ownedProjects` / `sharedProjects` and the create/rename/delete handlers; My Projects lists owned projects with hover/focus-revealed `Pencil`/`Trash2` actions, Shared lists collaborator projects with no actions; empty states retained for empty lists. `app/editor/page.tsx`: instantiates the hook, mounts `EditorHome`, wires the sidebar `New Project` + home button + item actions to the dialogs, and adds a `lg:hidden` backdrop scrim (below the sidebar, above content) that closes the sidebar on tap. Verified with `tsc --noEmit` and `eslint`.
- `03-auth` — Clerk wired end to end. `app/layout.tsx`: root wrapped in `ClerkProvider` using the `dark` theme from `@clerk/ui/themes`, with `appearance.variables` overridden entirely through the app's CSS variables (`var(--accent-primary)`, `var(--bg-surface)`, `var(--text-primary)`, `var(--radius)`, etc.) — no hardcoded colors. `proxy.ts` at the project root (Next.js 16 renamed `middleware` → `proxy`): `clerkMiddleware` + `createRouteMatcher` treats only the sign-in/sign-up URL env vars as public and calls `auth.protect()` on everything else. `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` render Clerk's `SignIn`/`SignUp` inside a shared `components/auth/auth-shell.tsx` — an even 50/50 two-panel layout. Left panel (hidden below `lg`) is a brand-tinted surface (`bg-surface` + a faint `--accent-primary-dim` radial glow) holding a `Ghost` logo mark, a hero heading + tagline, an icon-led feature list (`Sparkles`/`Share2`/`FileText` in `bg-accent-dim` rounded squares), and a footer copyright; right panel is the centered Clerk form on `bg-base`. Typography uses the Geist font tokens (`font-sans`) per the UI guidelines. Design section of `03-auth.md` was updated to match this approved screenshot direction (the earlier "no gradients / no hero / no feature cards" constraints were relaxed). `app/page.tsx` is now a server component that reads `auth()` and redirects authenticated users to `/editor`, unauthenticated to `/sign-in`. `components/editor/editor-navbar.tsx` right section now holds Clerk's `UserButton`. Added a minimal `app/editor/page.tsx` (client) that mounts the existing `EditorNavbar` + `ProjectSidebar` so the redirect target exists and the `UserButton` renders in context. Added Clerk's standard `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` env vars (`/sign-in`, `/sign-up`). Installed `@clerk/ui`. Verified with `next build` and `eslint`.
- `02-editor-chrome` — base editor chrome built. `components/editor/editor-navbar.tsx`: fixed-height (`h-14`) top bar, left/center/right sections, ghost sidebar-toggle button swapping `PanelLeftOpen`/`PanelLeftClose` on the `isSidebarOpen` prop, `bg-surface` + subtle bottom border, right section empty. `components/editor/project-sidebar.tsx`: floating overlay (`absolute inset-y-0 left-0`, does not push content) that slides in via `translate-x` on the `isOpen` prop, "Projects" header + close button, shadcn `Tabs` (My Projects / Shared) each with an empty placeholder state, full-width `New Project` button with `Plus` icon at the bottom. `components/editor/editor-dialog.tsx`: reusable dialog pattern wrapping shadcn `Dialog` with title/description/footer slots, `rounded-3xl` and `globals.css` color tokens — ready for future use, no concrete dialogs wired yet. Verified with `tsc --noEmit` and `eslint`.
- `01-design-system` — shadcn/ui installed and configured (radix + Nova preset, `components.json`, RSC). Added primitives: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea (`components/ui/*`, unmodified). `lucide-react` installed. `lib/utils.ts` exposes `cn()`. `app/globals.css` defines the dark-only token layer from `ui-context.md`; app is dark by default (`dark` class on `<html>`). Verified with `tsc --noEmit` and `next build`.

## In Progress

- None.

## Next Up

- Replace mock project data with real API-backed data + persistence (Prisma-backed project CRUD), then wire the dialog submit handlers to those endpoints.
- Flesh out the `/editor` route beyond the home screen: add the center canvas surface and the right-side AI sidebar.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Route protection lives in `proxy.ts` at the project root, not `middleware.ts` — Next.js 16 renamed Middleware to Proxy. `clerkMiddleware` is protected-by-default: only the sign-in/sign-up URL env vars are public.
- Clerk appearance is themed via `dark` from `@clerk/ui/themes` (not `@clerk/themes`) with all `variables` pointing at the app's existing CSS custom properties, so Clerk UI inherits the design tokens with zero hardcoded colors.
- Public-route config keys off Clerk's standard `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` env vars rather than string literals, so auth paths stay single-sourced.
- Dark-only theme: shadcn's light `:root` / dark `.dark` split is collapsed into a single dark palette in `globals.css` (values from `ui-context.md`), and `<html>` carries the `dark` class so shadcn `dark:` variants stay active. No light mode.
- Project UI mock data lives in `lib/mock-projects.ts` (not the legacy `data/` directory, which `architecture-context.md` marks unused for new artifacts); the shared `Project` type lives in `types/project.ts`. Both are placeholders until Prisma-backed project CRUD lands.
- Dialog/form/loading state for project create/rename/delete is centralized in `hooks/use-project-dialogs.ts` rather than scattered across components, so the `/editor` page composes home + sidebar + dialogs against one state source and API wiring is a single swap later.
- Design tokens from `ui-context.md` are exposed as Tailwind utilities via `@theme inline` (e.g. `bg-base`, `bg-surface`, `text-copy-*`, `text-brand`, `bg-accent-dim`, `text-ai`), layered alongside shadcn's semantic tokens.

## Session Notes

- Add context needed to resume work in the next session.
