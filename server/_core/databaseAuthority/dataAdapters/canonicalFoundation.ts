import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  assertOperation,
  stableDigest,
  type AdapterEvidence,
} from './common';
import {
  CANONICAL_COMMERCIAL_DIGEST,
  prepareCanonicalCommercialReferenceData,
  verifyCanonicalCommercialReference,
  type CommercialReferenceEvidence,
} from './canonicalCommercial';

/**
 * Launch Access products are required application foundation data, not
 * geography reference data. Keep their operation boundary distinct even
 * though the underlying commercial verifier remains the canonical product
 * implementation.
 */
export const CANONICAL_FOUNDATION_VERSION = 'canonical-launch-foundation-v1' as const;

const FOUNDATION_PAYLOAD = Object.freeze({
  version: CANONICAL_FOUNDATION_VERSION,
  sourceAdapter: 'canonical-commercial',
  sourceDigest: CANONICAL_COMMERCIAL_DIGEST,
});

export const CANONICAL_FOUNDATION_DIGEST = stableDigest(FOUNDATION_PAYLOAD);

function foundationEvidence(
  evidence: CommercialReferenceEvidence,
): CommercialReferenceEvidence & AdapterEvidence {
  return {
    ...evidence,
    adapter: 'canonical-foundation',
    version: CANONICAL_FOUNDATION_VERSION,
    digest: CANONICAL_FOUNDATION_DIGEST,
  };
}

export async function prepareCanonicalFoundation(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<CommercialReferenceEvidence & AdapterEvidence> {
  assertOperation(input.decision, ['foundation-seed']);
  return foundationEvidence(await prepareCanonicalCommercialReferenceData(input));
}

export async function verifyCanonicalFoundation(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}): Promise<CommercialReferenceEvidence & AdapterEvidence> {
  assertOperation(input.decision, ['verification', 'readiness']);
  return foundationEvidence(await verifyCanonicalCommercialReference(input));
}
