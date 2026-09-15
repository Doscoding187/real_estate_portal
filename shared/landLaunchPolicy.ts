/**
 * First-cohort disposition for the specialist Land vertical.
 *
 * Land has a separate authority, review and public-projection lifecycle. It
 * is deliberately deferred from the first paid cohort until that lifecycle
 * has its own commercial policy and acceptance slice. This is an explicit
 * product decision, not a signal inferred from provider or billing state.
 *
 * Keep this policy immutable and environment-independent. Releasing Land
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

/** Fail closed before an authoring, review, or publication transition. */
export function requireLandVerticalAvailable(operation: string): void {
  if (isLandVerticalAvailable()) return;

  throw new Error(
    `${operation} is unavailable while Land is deferred from the first launch cohort. ${LAND_VERTICAL_LAUNCH_STATE.message}`,
  );
}
