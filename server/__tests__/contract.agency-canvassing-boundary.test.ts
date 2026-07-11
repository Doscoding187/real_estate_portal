import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  SELLER_PROSPECT_STAGE_VALUES,
  SELLER_PROSPECT_TERMINAL_STAGE_VALUES,
  sellerProspectActivities,
  sellerProspects,
} from '../../drizzle/schema';
import { SELLER_PROSPECT_LISTING_HANDOFF_STAGES } from '../services/sellerProspectAccessService';

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
  });

  it('requires the guarded seller-prospect handoff rather than a parallel listing engine', () => {
    const canvassingRouter = readRepoFile('server/canvassingRouter.ts');
    const listingRouter = readRepoFile('server/listingRouter.ts');
    const appRouter = readRepoFile('server/routers.ts');

    expect(canvassingRouter).toContain('getSellerProspectActorScope');
    expect(canvassingRouter).toContain('requireSellerProspect');
    expect(canvassingRouter).toContain('Follow-ups cannot be scheduled for terminal seller prospects.');
    expect(listingRouter).toContain('sellerProspectId');
    expect(listingRouter).toContain('prepareSellerProspectListingConversion');
    expect(appRouter).toContain('canvassing: canvassingRouter');
  });
});
