import { Liveblocks } from "@liveblocks/node"

/**
 * Fixed palette of cursor colors. A user is always mapped to the same entry so
 * their cursor color stays stable across sessions and devices.
 */
const CURSOR_COLORS = [
  "#E11D48",
  "#DB2777",
  "#9333EA",
  "#6D28D9",
  "#4F46E5",
  "#2563EB",
  "#0891B2",
  "#059669",
  "#16A34A",
  "#CA8A04",
  "#EA580C",
  "#DC2626",
] as const

/**
 * Deterministically map a user ID to a consistent color from the fixed palette.
 * The same ID always yields the same color, without any stored state.
 */
export function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length
  return CURSOR_COLORS[index]
}

function createLiveblocksClient(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not set")
  }

  return new Liveblocks({ secret })
}

const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined
}

/**
 * Return the cached Liveblocks Node client, creating it on first use. The client
 * is instantiated lazily rather than at module load so the missing-secret guard
 * only trips on an actual request — never during `next build` page-data
 * collection, which evaluates route modules without runtime env available.
 *
 * The instance is memoized on `globalThis` so it survives hot reloads in
 * development without leaking a new client per request.
 */
export function getLiveblocks(): Liveblocks {
  const client = globalForLiveblocks.liveblocks ?? createLiveblocksClient()

  if (process.env.NODE_ENV !== "production") {
    globalForLiveblocks.liveblocks = client
  }

  return client
}
