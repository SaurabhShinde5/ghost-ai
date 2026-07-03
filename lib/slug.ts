/**
 * Derive a URL-safe slug from a project name. Used for the live slug preview in
 * the Create Project dialog — lowercase, non-alphanumeric runs collapsed to a
 * single hyphen, no leading or trailing hyphens.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
