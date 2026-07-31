/**
 * Roles that can be associated with a future external Explore publisher
 * programme. They are deliberately distinct from the role that can submit
 * content today: there is no operational external review-and-publish flow.
 */
export const EXPLORE_PUBLISHER_IDENTITY_ROLES = [
  'super_admin',
  'agency_admin',
  'agent',
  'property_developer',
] as const;

export type ExplorePublisherIdentityRole = (typeof EXPLORE_PUBLISHER_IDENTITY_ROLES)[number];

/**
 * Internal editorial submission is the only live Explore publishing path.
 * External professional identities remain checked server-side so their future
 * onboarding can fail closed until review and explicit publication exist.
 */
export function canUploadToExploreRole(role?: string | null): boolean {
  return String(role || '').trim().toLowerCase() === 'super_admin';
}

/**
 * This is not upload permission. It identifies roles whose organisation or
 * professional identity can be validated before returning the truthful
 * external-submission-not-open state.
 */
export function hasExplorePublisherIdentityRole(
  role?: string | null,
): role is ExplorePublisherIdentityRole {
  return EXPLORE_PUBLISHER_IDENTITY_ROLES.includes(
    String(role || '').trim().toLowerCase() as ExplorePublisherIdentityRole,
  );
}
