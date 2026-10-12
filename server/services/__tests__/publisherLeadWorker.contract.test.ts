import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cataloguePublishers, leads } from '../../../drizzle/schema';
import type { ClaimedLeadDeliveryAttempt } from '../leadDeliveryService';

// All query/provider dependencies are controlled doubles. Never initialise
// the shared CI database for this connection-propagation regression.
const previousSkipDbInit = process.env.SKIP_DB_INIT;
process.env.SKIP_DB_INIT = '1';
afterAll(() => {
  if (previousSkipDbInit === undefined) delete process.env.SKIP_DB_INIT;
  else process.env.SKIP_DB_INIT = previousSkipDbInit;
});

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  defaultSelect: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('../../db', () => ({ db: { select: mocks.defaultSelect } }));
vi.mock('../../db-connection', () => ({ getDb: mocks.getDb }));
vi.mock('../../_core/emailService', () => ({
  EmailService: { sendBrandLeadNotification: mocks.sendEmail },
}));
vi.mock('../../_core/env', () => ({ ENV: { resendApiKey: 'controlled-test-provider' } }));
vi.mock('../publicLeadCaptureService', () => ({ capturePublicLead: vi.fn() }));

import { dispatchPublisherLeadDelivery, publisherLeadService } from '../publisherLeadService';
import { cataloguePublisherService } from '../cataloguePublisherService';

const claim = {
  channel: 'email',
  leadId: 41,
  recipientPublisherId: 7,
  deliveryKey: 'lead:41:primary:publisher:7',
  leadCustody: 'verified_customer_recipient',
} as ClaimedLeadDeliveryAttempt;

function workerDatabase(
  options: {
    missingLead?: boolean;
    wrongRecipient?: boolean;
    missingPublisher?: boolean;
    authorityKind?: 'developer_first_party' | 'platform_reference';
    missingEmail?: boolean;
    leadDeliveryMethod?: string;
  } = {},
) {
  const publisher = {
    id: 7,
    name: 'Controlled Developer',
    authorityKind: options.authorityKind ?? 'developer_first_party',
    developerOrganisationId: options.authorityKind === 'platform_reference' ? null : 3,
    publicContactEmail: options.missingEmail ? null : 'developer@example.com',
    isContactVerified: 1,
  };
  const lead = {
    id: 41,
    cataloguePublisherId: options.wrongRecipient ? 8 : 7,
    name: 'Controlled Buyer',
    email: 'buyer@example.com',
    phone: null,
    message: 'Please contact me.',
    propertyId: null,
    developmentId: 12,
    leadDeliveryMethod: options.leadDeliveryMethod ?? 'email',
    deliveryStatus: 'attention_required',
  };
  const queriedTables: unknown[] = [];
  const database = {
    select: vi.fn(() => ({
      from(table: unknown) {
        queriedTables.push(table);
        if (table !== leads && table !== cataloguePublishers) {
          throw new Error('Worker query exceeded its admitted tables.');
        }
        const rows =
          table === leads
            ? options.missingLead
              ? []
              : [lead]
            : options.missingPublisher
              ? []
              : [publisher];
        return { where: () => ({ limit: async () => rows }) };
      },
    })),
  };
  return { database, queriedTables };
}

describe('publisher delivery through the admitted worker connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDb.mockRejectedValue(
      new Error('A process cannot reuse a worker pool as a runtime pool.'),
    );
    mocks.defaultSelect.mockImplementation(() => {
      throw new Error('The dispatcher must use its supplied worker database.');
    });
    mocks.sendEmail.mockResolvedValue(true);
  });

  it('reads the lead and canonical publisher on the same worker connection and retains the delivery key', async () => {
    const { database, queriedTables } = workerDatabase();
    await expect(dispatchPublisherLeadDelivery(claim, database)).resolves.toEqual({
      status: 'delivered',
      providerReference: null,
    });
    expect(queriedTables).toEqual([leads, cataloguePublishers]);
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.defaultSelect).not.toHaveBeenCalled();
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      'developer@example.com',
      'Controlled Developer',
      expect.objectContaining({ leadId: 41, developmentId: 12 }),
      { idempotencyKey: claim.deliveryKey },
    );
  });

  it.each([
    ['missing lead', { missingLead: true }],
    ['wrong lead recipient', { wrongRecipient: true }],
    ['missing publisher', { missingPublisher: true }],
    ['platform reference', { authorityKind: 'platform_reference' as const }],
    ['missing destination', { missingEmail: true }],
  ])('rejects %s before any external send', async (_label, options) => {
    const { database } = workerDatabase(options);
    await expect(dispatchPublisherLeadDelivery(claim, database)).rejects.toThrow();
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.defaultSelect).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('preserves an uncertain provider outcome for the durable worker to reconcile', async () => {
    const { database } = workerDatabase();
    mocks.sendEmail.mockResolvedValue(false);
    await expect(dispatchPublisherLeadDelivery(claim, database)).rejects.toThrow(
      'Email provider acceptance could not be established.',
    );
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('does not query or send for a non-publisher email claim', async () => {
    const { database } = workerDatabase();
    await expect(
      dispatchPublisherLeadDelivery({ ...claim, recipientPublisherId: null }, database),
    ).resolves.toEqual({ status: 'pending' });
    expect(database.select).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('retains the initialized API database when no worker connection is supplied', async () => {
    const { database } = workerDatabase();
    mocks.defaultSelect.mockImplementation(database.select);
    mocks.getDb.mockResolvedValue(database);
    await expect(dispatchPublisherLeadDelivery(claim)).resolves.toMatchObject({
      status: 'delivered',
    });
    expect(mocks.defaultSelect).toHaveBeenCalledTimes(2);
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
  });

  it('retains API connection resolution for a standalone publisher lookup', async () => {
    const { database } = workerDatabase();
    mocks.getDb.mockResolvedValue(database);
    await expect(cataloguePublisherService.getPublisherById(7)).resolves.toMatchObject({
      id: 7,
      brandName: 'Controlled Developer',
    });
    expect(mocks.getDb).toHaveBeenCalledOnce();
    expect(mocks.defaultSelect).not.toHaveBeenCalled();
  });

  it('propagates a transport exception without attempting an immediate resend', async () => {
    const { database } = workerDatabase();
    mocks.sendEmail.mockRejectedValue(new Error('provider outcome unknown'));
    await expect(dispatchPublisherLeadDelivery(claim, database)).rejects.toThrow(
      'provider outcome unknown',
    );
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('keeps platform reference retries in operator custody using canonical authority', async () => {
    const { database } = workerDatabase({ authorityKind: 'platform_reference' });
    mocks.defaultSelect.mockImplementation(database.select);
    mocks.getDb.mockResolvedValue(database);
    await expect(publisherLeadService.retryPublisherLeadDelivery(41)).resolves.toEqual({
      success: false,
      status: 'attention_required',
    });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
