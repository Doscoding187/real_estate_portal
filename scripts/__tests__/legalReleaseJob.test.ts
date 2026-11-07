import { describe, expect, it, vi } from 'vitest';
import {
  LEGAL_JOB_ENV,
  LegalReleaseJobFailure,
  legalReleaseFailureLine,
  runLegalReleaseJob,
  type LegalReleaseJobDeps,
} from '../legalReleaseJob';
import { stableDigest } from '../../server/_core/databaseAuthority/dataAdapters/common';

const FINGERPRINT = 'ab'.repeat(32);
const packet = {
  formatVersion: 1,
  sourceHead: 'c'.repeat(40),
  manifestDigest: 'd'.repeat(64),
  expectedPreviousBundleId: null,
  validUntil: '2026-11-08T10:30:00.000Z',
  plannedEffectiveAt: '2026-11-08T10:00:00.000Z',
  candidate: { bundleId: 'legal-v1' },
  approval: {},
  terms: 'T',
  privacy: 'P',
};
const PACKET_DIGEST = stableDigest(packet);
const URL_SECRET = 'mysql://user:hunter2@host.example/db';

function evidence(operation: string, state: string) {
  return {
    operation,
    state,
    planDigest: 'p'.repeat(64),
    targetFingerprintHash: FINGERPRINT,
    sourceHead: packet.sourceHead,
    bundleId: 'legal-v1',
    activeBundleId: 'legal-v1',
    effectiveAt: packet.plannedEffectiveAt,
    validUntil: packet.validUntil,
  };
}

function makeDeps() {
  const calls: Array<{ operation: string; credential: string; ack?: string; digest?: string }> =
    [];
  const preparePacket = vi.fn(() => packet) as any;
  const install = vi.fn(async (input: any) => {
    const operation = input.decision.operation;
    calls.push({ operation, credential: input.credential, digest: input.expectedPlanDigest });
    return evidence(
      operation,
      operation === 'legal-release-plan' ? 'prepared_not_installed' : 'verified',
    );
  }) as any;
  const deps: LegalReleaseJobDeps = {
    root: '/repo',
    preparePacket,
    install,
    runOperation: async (operation, credential, ack, run) => {
      const out = await run({
        authority: {},
        decision: { operation },
        connection: { credential, ack },
      });
      const last = calls[calls.length - 1];
      if (last) {
        last.credential = credential;
        last.ack = ack;
      }
      return out;
    },
  };
  return { deps, calls, preparePacket, install };
}

const baseEnv = {
  LEGAL_EFFECTIVE_AT: '2026-11-08T10:00:00.000Z',
  LEGAL_VALID_UNTIL: '2026-11-08T10:30:00.000Z',
  LEGAL_PREVIOUS_BUNDLE: 'none',
};

