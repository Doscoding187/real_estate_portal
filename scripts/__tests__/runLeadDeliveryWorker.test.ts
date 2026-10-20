import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClaimedLeadDeliveryAttempt } from '../../server/services/leadDeliveryService';

const previousSkipDbInit = process.env.SKIP_DB_INIT;
process.env.SKIP_DB_INIT = '1';
afterAll(() => {
  if (previousSkipDbInit === undefined) delete process.env.SKIP_DB_INIT;
  else process.env.SKIP_DB_INIT = previousSkipDbInit;
});

const mocks = vi.hoisted(() => ({
  database: { workerConnection: true },
  getWorkerDb: vi.fn(),
  shutdownDb: vi.fn(),
  runWorker: vi.fn(),
  backlog: vi.fn(),
  dispatchPublisher: vi.fn(),
}));

vi.mock('../../server/db-connection', () => ({
  getWorkerDb: mocks.getWorkerDb,
  shutdownDb: mocks.shutdownDb,
}));
vi.mock('../../server/_core/securityRuntimeConfiguration', () => ({
  assertNoDeployedTestConfiguration: vi.fn(),
}));
vi.mock('../../server/_core/hostedRuntimeConfiguration', () => ({
  assertHostedRuntimeConfiguration: vi.fn(),
}));
vi.mock('../../server/services/leadDeliveryService', () => ({
  runLeadDeliveryWorker: mocks.runWorker,
  getLeadDeliveryBacklog: mocks.backlog,
}));
vi.mock('../../server/services/publisherLeadService', () => ({
  dispatchPublisherLeadDelivery: mocks.dispatchPublisher,
}));

describe('one-shot hosted lead worker', () => {
  let baselineExitCode: number | undefined;

  beforeEach(() => {
    baselineExitCode = process.exitCode;
    process.exitCode = undefined;
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getWorkerDb.mockResolvedValue(mocks.database);
    mocks.shutdownDb.mockResolvedValue(undefined);
    mocks.backlog.mockResolvedValue({});
    mocks.dispatchPublisher.mockResolvedValue({ status: 'delivered' });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.exitCode = baselineExitCode;
  });

  it('passes its admitted database to publisher dispatch and drains the pool', async () => {
    const claim = {
      channel: 'email',
      recipientPublisherId: 7,
      leadCustody: 'verified_customer_recipient',
    } as ClaimedLeadDeliveryAttempt;
    mocks.runWorker.mockImplementation(async ({ database, dispatcher }) => {
      expect(database).toBe(mocks.database);
      await expect(dispatcher(claim)).resolves.toEqual({ status: 'delivered' });
      return { unknown: 0 };
    });
    await import('../runLeadDeliveryWorker');
    expect(mocks.dispatchPublisher).toHaveBeenCalledOnce();
    expect(mocks.dispatchPublisher).toHaveBeenCalledWith(claim, mocks.database);
    expect(mocks.backlog).toHaveBeenCalledOnce();
    expect(mocks.backlog).toHaveBeenCalledWith(mocks.database);
    expect(mocks.shutdownDb).toHaveBeenCalledOnce();
  });

  it.each([
    { channel: 'manual', leadCustody: 'verified_customer_recipient' },
    { channel: 'none', leadCustody: 'verified_customer_recipient' },
    { channel: 'email', leadCustody: 'platform_managed' },
  ])('leaves $channel / $leadCustody for operator attention without sending', async input => {
    mocks.runWorker.mockImplementation(async ({ dispatcher }) => {
      await expect(dispatcher({ ...input, recipientPublisherId: 7 })).resolves.toMatchObject({
        status: 'attention_required',
      });
      return { unknown: 0 };
    });
    await import('../runLeadDeliveryWorker');
    expect(mocks.dispatchPublisher).not.toHaveBeenCalled();
    expect(mocks.shutdownDb).toHaveBeenCalledOnce();
  });

  it('drains the worker database when the durable batch fails', async () => {
    mocks.runWorker.mockRejectedValue(new Error('durable batch failed'));
    await expect(import('../runLeadDeliveryWorker')).rejects.toThrow('durable batch failed');
    expect(mocks.shutdownDb).toHaveBeenCalledOnce();
  });

  it('exits clean when the run and backlog carry no attention states', async () => {
    mocks.runWorker.mockResolvedValue({ claimed: 1, completed: 1, unknown: 0 });
    mocks.backlog.mockResolvedValue({ completed: 1 });
    await import('../runLeadDeliveryWorker');
    expect(process.exitCode).toBeUndefined();
  });

  it.each([
    ['an unknown provider outcome in this run', { unknown: 1 }, {}],
    ['a durable unknown backlog', { unknown: 0 }, { unknown: 1 }],
    ['an exhausted retry budget', { unknown: 0 }, { exhausted: 1 }],
  ])('signals operator attention with exit code 2 for %s', async (_label, run, backlog) => {
    mocks.runWorker.mockResolvedValue({ claimed: 1, completed: 0, ...run });
    mocks.backlog.mockResolvedValue(backlog);
    await import('../runLeadDeliveryWorker');
    expect(process.exitCode).toBe(2);
    expect(mocks.shutdownDb).toHaveBeenCalledOnce();
  });
});
