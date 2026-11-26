import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { developmentPlaceAssignments, place } from '../../../drizzle/schema';
import {
  assertAssignableSuburbInTransaction,
  loadSuburbReadinessContext,
  recordCuratedSuburbInTransaction,
} from '../developmentPlaceAssignmentService';
import { validatePersistedSubmissionReadiness } from '../developmentSubmissionReadiness';

const PLACE_A = 'pl-place-01-00000000000000000000000a';
const PLACE_B = 'pl-place-01-00000000000000000000000b';

type Row = {
  id: number;
  placeId: string;
  reviewState: 'accepted' | 'withdrawn';
  phaseId: number | null;
};

/**
 * A transaction-aware fake: it answers the queries the helpers make by table and
 * applies updates/inserts to one in-memory assignment list. Predicates are not
 * interpreted; each test sets up exactly the rows the helper should see.
 */
function fakeTx(options: { placeRow: any; rows: Row[] }) {
  const state = { rows: options.rows.map(r => ({ ...r })), nextId: 100, lockedForUpdate: 0 };
  let withdrawQueue: number[] = [];
  const tx = {
    select() {
      let table: unknown;
      const chain: any = {
        from(t: unknown) {
          table = t;
          return chain;
        },
        leftJoin: () => chain,
        where: () => chain,
        limit: () =>
          Promise.resolve(
            table === place
              ? options.placeRow
                ? [options.placeRow]
                : []
              : state.rows.filter(r => r.reviewState === 'accepted').slice(0, 1),
          ),
        for(mode: string) {
          if (mode === 'update') state.lockedForUpdate += 1;
          const accepted = state.rows.filter(r => r.reviewState === 'accepted');
          withdrawQueue = accepted.map(r => r.id);
          return Promise.resolve(accepted);
        },
        then(resolve: (v: unknown) => unknown) {
          return Promise.resolve(
            table === developmentPlaceAssignments
              ? state.rows.filter(r => r.reviewState === 'accepted')
              : [],
          ).then(resolve);
        },
      };
      return chain;
    },
    update() {
      return {
        set(values: Partial<Row>) {
          return {
            where() {
              const id = withdrawQueue.shift();
              const row = state.rows.find(r => r.id === id);
              if (row) Object.assign(row, values);
              return Promise.resolve();
            },
          };
        },
      };
    },
    insert() {
      return {
        values(values: any) {
          state.rows.push({
            id: state.nextId++,
            placeId: values.placeId,
            reviewState: values.reviewState,
            phaseId: values.phaseId ?? null,
          });
          return Promise.resolve();
        },
      };
    },
  };
  return { tx, state };
}

const goodPlace = (name = 'North Riding', scope = 'locality') => ({
  placeId: PLACE_B,
  searchScope: scope,
  name,
});
const accepted = (id: number, placeId: string, phaseId: number | null = null): Row => ({
  id,
  placeId,
  reviewState: 'accepted',
  phaseId,
});
const input = { developmentId: 7, placeId: PLACE_B, reviewerUserId: 1 };

describe('recordCuratedSuburbInTransaction', () => {
  it('records the suburb as the single accepted site row when there was none', async () => {
    const { tx, state } = fakeTx({ placeRow: goodPlace(), rows: [] });
    expect(await recordCuratedSuburbInTransaction(tx, input)).toEqual({ changed: true });
    expect(state.rows.filter(r => r.reviewState === 'accepted').map(r => r.placeId)).toEqual([PLACE_B]);
    expect(state.lockedForUpdate).toBe(1);
  });

  it('same place: nothing changes', async () => {
    const { tx, state } = fakeTx({ placeRow: goodPlace(), rows: [accepted(1, PLACE_B)] });
    expect(await recordCuratedSuburbInTransaction(tx, input)).toEqual({ changed: false });
    expect(state.rows).toEqual([accepted(1, PLACE_B)]);
  });

  it('different place: every accepted site row (any phase) is withdrawn and exactly one accepted row remains', async () => {
    const { tx, state } = fakeTx({
      placeRow: goodPlace(),
      rows: [accepted(1, PLACE_A), accepted(2, PLACE_A, 5)],
    });
    expect(await recordCuratedSuburbInTransaction(tx, input)).toEqual({ changed: true });
    const open = state.rows.filter(r => r.reviewState === 'accepted');
    expect(open).toHaveLength(1);
    expect(open[0].placeId).toBe(PLACE_B);
    expect(state.rows.filter(r => r.reviewState === 'withdrawn')).toHaveLength(2);
  });

  it('a second call (a concurrent publish serialised behind the lock) cannot leave two accepted rows', async () => {
    const { tx, state } = fakeTx({ placeRow: goodPlace(), rows: [accepted(1, PLACE_A)] });
    await recordCuratedSuburbInTransaction(tx, input);
    await recordCuratedSuburbInTransaction(tx, input);
    expect(state.rows.filter(r => r.reviewState === 'accepted')).toHaveLength(1);
    expect(state.lockedForUpdate).toBe(2);
  });

  it.each([
    ['an unknown or inactive place', null, /active, searchable suburb/],
    ['a province or city', goodPlace('Gauteng', 'province'), /active, searchable suburb/],
    ['an informal settlement', goodPlace('Kya Sands Informal Settlement'), /informal settlement/],
  ])('rejects %s before touching the old assignment (so the publish rolls back)', async (_label, placeRow, message) => {
    const { tx, state } = fakeTx({ placeRow, rows: [accepted(1, PLACE_A)] });
    await expect(recordCuratedSuburbInTransaction(tx, input)).rejects.toThrow(message);
    expect(state.rows).toEqual([accepted(1, PLACE_A)]);
    expect(state.lockedForUpdate).toBe(0);
  });

  it('rejects a malformed place id', async () => {
    const { tx } = fakeTx({ placeRow: goodPlace(), rows: [] });
    await expect(assertAssignableSuburbInTransaction(tx, 'nope')).rejects.toThrow(/not a valid place/);
  });
});

