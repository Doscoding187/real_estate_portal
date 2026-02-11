export function slugify(input: string): string {
  return (input ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Quick unique slug generator (no DB check).
 * Good enough to unblock dev creation immediately.
 */
export async function generateUniqueSlug(source: string): Promise<string> {
  const base = slugify(source) || "item";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
