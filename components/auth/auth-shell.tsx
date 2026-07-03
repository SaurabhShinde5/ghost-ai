import type { ReactNode } from "react"
import { FileText, Ghost, Share2, Sparkles } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "AI Architecture Generation",
    description: "Describe your system, AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Share2,
    title: "Real-time Collaboration",
    description: "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description: "Export a complete Markdown technical spec directly from the canvas graph.",
  },
]

interface AuthShellProps {
  children: ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-surface-border bg-surface bg-[radial-gradient(120%_120%_at_0%_0%,var(--accent-primary-dim)_0%,transparent_55%)] p-10 font-sans lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-[var(--bg-base)]">
            <Ghost className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold text-copy-primary">Ghost AI</span>
        </div>

        <div className="space-y-10">
          <div className="space-y-5">
            <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight text-copy-primary xl:text-5xl">
              Design systems at the speed of thought.
            </h1>
            <p className="max-w-md text-base text-copy-muted">
              Describe your architecture in plain English. Ghost AI maps it to a
              shared canvas your whole team can refine in real time.
            </p>
          </div>

          <ul className="space-y-6">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-dim text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <p className="font-medium text-copy-primary">{title}</p>
                  <p className="max-w-sm text-sm text-copy-muted">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-copy-faint">
          © {new Date().getFullYear()} Ghost AI. All rights reserved.
        </p>
      </section>

      <section className="flex items-center justify-center bg-base p-6 font-sans">
        {children}
      </section>
    </main>
  )
}
