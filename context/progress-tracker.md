# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Authentication — Clerk wiring and route protection

## Current Goal

- Implement `context/feature-specs/03-auth.md`: wire Clerk into the app — `ClerkProvider` in the root layout, sign-in/sign-up pages, `proxy.ts` route protection, `/` auth redirects, and the `UserButton` in the editor navbar.

## Completed

- `03-auth` — Clerk wired end to end. `app/layout.tsx`: root wrapped in `ClerkProvider` using the `dark` theme from `@clerk/ui/themes`, with `appearance.variables` overridden entirely through the app's CSS variables (`var(--accent-primary)`, `var(--bg-surface)`, `var(--text-primary)`, `var(--radius)`, etc.) — no hardcoded colors. `proxy.ts` at the project root (Next.js 16 renamed `middleware` → `proxy`): `clerkMiddleware` + `createRouteMatcher` treats only the sign-in/sign-up URL env vars as public and calls `auth.protect()` on everything else. `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` render Clerk's `SignIn`/`SignUp` inside a shared `components/auth/auth-shell.tsx` — an even 50/50 two-panel layout. Left panel (hidden below `lg`) is a brand-tinted surface (`bg-surface` + a faint `--accent-primary-dim` radial glow) holding a `Ghost` logo mark, a hero heading + tagline, an icon-led feature list (`Sparkles`/`Share2`/`FileText` in `bg-accent-dim` rounded squares), and a footer copyright; right panel is the centered Clerk form on `bg-base`. Typography uses the Geist font tokens (`font-sans`) per the UI guidelines. Design section of `03-auth.md` was updated to match this approved screenshot direction (the earlier "no gradients / no hero / no feature cards" constraints were relaxed). `app/page.tsx` is now a server component that reads `auth()` and redirects authenticated users to `/editor`, unauthenticated to `/sign-in`. `components/editor/editor-navbar.tsx` right section now holds Clerk's `UserButton`. Added a minimal `app/editor/page.tsx` (client) that mounts the existing `EditorNavbar` + `ProjectSidebar` so the redirect target exists and the `UserButton` renders in context. Added Clerk's standard `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` env vars (`/sign-in`, `/sign-up`). Installed `@clerk/ui`. Verified with `next build` and `eslint`.
- `02-editor-chrome` — base editor chrome built. `components/editor/editor-navbar.tsx`: fixed-height (`h-14`) top bar, left/center/right sections, ghost sidebar-toggle button swapping `PanelLeftOpen`/`PanelLeftClose` on the `isSidebarOpen` prop, `bg-surface` + subtle bottom border, right section empty. `components/editor/project-sidebar.tsx`: floating overlay (`absolute inset-y-0 left-0`, does not push content) that slides in via `translate-x` on the `isOpen` prop, "Projects" header + close button, shadcn `Tabs` (My Projects / Shared) each with an empty placeholder state, full-width `New Project` button with `Plus` icon at the bottom. `components/editor/editor-dialog.tsx`: reusable dialog pattern wrapping shadcn `Dialog` with title/description/footer slots, `rounded-3xl` and `globals.css` color tokens — ready for future use, no concrete dialogs wired yet. Verified with `tsc --noEmit` and `eslint`.
- `01-design-system` — shadcn/ui installed and configured (radix + Nova preset, `components.json`, RSC). Added primitives: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea (`components/ui/*`, unmodified). `lucide-react` installed. `lib/utils.ts` exposes `cn()`. `app/globals.css` defines the dark-only token layer from `ui-context.md`; app is dark by default (`dark` class on `<html>`). Verified with `tsc --noEmit` and `next build`.

## In Progress

- None.

## Next Up

- Flesh out the `/editor` route: add the center canvas surface and the right-side AI sidebar (currently the route only mounts the navbar + project sidebar as a landing target for the auth redirect).

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Route protection lives in `proxy.ts` at the project root, not `middleware.ts` — Next.js 16 renamed Middleware to Proxy. `clerkMiddleware` is protected-by-default: only the sign-in/sign-up URL env vars are public.
- Clerk appearance is themed via `dark` from `@clerk/ui/themes` (not `@clerk/themes`) with all `variables` pointing at the app's existing CSS custom properties, so Clerk UI inherits the design tokens with zero hardcoded colors.
- Public-route config keys off Clerk's standard `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` env vars rather than string literals, so auth paths stay single-sourced.
- Dark-only theme: shadcn's light `:root` / dark `.dark` split is collapsed into a single dark palette in `globals.css` (values from `ui-context.md`), and `<html>` carries the `dark` class so shadcn `dark:` variants stay active. No light mode.
- Design tokens from `ui-context.md` are exposed as Tailwind utilities via `@theme inline` (e.g. `bg-base`, `bg-surface`, `text-copy-*`, `text-brand`, `bg-accent-dim`, `text-ai`), layered alongside shadcn's semantic tokens.

## Session Notes

- Add context needed to resume work in the next session.
