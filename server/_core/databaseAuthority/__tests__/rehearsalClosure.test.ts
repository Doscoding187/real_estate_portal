import { describe, expect, it } from 'vitest';
import { REHEARSAL, REHEARSAL_RESOURCE_ID } from '../rehearsalAuthority';
import { resolveDatabaseAuthority } from '../context';

describe('completed rehearsal live registration (no transport)', () => {
  it('refuses the exact target after completion even before the original expiry', () => {
    expect(REHEARSAL.status).toBe('revoked');
    expect(() =>
      resolveDatabaseAuthority({
        operation: 'rehearsal-regression',
        explicitDatabaseUrl: `mysql://fixture:fixture@${REHEARSAL.hostname}/${REHEARSAL.database}`,
        credentialClass: 'runtime',
        processEnv: { NODE_ENV: 'test', APP_ENV: 'test' },
        rehearsal: { resourceId: REHEARSAL_RESOURCE_ID, purpose: REHEARSAL.purpose },
      }),
    ).toThrow('Rehearsal source binding refused');
  });
});
