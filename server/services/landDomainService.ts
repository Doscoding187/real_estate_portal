import {
  deriveLandTrustState,
  toPublicLandPassportAssertions,
  type LandVerificationAssertion,
} from '../../shared/land-domain';

export function buildLandPassport(input: {
  marketingAuthorityActive: boolean;
  hasHighSeverityOpenConflict: boolean;
  assertions: readonly LandVerificationAssertion[];
  now?: Date;
}) {
  const trustState = deriveLandTrustState(input);
  if (!trustState) return null;
  return { trustState, assertions: toPublicLandPassportAssertions(input.assertions) };
}
