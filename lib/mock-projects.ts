import type { Project } from "@/types/project"

/**
 * Placeholder project data for the editor home and sidebar. No persistence yet
 * — replaced by real API-backed data in a later phase.
 */
export const MOCK_PROJECTS: Project[] = [
  {
    id: "realtime-chat-backend",
    name: "Realtime Chat Backend",
    slug: "realtime-chat-backend",
    role: "owner",
  },
  {
    id: "ecommerce-platform",
    name: "E-Commerce Platform",
    slug: "e-commerce-platform",
    role: "owner",
  },
  {
    id: "event-driven-orders",
    name: "Event-Driven Orders",
    slug: "event-driven-orders",
    role: "collaborator",
  },
]
