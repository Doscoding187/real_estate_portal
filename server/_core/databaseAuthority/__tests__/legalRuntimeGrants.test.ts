import { describe, expect, it, vi } from 'vitest';
import {
  legalRuntimeGrantExecutionPlan,
  executeLegalRuntimeGrantPlan,
  applyLegalRuntimeGrants,
} from '../legalRuntimeGrants';

describe('retained legal runtime grant release', () => {
  it('refuses to build the B15 plan after the canonical inventory changes', () => {
    expect(() => legalRuntimeGrantExecutionPlan()).toThrow(
      'Place runtime grant plan refused: canonical table inventory changed.',
    );
  });

  it('refuses before resolving credentials or opening a protected connection', async () => {
    await expect(
      applyLegalRuntimeGrants({
        adminDatabaseUrl: 'not-a-credential',
        planDigest: 'untrusted',
        acknowledgement: 'unapproved',
        observe: vi.fn(),
      }),
    ).rejects.toThrow('Place runtime grant plan refused: canonical table inventory changed.');
  });

  it('closes without queries or grants when an old execution plan meets the changed model', async () => {
    const connection = {
      query: vi.fn(async () => [[], []]),
      execute: vi.fn(async () => [[], []]),
      end: vi.fn(async () => {}),
    };
    const verifyPhysical = vi.fn(async () => {});
    const observe = vi.fn();

    await expect(
      executeLegalRuntimeGrantPlan(
        connection as any,
        {} as ReturnType<typeof legalRuntimeGrantExecutionPlan>,
        verifyPhysical,
        observe,
      ),
    ).rejects.toMatchObject({
      safeToReplay: false,
      failureStage: 'validate-plan',
      progress: { outcome: 'not-started', completedStatements: 0 },
    });

    expect(connection.query).not.toHaveBeenCalled();
    expect(connection.execute).not.toHaveBeenCalled();
    expect(verifyPhysical).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
    expect(connection.end).toHaveBeenCalledOnce();
  });
});
