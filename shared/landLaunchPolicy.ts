/**
 * First-cohort publication disposition for the specialist Land vertical.
 *
 * Land has a separate authority, review and public-projection lifecycle. It
 * is deliberately deferred from the first paid cohort until that lifecycle
 * has its own commercial policy and acceptance slice. This is an explicit
 * product decision, not a signal inferred from provider or billing state.
 *
 * Public search entry is a separate decision below. Keep publication policy
 * environment-independent. Releasing Land publication
 * requires a reviewed product change and the protected acceptance evidence
 * recorded in the launch register.
 */
export const LAND_VERTICAL_LAUNCH_STATE = {
  mode: 'deferred_first_cohort',
  enabled: false,
  message:
    'Land is deferred from the first launch cohort while its specialist commercial and operating path is completed.',
} as const;

export type LandVerticalLaunchMode = typeof LAND_VERTICAL_LAUNCH_STATE.mode;

/** Edward authorised public Land search entry on 14 October 2026.
 * This opens the specialist consumer UI; it does not release Land authoring,
 * review, lead custody or public inventory through the commercial boundary.
 */
export function isLandPublicDiscoveryAvailable(): boolean {
  return true;
}

export function isLandVerticalAvailable(): boolean {
  return LAND_VERTICAL_LAUNCH_STATE.enabled;
}

/**
 * A generic Development row labelled `land` cannot provide an alternate
 * authoring or public-discovery route while the specialist Land vertical is
 * deferred. Existing rows remain retained; their public and publication
 * transitions must fail closed.
 */
export function isDeferredLandDevelopmentType(developmentType: unknown): boolean {
  return developmentType === 'land' && !isLandVerticalAvailable();
}

/**
 * Draft payloads have existed in both flattened and nested wizard shapes.
 * Treat either representation as Land so an older client payload cannot turn
 * the generic Developer draft store into a deferred-Land authoring route.
 */
export function isDeferredLandDevelopmentDraft(draftData: unknown): boolean {
  if (!draftData || typeof draftData !== 'object') return false;

  const draft = draftData as Record<string, unknown>;
  const nestedDevelopment =
    draft.developmentData && typeof draft.developmentData === 'object'
      ? (draft.developmentData as Record<string, unknown>)
      : null;

  return (
    isDeferredLandDevelopmentType(draft.developmentType) ||
    isDeferredLandDevelopmentType(nestedDevelopment?.developmentType)
  );
}

/** Fail closed before an authoring, review, or publication transition. */
export function requireLandVerticalAvailable(operation: string): void {
  if (isLandVerticalAvailable()) return;

  throw new Error(
    `${operation} is unavailable while Land is deferred from the first launch cohort. ${LAND_VERTICAL_LAUNCH_STATE.message}`,
  );
}
