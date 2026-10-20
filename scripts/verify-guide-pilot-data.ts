/**
 * Read-only launch verification for the suburb guide pilot.
 *
 * It answers one question: does the pilot suburb have enough live, publicly eligible content
 * for its guide to be worth indexing? It reads through the same services the public page uses,
 * so the reported counts are the counts a visitor sees, not raw table rows.
 *
 * It never writes, migrates, seeds or repairs. It prints a sanitized target classification and
 * fingerprint and never prints a credential-bearing URL.
 *
 * Run it against the approved target for the release window:
 *   pnpm tsx scripts/verify-guide-pilot-data.ts
 */
import { locationPagesService } from '../server/services/locationPagesService';
import { findAgentsServingLocation } from '../server/services/agentPublicProfileService';
import { getDb } from '../server/db-connection';
import { getPublishedSuburbGuidePaths, SUBURB_GUIDE_PILOT } from '../shared/suburbGuidePolicy';

/**
 * A pilot guide is worth indexing when it has enough live content to answer a property
 * question on its own. Listing coverage keeps the guide useful; the commercial sections
 * may legitimately be empty because the guide renders an honest empty state for them.
 */
export const PILOT_MINIMUM_LISTINGS = 10;
export const PILOT_MINIMUM_PRICE_OBSERVATIONS = 10;
export const PILOT_MINIMUM_DEVELOPMENTS = 1;
export const PILOT_MINIMUM_AGENCIES = 1;

type CheckOutcome = {
  name: string;
  value: number | null;
  minimum: number;
  sufficient: boolean;
  note: string;
};

function count(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function verifyPilotData(
  provinceSlug: string,
  citySlug: string,
  suburbSlug: string,
): Promise<{
  outcomes: CheckOutcome[];
  sufficient: boolean;
  suburbName: string | null;
}> {
  const db = await getDb();
  if (!db) throw new Error('No database connection is available for this target.');

  const data = (await locationPagesService.getSuburbData(
    provinceSlug,
    citySlug,
    suburbSlug,
  )) as any;
  const stats = data?.stats ?? {};
  const marketInsights = data?.marketInsights ?? null;
  const developments = data?.developments ?? null;

  const saleCount = count(stats.saleCount);
  const rentalCount = count(stats.rentalCount);
  const pricedCount =
    count(marketInsights?.sale?.pricedListingCount) +
    count(marketInsights?.rent?.pricedListingCount);
  const developmentCount = count(developments?.total);

  const suburbId = Number(data?.suburb?.id);
  const professionals =
    Number.isSafeInteger(suburbId) && suburbId > 0
      ? await findAgentsServingLocation(db, 'suburb', suburbId)
      : [];
  const agencyNames = new Set(
    professionals
      .map(professional =>
        String((professional as any)?.agencyName || '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );
  const agencyCount = agencyNames.size;

  const outcomes: CheckOutcome[] = [
    {
      name: 'Listings for sale',
      value: saleCount,
      minimum: PILOT_MINIMUM_LISTINGS,
      sufficient: saleCount >= PILOT_MINIMUM_LISTINGS,
      note: 'Publicly eligible sale listings for this exact suburb.',
    },
    {
      name: 'Listings to rent',
      value: rentalCount,
      minimum: PILOT_MINIMUM_LISTINGS,
      sufficient: rentalCount >= PILOT_MINIMUM_LISTINGS,
      note: 'Publicly eligible rental listings for this exact suburb.',
    },
    {
      name: 'Priced observations',
      value: pricedCount,
      minimum: PILOT_MINIMUM_PRICE_OBSERVATIONS,
      sufficient: pricedCount >= PILOT_MINIMUM_PRICE_OBSERVATIONS,
      note: 'Required before any asking-price median may be shown.',
    },
    {
      name: 'Published developments',
      value: developmentCount,
      minimum: PILOT_MINIMUM_DEVELOPMENTS,
      sufficient: developmentCount >= PILOT_MINIMUM_DEVELOPMENTS,
      note: 'An empty developments section is honest, not a defect.',
    },
    {
      name: 'Agency affiliations',
      value: agencyCount,
      minimum: PILOT_MINIMUM_AGENCIES,
      sufficient: agencyCount >= PILOT_MINIMUM_AGENCIES,
      note: 'An empty agencies section is honest, not a defect.',
    },
  ];

  return {
    outcomes,
    sufficient: outcomes
      .filter(outcome => !outcome.note.includes('honest, not a defect'))
      .every(outcome => outcome.sufficient),
    suburbName: data?.suburb?.name ?? null,
  };
}

async function main() {
  let db: Awaited<ReturnType<typeof getDb>>;
  try {
    db = await getDb();
  } catch (error) {
    console.error(
      `The approved database target could not be reached: ${(error as Error).message}. Run this check inside the release window against the approved target.`,
    );
    process.exitCode = 2;
    return;
  }
  if (!db) {
    console.error('No database connection is available for this target.');
    process.exitCode = 2;
    return;
  }

  const { provinceSlug, citySlug, suburbSlug } = SUBURB_GUIDE_PILOT;
  const publishedPaths = getPublishedSuburbGuidePaths();
  console.log('Guide pilot data verification (read-only)\n');
  console.log(`Pilot route: /${provinceSlug}/${citySlug}/${suburbSlug}`);
  console.log(
    `Published in the guide sitemap: ${publishedPaths.length > 0 ? 'yes' : 'no'} (${publishedPaths.join(', ') || 'none'})`,
  );

  let result: Awaited<ReturnType<typeof verifyPilotData>>;
  try {
    result = await verifyPilotData(provinceSlug, citySlug, suburbSlug);
  } catch (error) {
    console.error(`The pilot suburb could not be read: ${(error as Error).message}`);
    process.exitCode = 2;
    return;
  }

  console.log(`\nSuburb: ${result.suburbName ?? 'not found'}`);
  for (const outcome of result.outcomes) {
    const value = outcome.value === null ? 'unknown' : String(outcome.value);
    console.log(
      `  ${outcome.sufficient ? 'PASS' : 'FAIL'}  ${outcome.name}: ${value} (minimum ${outcome.minimum}) — ${outcome.note}`,
    );
  }

  console.log(
    `\nResult: ${
      result.sufficient
        ? 'the pilot has enough live content to index.'
        : 'the pilot does not yet have enough live content to index. Keep the route noindex until it does.'
    }`,
  );
  if (!result.sufficient) process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].includes('verify-guide-pilot-data')) {
  void main();
}
