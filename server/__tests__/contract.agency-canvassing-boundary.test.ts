import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  SELLER_PROSPECT_CONTACT_CHANNEL_VALUES,
  SELLER_PROSPECT_CONTACT_OUTCOME_VALUES,
  SELLER_PROSPECT_MANDATE_TYPE_VALUES,
  SELLER_PROSPECT_STAGE_VALUES,
  SELLER_PROSPECT_TERMINAL_STAGE_VALUES,
  sellerMandateComparables,
  sellerMandateOperations,
  sellerProspectActivities,
  sellerProspects,
} from '../../drizzle/schema';
import { getMandateReadiness, SELLER_PROSPECT_LISTING_HANDOFF_STAGES } from '../services/sellerProspectAccessService';

const repoRoot = process.cwd();
const readRepoFile = (relativePath: string) =>
  readFileSync(path.resolve(repoRoot, relativePath), 'utf8');

describe('agency canvassing boundary contract', () => {
  it('keeps seller prospects in a private, agency-owned model with explicit terminal stages', () => {
    expect(getTableName(sellerProspects)).toBe('seller_prospects');
    expect(getTableName(sellerProspectActivities)).toBe('seller_prospect_activities');
    expect(SELLER_PROSPECT_STAGE_VALUES).toEqual(
      expect.arrayContaining(['qualified', 'mandate_won', 'converted_to_listing']),
    );
    expect(SELLER_PROSPECT_TERMINAL_STAGE_VALUES).toEqual(
      expect.arrayContaining(['converted_to_listing', 'not_interested', 'lost', 'archived']),
    );
    expect(SELLER_PROSPECT_LISTING_HANDOFF_STAGES).toEqual(['qualified', 'mandate_won']);
    expect(SELLER_PROSPECT_CONTACT_CHANNEL_VALUES).toEqual(
      expect.arrayContaining(['call', 'whatsapp', 'email', 'door_knock']),
    );
    expect(SELLER_PROSPECT_CONTACT_OUTCOME_VALUES).toEqual(
      expect.arrayContaining(['reached', 'no_answer', 'follow_up_required', 'not_interested']),
    );
    expect(SELLER_PROSPECT_MANDATE_TYPE_VALUES).toEqual(
      expect.arrayContaining(['sole', 'open', 'dual', 'auction']),
    );
  });

  it('requires the guarded seller-prospect handoff rather than a parallel listing engine', () => {
    const canvassingRouter = readRepoFile('server/canvassingRouter.ts');
    const listingRouter = readRepoFile('server/listingRouter.ts');
    const appRouter = readRepoFile('server/routers.ts');

    expect(canvassingRouter).toContain('getSellerProspectActorScope');
    expect(canvassingRouter).toContain('requireSellerProspect');
    expect(canvassingRouter).toContain('Follow-ups cannot be scheduled for terminal seller prospects.');
    expect(canvassingRouter).toContain('recordContactAttempt');
    expect(canvassingRouter).toContain('Record the next action for every active seller prospect.');
    expect(canvassingRouter).toContain('updateMandate');
    expect(listingRouter).toContain('sellerProspectId');
    expect(listingRouter).toContain('prepareSellerProspectListingConversion');
    expect(appRouter).toContain('canvassing: canvassingRouter');
  });

  it('unifies seller work with My Day and keeps mandate evidence private', () => {
    const agencyRouter = readRepoFile('server/agencyRouter.ts');
    const workspace = readRepoFile(
      'client/src/features/agency/viewings/AgencyViewingsWorkspace.tsx',
    );
    const migration = readRepoFile('server/migrations/0067_close_seller_acquisition_loop.sql');
    const mandateMigration = readRepoFile('server/migrations/0069_create_agency_mandate_operations_mvp.sql');

    expect(agencyRouter).toContain('overdueSellerFollowUps');
    expect(agencyRouter).toContain('dueTodaySellerFollowUps');
    expect(workspace).toContain('Overdue Seller Follow-ups');
    expect(workspace).toContain('Seller Follow-ups Due Today');
    expect(migration).toContain('first_contacted_at');
    expect(migration).toContain('mandate_checklist');
    expect(getTableName(sellerMandateOperations)).toBe('seller_mandate_operations');
    expect(getTableName(sellerMandateComparables)).toBe('seller_mandate_comparables');
    expect(mandateMigration).toContain('private_storage_reference');
    expect(agencyRouter).toContain('mandateWork');
  });

  it('does not permit listing readiness from incomplete private mandate evidence', () => {
    const readiness = getMandateReadiness(
      { requirements: {}, documentStatus: 'pending', status: 'preparing' },
      { mandateType: 'sole', mandateSignedAt: null, mandateExpiresAt: null, agreedAskingPrice: null },
    );
    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toEqual(expect.arrayContaining(['mandateDocumentRecorded', 'agreedPriceRecorded']));
  });
});
