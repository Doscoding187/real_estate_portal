/** Homepage property cards require an actual photo URL, never a placeholder. */
export function hasHomePropertyPhoto(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const url = value.trim();
  return /^(https?:\/\/|\/(?!\/))/i.test(url) && !/placeholder|fallback|\/logo\./i.test(url);
}
