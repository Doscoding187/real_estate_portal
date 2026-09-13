/**
 * The public commercial state for the pre-payment MVP cohort.
 *
 * Changing this state is a product and release decision: it must not be
 * inferred from provider credentials, an invoice configuration, or a plan.
 */
export const COMMERCIAL_ACTIVATION_STATE = {
  mode: 'preparation_only',
  enabled: false,
  message:
    'Commercial activation is not available yet. Complete your profile and prepare private drafts; publishing becomes available after approved commercial activation.',
} as const;

export type CommercialActivationMode = typeof COMMERCIAL_ACTIVATION_STATE.mode;
