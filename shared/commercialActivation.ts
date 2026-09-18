/** The only commercial products approved for the paid MVP launch cohort. */
export const PAID_MVP_LAUNCH_ACCESS_PRODUCT_KEYS = [
  'agent_launch_access',
  'agency_launch_access',
  'developer_launch_access',
] as const;

export type PaidMvpLaunchAccessProductKey =
  (typeof PAID_MVP_LAUNCH_ACCESS_PRODUCT_KEYS)[number];

export type CommercialActivationState = {
  mode: string;
  enabled: boolean;
  enabledProductKeys: readonly PaidMvpLaunchAccessProductKey[];
};

export function isPaidMvpLaunchAccessProductKey(
  value: unknown,
): value is PaidMvpLaunchAccessProductKey {
  return (
    typeof value === 'string' &&
    (PAID_MVP_LAUNCH_ACCESS_PRODUCT_KEYS as readonly string[]).includes(value)
  );
}

export function isPaidMvpLaunchAccessProductEnabled(
  productKey: unknown,
  state: CommercialActivationState,
): productKey is PaidMvpLaunchAccessProductKey {
  return (
    isPaidMvpLaunchAccessProductKey(productKey) &&
    state.enabled &&
    state.enabledProductKeys.includes(productKey)
  );
}

/**
 * The public commercial state for the pre-payment MVP cohort.
 *
 * Changing this state is a product and release decision: it must not be
 * inferred from provider credentials, an invoice configuration, or a plan.
 * `enabledProductKeys` is deliberately an allow-list: even when the cohort is
 * released, a future or deferred commercial product cannot become live merely
 * because the general commercial switch changes.
 */
export const COMMERCIAL_ACTIVATION_STATE = {
  mode: 'preparation_only',
  enabled: false,
  enabledProductKeys: [] as readonly PaidMvpLaunchAccessProductKey[],
  message:
    'Commercial activation is not available yet. Complete your profile and prepare private drafts; publishing becomes available after approved commercial activation.',
} as const;

export type CommercialActivationMode = typeof COMMERCIAL_ACTIVATION_STATE.mode;