describe('legal release job wrapper', () => {
  it('plan prints digests and required acknowledgement, no URL', async () => {
    const { deps, calls, preparePacket } = makeDeps();
    const lines = await runLegalReleaseJob({ ...baseEnv, LEGAL_RELEASE_MODE: 'plan' }, deps);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      packetDigest: PACKET_DIGEST,
      planDigest: 'p'.repeat(64),
      requiredAcknowledgement: `CONFIRM_LEGAL_RELEASE_APPLY_${FINGERPRINT.slice(0, 16)}`,
      sourceHead: packet.sourceHead,
      bundleId: 'legal-v1',
      plannedEffectiveAt: packet.plannedEffectiveAt,
      validUntil: packet.validUntil,
    });
    expect(preparePacket).toHaveBeenCalledWith({
      root: '/repo',
      plannedEffectiveAt: baseEnv.LEGAL_EFFECTIVE_AT,
      validUntil: baseEnv.LEGAL_VALID_UNTIL,
      expectedPreviousBundleId: null,
    });
    expect(calls.map(c => [c.operation, c.credential])).toEqual([
      ['legal-release-plan', 'read-only'],
    ]);
    expect(JSON.stringify(lines)).not.toMatch(/mysql:\/\//);
  });

  it('passes a named previous bundle through', async () => {
    const { deps, preparePacket } = makeDeps();
    await runLegalReleaseJob(
      { ...baseEnv, LEGAL_PREVIOUS_BUNDLE: ' legal-v0 ', LEGAL_RELEASE_MODE: 'plan' },
      deps,
    );
    expect(preparePacket.mock.calls[0][0].expectedPreviousBundleId).toBe('legal-v0');
  });

  const applyEnv = {
    ...baseEnv,
    LEGAL_RELEASE_MODE: 'apply',
    LEGAL_PACKET_DIGEST: PACKET_DIGEST,
    LEGAL_PLAN_DIGEST: 'p'.repeat(64),
    LEGAL_ACK: 'CONFIRM_X',
  };

  it('apply refuses a wrong packet digest before any database call', async () => {
    const { deps, install } = makeDeps();
    await expect(
      runLegalReleaseJob({ ...applyEnv, LEGAL_PACKET_DIGEST: 'e'.repeat(64) }, deps),
    ).rejects.toMatchObject({ stage: 'packet-digest' });
    expect(install).not.toHaveBeenCalled();
  });

  it.each(['LEGAL_PLAN_DIGEST', 'LEGAL_ACK', 'LEGAL_PACKET_DIGEST'])(
    'apply refuses missing/placeholder %s',
    async name => {
      for (const bad of [undefined, '', '  ', 'undefined', 'null']) {
        const { deps, install } = makeDeps();
        await expect(runLegalReleaseJob({ ...applyEnv, [name]: bad }, deps)).rejects.toBeInstanceOf(
          LegalReleaseJobFailure,
        );
        expect(install).not.toHaveBeenCalled();
      }
    },
  );

  it('apply calls apply (migration, plan digest, ack) then read-only verify', async () => {
    const { deps, calls } = makeDeps();
    const lines = await runLegalReleaseJob(applyEnv, deps);
    expect(calls).toEqual([
      {
        operation: 'legal-release-apply',
        credential: 'migration',
        ack: 'CONFIRM_X',
        digest: 'p'.repeat(64),
      },
      { operation: 'legal-release-verify', credential: 'read-only', ack: undefined, digest: undefined },
    ]);
    expect(lines.map(l => l.event)).toEqual([
      'legal-release-job-completed',
      'legal-release-job-verified',
    ]);
  });

  it('apply does not verify when apply fails', async () => {
    const { deps, install } = makeDeps();
    install.mockRejectedValueOnce(new Error(`driver ${URL_SECRET}`));
    await expect(runLegalReleaseJob(applyEnv, deps)).rejects.toMatchObject({ stage: 'apply' });
    expect(install).toHaveBeenCalledTimes(1);
  });

  it('verify mode only verifies, read-only', async () => {
    const { deps, calls } = makeDeps();
    const lines = await runLegalReleaseJob({ ...baseEnv, LEGAL_RELEASE_MODE: 'verify' }, deps);
    expect(calls.map(c => [c.operation, c.credential])).toEqual([
      ['legal-release-verify', 'read-only'],
    ]);
    expect(lines[0]).toMatchObject({ event: 'legal-release-job-verified', state: 'verified' });
  });

  it.each([undefined, '', 'destroy', 'undefined', 'null'])('refuses mode %s', async mode => {
    const { deps, preparePacket } = makeDeps();
    await expect(
      runLegalReleaseJob({ ...baseEnv, LEGAL_RELEASE_MODE: mode }, deps),
    ).rejects.toBeInstanceOf(LegalReleaseJobFailure);
    expect(preparePacket).not.toHaveBeenCalled();
  });

  it('failures expose only a stage, never driver text or URLs', async () => {
    const { deps, preparePacket, install } = makeDeps();
    preparePacket.mockImplementationOnce(() => {
      throw new Error(`boom ${URL_SECRET}`);
    });
    const prepFail = await runLegalReleaseJob({ ...baseEnv, LEGAL_RELEASE_MODE: 'plan' }, deps).catch(
      e => e,
    );
    expect(prepFail).toMatchObject({ stage: 'prepare' });
    install.mockRejectedValueOnce(new Error(`boom ${URL_SECRET}`));
    const planFail = await runLegalReleaseJob({ ...baseEnv, LEGAL_RELEASE_MODE: 'plan' }, deps).catch(
      e => e,
    );
    for (const failure of [prepFail, planFail]) {
      expect(failure.message).not.toContain('hunter2');
      expect(failure.message).not.toContain('mysql://');
    }
  });

  it('prints full apply evidence before verify; verify failure reports applyCommitted', async () => {
    const { deps, install } = makeDeps();
    const full = {
      ...evidence('legal-release-apply', 'committed'),
      transactionCommitDispatchedAt: '2026-11-08T10:01:00.000Z',
      transactionCommitAcknowledgedAt: '2026-11-08T10:01:01.000Z',
      activationChanged: true,
      contentSha256: 'f'.repeat(64),
      manifestDigest: 'd'.repeat(64),
      approvalReference: 'REF-1',
    };
    install.mockResolvedValueOnce(full);
    install.mockRejectedValueOnce(new Error(`driver ${URL_SECRET}`));
    const emitted: Array<Record<string, unknown>> = [];
    const failure = await runLegalReleaseJob(applyEnv, deps, line => emitted.push(line)).catch(
      e => e,
    );
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      event: 'legal-release-job-completed',
      transactionCommitDispatchedAt: full.transactionCommitDispatchedAt,
      transactionCommitAcknowledgedAt: full.transactionCommitAcknowledgedAt,
      activationChanged: true,
      targetFingerprintHash: FINGERPRINT,
      contentSha256: full.contentSha256,
      manifestDigest: full.manifestDigest,
      approvalReference: 'REF-1',
    });
    expect(failure).toMatchObject({ stage: 'post-apply-verify' });
    const line = legalReleaseFailureLine(failure);
    expect(line).toMatchObject({
      stage: 'post-apply-verify',
      applyCommitted: true,
      applyState: 'committed',
      safeToReplay: false,
    });
    expect(JSON.stringify(line)).not.toContain('hunter2');
  });

  it('failure line flags unknown outcomes and only passes fixed library messages', async () => {
    class LegalReleaseOutcomeUnknown extends Error {
      readonly unsafeToReplay = true;
      constructor() {
        super('Legal release COMMIT outcome is unknown.');
        this.name = 'LegalReleaseOutcomeUnknown';
      }
    }
    const { deps, install } = makeDeps();
    install.mockRejectedValueOnce(new LegalReleaseOutcomeUnknown());
    const unknown = await runLegalReleaseJob(applyEnv, deps).catch(e => e);
    expect(legalReleaseFailureLine(unknown)).toMatchObject({
      stage: 'apply',
      errorName: 'LegalReleaseOutcomeUnknown',
      outcomeUnknown: true,
      safeToReplay: false,
      message: 'Legal release COMMIT outcome is unknown.',
    });
    install.mockRejectedValueOnce(new Error(`ER_ACCESS_DENIED ${URL_SECRET}`));
    const driver = legalReleaseFailureLine(
      await runLegalReleaseJob(applyEnv, deps).catch(e => e),
    );
    expect(driver).toMatchObject({ outcomeUnknown: false });
    expect(driver).not.toHaveProperty('message');
    expect(JSON.stringify(driver)).not.toContain('hunter2');
  });

  it('refuses at start when an approved credential class is set', async () => {
    const { deps, preparePacket } = makeDeps();
    const failure = await runLegalReleaseJob(
      { ...baseEnv, LEGAL_RELEASE_MODE: 'plan', DATABASE_AUTHORITY_APPROVED_CREDENTIAL_CLASS: 'migration' },
      deps,
    ).catch(e => e);
    expect(failure).toMatchObject({ stage: 'validation' });
    expect(preparePacket).not.toHaveBeenCalled();
  });

  it('refuses at start under GITHUB_ACTIONS', async () => {
    const { deps, preparePacket } = makeDeps();
    const failure = await runLegalReleaseJob(
      { ...baseEnv, LEGAL_RELEASE_MODE: 'plan', GITHUB_ACTIONS: 'true' },
      deps,
    ).catch(e => e);
    expect(failure).toMatchObject({ stage: 'validation' });
    expect(preparePacket).not.toHaveBeenCalled();
  });

  it('exposes the env names used', () => {
    expect(Object.values(LEGAL_JOB_ENV).sort()).toEqual(
      [
        'LEGAL_ACK',
        'LEGAL_EFFECTIVE_AT',
        'LEGAL_PACKET_DIGEST',
        'LEGAL_PLAN_DIGEST',
        'LEGAL_PREVIOUS_BUNDLE',
        'LEGAL_RELEASE_MODE',
        'LEGAL_VALID_UNTIL',
      ].sort(),
    );
  });
});
