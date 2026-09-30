import { getAccountAuthHref } from './publicNavigation';

export function getAgencyInvitationAcceptancePath(token: string) {
  return `/accept-invitation?${new URLSearchParams({ token }).toString()}`;
}

/**
 * Preserve the complete internal acceptance route through account entry. The
 * Login surface owns the `next` parameter; callers must not invent a parallel
 * redirect parameter that gets dropped after authentication.
 */
export function getAgencyInvitationAuthHref(token: string) {
  return getAccountAuthHref('signin', getAgencyInvitationAcceptancePath(token));
}
