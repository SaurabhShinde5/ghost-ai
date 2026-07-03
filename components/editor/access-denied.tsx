import Link from "next/link"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Shown when a project does not exist or the signed-in user has no access to
 * it. Rendered by the `/editor/[roomId]` server component.
 */
export function AccessDenied() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-5 bg-base px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-elevated text-copy-muted">
        <Lock className="h-8 w-8" />
      </span>

      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-copy-primary">
          No access to this project
        </h1>
        <p className="max-w-sm text-sm text-copy-muted">
          This project doesn&apos;t exist, or you don&apos;t have permission to
          open it.
        </p>
      </div>

      <Button asChild variant="outline">
        <Link href="/editor">Back to projects</Link>
      </Button>
    </div>
  )
}
