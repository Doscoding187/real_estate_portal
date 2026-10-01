import { describe, expect, it } from 'vitest';
import { REHEARSAL, REHEARSAL_RESOURCE_ID } from '../rehearsalAuthority';
import { resolveDatabaseAuthority } from '../context';
import { authorizeDatabaseOperation, expectedDatabaseAcknowledgement } from '../authorization';

describe('completed rehearsal live registration (no transport)', () => {
  it('refuses the exact target after completion even before the original expiry', () => {
    expect(REHEARSAL.status).toBe('revoked');
    const a = resolveDatabaseAuthority({
      operation: 'rehearsal-regression',
      explicitDatabaseUrl: `mysql://fixture:fixture@${REHEARSAL.hostname}/${REHEARSAL.database}`,
      credentialClass: 'runtime',
      processEnv: { NODE_ENV: 'test', APP_ENV: 'test' },
      rehearsal: { resourceId: REHEARSAL_RESOURCE_ID, purpose: REHEARSAL.purpose },
    });
    expect(() =>
      authorizeDatabaseOperation(a, {
        approval: {
          actor: 'Edward',
          reference: REHEARSAL.purpose,
          operation: a.context.operation,
          targetFingerprintHash: a.context.targetFingerprintHash,
        },
        acknowledgement: expectedDatabaseAcknowledgement(a.context),
      }),
    ).toThrow('revoked');
  });
});