describe('suburb readiness context and the legacy rule', () => {
  const base = {
    name: 'Harbour Heights',
    address: '1 Harbour Road',
    latitude: '-33.9',
    longitude: '18.4',
    description:
      'A valid persisted description that contains more than fifty characters for submission.',
    ownershipType: 'sectional-title',
    developmentType: 'residential',
    transactionType: 'for_sale',
    images: JSON.stringify([{ url: 'https://example.com/hero.jpg' }]),
    highlights: JSON.stringify(['One', 'Two', 'Three']),
  };
  const unit = {
    name: 'Two bedroom',
    label: null,
    isActive: 1,
    totalUnits: 10,
    availableUnits: 10,
    reservedUnits: 0,
    priceFrom: '1000000',
    priceTo: null,
    basePriceFrom: '1000000',
    basePriceTo: null,
    monthlyRentFrom: null,
    monthlyRentTo: null,
    startingBid: null,
    auctionStartDate: null,
    auctionEndDate: null,
    reservePrice: null,
  };
  const run = (estateSpecs: unknown, ctx?: { suburbPlaceValid: boolean; hasAcceptedSiteAssignment: boolean }) =>
    validatePersistedSubmissionReadiness({ ...base, estateSpecs } as never, [unit] as never, ctx).map(e => e.field);
  const chosen = JSON.stringify({ suburbPlaceId: PLACE_B });

  it('a chosen suburb that does not resolve is not enough', () => {
    expect(run(chosen, { suburbPlaceValid: false, hasAcceptedSiteAssignment: false })).toEqual(['suburb']);
    expect(run(chosen, { suburbPlaceValid: true, hasAcceptedSiteAssignment: false })).toEqual([]);
  });

  it('legacy: an accepted site assignment satisfies the requirement without estateSpecs', () => {
    expect(run(null, { suburbPlaceValid: false, hasAcceptedSiteAssignment: true })).toEqual([]);
    expect(run(null, { suburbPlaceValid: false, hasAcceptedSiteAssignment: false })).toEqual(['suburb']);
    // An invalid chosen suburb is also covered by an existing accepted assignment.
    expect(run(chosen, { suburbPlaceValid: false, hasAcceptedSiteAssignment: true })).toEqual([]);
  });

  it('without a context the suburb only has to be present', () => {
    expect(run(chosen)).toEqual([]);
    expect(run(null)).toEqual(['suburb']);
  });

  it('loadSuburbReadinessContext reports validity and any accepted site row', async () => {
    const withRow = fakeTx({ placeRow: goodPlace(), rows: [accepted(1, PLACE_A)] });
    expect(await loadSuburbReadinessContext(withRow.tx, { id: 7, estateSpecs: chosen })).toEqual({
      suburbPlaceValid: true,
      hasAcceptedSiteAssignment: true,
    });
    const none = fakeTx({ placeRow: null, rows: [] });
    expect(await loadSuburbReadinessContext(none.tx, { id: 7, estateSpecs: chosen })).toEqual({
      suburbPlaceValid: false,
      hasAcceptedSiteAssignment: false,
    });
    expect(await loadSuburbReadinessContext(none.tx, { id: 7, estateSpecs: null })).toEqual({
      suburbPlaceValid: false,
      hasAcceptedSiteAssignment: false,
    });
  });
});

describe('who records the suburb', () => {
  const read = (p: string) => readFileSync(path.resolve(process.cwd(), p), 'utf8');

  it('only the curated publish transaction records an accepted assignment; developer paths do not', () => {
    const service = read('server/services/developmentService.ts');
    expect(service.match(/recordCuratedSuburbInTransaction\(/g)).toHaveLength(1);
    const curated = service.slice(
      service.indexOf('export async function publishPlatformCuratedDevelopmentInTransaction'),
      service.indexOf('async function approveDevelopment'),
    );
    expect(curated).toContain('recordCuratedSuburbInTransaction(');
    expect(curated).toContain('The suburb could not be recorded:');
    expect(read('server/developerRouter.ts')).not.toContain('recordCuratedSuburbInTransaction');
  });

  it('the client no longer assigns after publishing, and the admin mutation has no replace flag', () => {
    expect(read('client/src/components/development-wizard/phases/FinalisationPhase.tsx')).not.toContain(
      'adminReviewDevelopmentPlaceAssignment',
    );
    expect(read('server/adminRouter.ts')).not.toContain('replaceExisting');
  });

  it('the reviewer UI offers the developer-chosen suburb as a suggestion only; the reviewer records the assignment', () => {
    const page = read('client/src/pages/admin/DevelopmentOversight.tsx');
    expect(page).toContain('Suggested by the publisher');
    expect(page).toContain('Use this suggestion');
    // The suggestion only fills the selector; recording still goes through the review button.
    expect(page).toContain('recordPlaceAssignment');
  });
});
