Clerk is already installed and connected. Wire it into the Next.js app: provider, auth pages, redirects, route protection, and user menu.

## Design

Use Clerk’s `dark` theme from `@clerk/ui/themes` as the base.

Override Clerk appearance variables using the app’s existing CSS variables. Do not hardcode colors.

Sign-in and sign-up pages:

- large screens: even 50/50 two-panel layout
- left panel: differentiated from the dark right panel via a subtle brand-tinted
  surface (surface color with a faint `--accent-primary-dim` radial glow) — not a
  loud gradient
- left content, top to bottom: brand logo mark, a short hero heading + tagline,
  an icon-led feature list (icon in a brand-dim rounded square + title +
  one-line description), and a footer copyright line
- right panel: centered Clerk form on the base background
- small screens: form only (left panel hidden)
- no scroll-heavy layouts

All typography uses the UI-guideline fonts (Geist Sans for text, Geist Mono for
code) via the app's font tokens. Keep the layout clean and professional.

## Implementation

Wrap the root layout with `ClerkProvider` using Clerk’s `dark` theme.

Create sign-in and sign-up pages using Clerk components.

Use `proxy.ts` at the project root, not `middleware.ts`.

Define public routes using the existing sign-in and sign-up env vars. Protect everything else by default.

Update `/`:

- authenticated users redirect to `/editor`
- unauthenticated users redirect to `/sign-in`

Add Clerk’s built-in `UserButton` to the editor navbar right section for profile settings and logout.

Keep Clerk’s default user menu and profile flows intact. Do not rebuild or heavily customize Clerk internals.

Use existing Clerk env vars. Do not rename or invent new ones.

## Dependencies

install: @clerk/ui.

## Check When Done

- `proxy.ts` exists at the root
- all routes are protected except public auth paths
- auth pages use CSS variables with no hardcoded colors
- `ClerkProvider` wraps the root layout
- `npm run build` passes
