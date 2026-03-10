import path from 'path';

import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

import { developerBrandProfiles, developments } from '../../drizzle/schema';
import { getDb } from '../db';
import {
  getBrandPartnershipDetails,
  getDevelopmentAccessDetails,
  listDevelopmentAccessDetails,
} from '../services/distributionAccessReadService';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const SCENARIOS = [
  {
    key: 'visible_unpartnered',
    brandSlug: 'dist-access-sanity-visible-unpartnered',
    developmentSlug: 'dist-access-sanity-visible-unpartnered-dev',
    expected: {
      inventoryState: 'listed',
      submitReady: false,
      brandPartnershipStatus: 'pending',
      developmentAccessStatus: 'listed',
      legacyFallbackUsed: true,
    },
  },
  {
    key: 'included_not_ready',
    brandSlug: 'dist-access-sanity-included-not-ready',
    developmentSlug: 'dist-access-sanity-included-not-ready-dev',
    expected: {
      inventoryState: 'accessible',
      submitReady: false,
      brandPartnershipStatus: 'active',
      developmentAccessStatus: 'included',
      legacyFallbackUsed: false,
    },
  },
  {
    key: 'ready_not_enabled',
    brandSlug: 'dist-access-sanity-ready-not-enabled',
    developmentSlug: 'dist-access-sanity-ready-not-enabled-dev',
    expected: {
      inventoryState: 'ready',
      submitReady: false,
      brandPartnershipStatus: 'active',
      developmentAccessStatus: 'included',
      legacyFallbackUsed: false,
    },
  },
  {
    key: 'enabled',
    brandSlug: 'dist-access-sanity-enabled',
    developmentSlug: 'dist-access-sanity-enabled-dev',
    expected: {
      inventoryState: 'enabled',
      submitReady: true,
      brandPartnershipStatus: 'active',
      developmentAccessStatus: 'included',
      legacyFallbackUsed: false,
    },
  },
  {
    key: 'excluded',
    brandSlug: 'dist-access-sanity-excluded',
    developmentSlug: 'dist-access-sanity-excluded-dev',
    expected: {
      inventoryState: 'listed',
      submitReady: false,
      brandPartnershipStatus: 'active',
      developmentAccessStatus: 'excluded',
      legacyFallbackUsed: false,
    },
  },
  {
    key: 'parent_paused',
    brandSlug: 'dist-access-sanity-parent-paused',
    developmentSlug: 'dist-access-sanity-parent-paused-dev',
    expected: {
      inventoryState: 'listed',
      submitReady: false,
      brandPartnershipStatus: 'paused',
      developmentAccessStatus: 'included',
      legacyFallbackUsed: false,
    },
  },
] as const;

function assertLocalDevTarget(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, '');
  const host = url.hostname;

  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(`Refusing to verify non-local database host: ${host}`);
  }

  if (databaseName !== 'listify_local_dev') {
    throw new Error(`Refusing to verify unexpected database: ${databaseName}`);
  }
}

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch. Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.');
  }
  assertLocalDevTarget(databaseUrl);

  const db = await getDb();
  if (!db) {
    throw new Error('Database not available.');
  }

  const catalogRows = await listDevelopmentAccessDetails(db, {
    search: 'Distribution Access',
    limit: 50,
  });

  const scenarioResults: Array<Record<string, unknown>> = [];
  const mismatches: string[] = [];

  for (const scenario of SCENARIOS) {
    const [brand] = await db
      .select({ id: developerBrandProfiles.id })
      .from(developerBrandProfiles)
      .where(eq(developerBrandProfiles.slug, scenario.brandSlug))
      .limit(1);
    const [development] = await db
      .select({ id: developments.id })
      .from(developments)
      .where(eq(developments.slug, scenario.developmentSlug))
      .limit(1);

    if (!brand || !development) {
      throw new Error(`Missing seed data for scenario ${scenario.key}.`);
    }

    const brandDetails = await getBrandPartnershipDetails(db, Number(brand.id));
    const developmentDetails = await getDevelopmentAccessDetails(db, Number(development.id));

    const evaluation = developmentDetails.evaluation;

    try {
      assertEqual(
        `${scenario.key}.inventoryState`,
        evaluation.inventoryState,
        scenario.expected.inventoryState,
      );
      assertEqual(
        `${scenario.key}.submitReady`,
        evaluation.submitReady,
        scenario.expected.submitReady,
      );
      assertEqual(
        `${scenario.key}.brandPartnershipStatus`,
        evaluation.brandPartnershipStatus,
        scenario.expected.brandPartnershipStatus,
      );
      assertEqual(
        `${scenario.key}.developmentAccessStatus`,
        evaluation.developmentAccessStatus,
        scenario.expected.developmentAccessStatus,
      );
      assertEqual(
        `${scenario.key}.legacyFallbackUsed`,
        evaluation.legacyFallbackUsed,
        scenario.expected.legacyFallbackUsed,
      );
    } catch (error) {
      mismatches.push((error as Error).message);
    }

    if (scenario.key === 'excluded') {
      if (!evaluation.reasons.includes('excluded_by_exclusivity')) {
        mismatches.push('excluded scenario is missing excluded_by_exclusivity reason.');
      }
    }

    if (scenario.key === 'parent_paused') {
      if (!evaluation.reasons.includes('brand_partnership_paused')) {
        mismatches.push('parent_paused scenario is missing brand_partnership_paused reason.');
      }
    }

    if (scenario.key === 'visible_unpartnered') {
      if (!evaluation.reasons.includes('missing_brand_partnership_row')) {
        mismatches.push('visible_unpartnered scenario is missing missing_brand_partnership_row.');
      }
      if (!evaluation.legacyFallbackUsed) {
        mismatches.push('visible_unpartnered scenario should be marked as legacy fallback.');
      }
    }

    scenarioResults.push({
      scenario: scenario.key,
      brandProfileId: Number(brand.id),
      developmentId: Number(development.id),
      partnershipStatus: evaluation.brandPartnershipStatus,
      accessStatus: evaluation.developmentAccessStatus,
      inventoryState: evaluation.inventoryState,
      submitReady: evaluation.submitReady,
      legacyFallbackUsed: evaluation.legacyFallbackUsed,
      readiness: evaluation.readiness,
      reasons: evaluation.reasons,
      brandSummary: brandDetails.derivedState,
      catalogRowPresent: catalogRows.some(row => row.development.id === Number(development.id)),
    });
  }

  const summary = {
    success: mismatches.length === 0,
    scenarioCount: scenarioResults.length,
    mismatches,
    scenarios: scenarioResults,
  };

  if (mismatches.length) {
    console.error(JSON.stringify(summary, null, 2));
    throw new Error(
      `Distribution access sanity verification found ${mismatches.length} mismatch(es).`,
    );
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Distribution access sanity verification failed:', error);
    process.exit(1);
  });
