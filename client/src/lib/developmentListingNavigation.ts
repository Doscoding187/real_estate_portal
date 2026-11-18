/** Only same-site paths ("/x") are allowed; protocol-relative ("//x") and backslash tricks are not. */
export function isInternalHref(href: unknown): href is string {
  return (
    typeof href === 'string' &&
    href.startsWith('/') &&
    !href.startsWith('//') &&
    !href.startsWith('/\\')
  );
}

/** True when the visitor arrived from another page of this site, so history.back() stays in-site. */
export function hasInSiteHistory(
  win: Pick<Window, 'history' | 'location'> | undefined = typeof window !== 'undefined'
    ? window
    : undefined,
  referrer: string = typeof document !== 'undefined' ? document.referrer : '',
): boolean {
  if (!win || win.history.length <= 1) return false;
  if (!referrer) return false;
  try {
    return new URL(referrer).origin === win.location.origin;
  } catch {
    return false;
  }
}
