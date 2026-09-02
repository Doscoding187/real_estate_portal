import type { DatabaseOperation } from '../types';
import {
  CANONICAL_FOUNDATION_DIGEST,
  CANONICAL_FOUNDATION_VERSION,
} from './canonicalFoundation';
import {
  CANONICAL_GEOGRAPHY_DIGEST,
  CANONICAL_GEOGRAPHY_VERSION,
} from './canonicalGeography';
import {
  LISTING_PREVIEW_FIXTURE_DIGEST,
  LISTING_PREVIEW_FIXTURE_VERSION,
} from './listingPreviewFixture';
import {
  HOMEPAGE_JOURNEY_PREVIEW_DIGEST,
  HOMEPAGE_JOURNEY_PREVIEW_VERSION,
} from './homepageJourneyPreviewFixture';
import {
  PLE_PUBLICATION_ENTITLEMENT_DIGEST,
  PLE_PUBLICATION_ENTITLEMENT_VERSION,
} from './plePublicationEntitlement';
import {
  PLE_REVIEWER_FIXTURE_DIGEST,
  PLE_REVIEWER_FIXTURE_VERSION,
} from './pleReviewerFixture';
import {
  SEARCH_TO_LEAD_SCENARIO_DIGEST,
  SEARCH_TO_LEAD_SCENARIO_VERSION,
} from './searchToLeadScenario';

export const DATA_ROLE_MANIFEST_VERSION = 1 as const;

export type DataRole = 'reference' | 'foundation' | 'demo' | 'scenario' | 'test-fixture';

export type DataRoleManifestEntry = Readonly<{
  key: string;
  role: DataRole;
  adapter: string;
  adapterPath: string;
  version: string;
  digest: string;
  prepareCommand: string;
  verifyCommand: string;
  prepareOperation: DatabaseOperation;
  verifyOperation: DatabaseOperation;
  targetClasses: readonly ['disposable-worktree', 'disposable-test'];
  transaction: 'bounded';
  schemaMutation: false;
  requiredFor: readonly string[];
}>;

const DISPOSABLE_TARGETS = ['disposable-worktree', 'disposable-test'] as const;

export const DATA_ROLE_MANIFEST: Readonly<{
  manifestVersion: typeof DATA_ROLE_MANIFEST_VERSION;
  roles: readonly DataRoleManifestEntry[];
}> = Object.freeze({
  manifestVersion: DATA_ROLE_MANIFEST_VERSION,
  roles: Object.freeze([
    {
      key: 'reference.geography',
      role: 'reference',
      adapter: 'canonical-geography',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/canonicalGeography.ts',
      version: CANONICAL_GEOGRAPHY_VERSION,
      digest: CANONICAL_GEOGRAPHY_DIGEST,
      prepareCommand: 'db:reference:prepare',
      verifyCommand: 'db:reference:verify',
      prepareOperation: 'reference-seed',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['location-discovery', 'search-to-lead'],
    },
    {
      key: 'foundation.launch-access',
      role: 'foundation',
      adapter: 'canonical-foundation',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/canonicalFoundation.ts',
      version: CANONICAL_FOUNDATION_VERSION,
      digest: CANONICAL_FOUNDATION_DIGEST,
      prepareCommand: 'db:foundation:prepare',
      verifyCommand: 'db:foundation:verify',
      prepareOperation: 'foundation-seed',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['database', 'search-to-lead'],
    },
    {
      key: 'demo.listing-preview-authentication',
      role: 'demo',
      adapter: 'listing-preview-authentication',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/listingPreviewFixture.ts',
      version: LISTING_PREVIEW_FIXTURE_VERSION,
      digest: LISTING_PREVIEW_FIXTURE_DIGEST,
      prepareCommand: 'db:listing-preview:prepare',
      verifyCommand: 'db:listing-preview:verify',
      prepareOperation: 'demo-seed',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['listing-preview'],
    },
    {
      key: 'demo.homepage-journey-preview',
      role: 'demo',
      adapter: 'homepage-journey-preview',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/homepageJourneyPreviewFixture.ts',
      version: HOMEPAGE_JOURNEY_PREVIEW_VERSION,
      digest: HOMEPAGE_JOURNEY_PREVIEW_DIGEST,
      prepareCommand: 'db:homepage-preview:prepare',
      verifyCommand: 'db:homepage-preview:verify',
      prepareOperation: 'demo-seed',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['homepage-manual-preview', 'local-journey-review'],
    },
    {
      key: 'scenario.search-to-lead',
      role: 'scenario',
      adapter: 'search-to-lead-scenario',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/searchToLeadScenario.ts',
      version: SEARCH_TO_LEAD_SCENARIO_VERSION,
      digest: SEARCH_TO_LEAD_SCENARIO_DIGEST,
      prepareCommand: 'db:scenario:prepare',
      verifyCommand: 'db:scenario:verify',
      prepareOperation: 'scenario-seed',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['location-discovery', 'search-to-lead'],
    },
    {
      key: 'test-fixture.ple-publication-entitlement',
      role: 'test-fixture',
      adapter: 'ple-publication-entitlement',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/plePublicationEntitlement.ts',
      version: PLE_PUBLICATION_ENTITLEMENT_VERSION,
      digest: PLE_PUBLICATION_ENTITLEMENT_DIGEST,
      prepareCommand: 'db:ple-publication-entitlement:prepare',
      verifyCommand: 'db:ple-publication-entitlement:verify',
      prepareOperation: 'test-fixture',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['ple-publication-acceptance'],
    },
    {
      key: 'test-fixture.ple-reviewer',
      role: 'test-fixture',
      adapter: 'ple-reviewer',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/pleReviewerFixture.ts',
      version: PLE_REVIEWER_FIXTURE_VERSION,
      digest: PLE_REVIEWER_FIXTURE_DIGEST,
      prepareCommand: 'db:ple-reviewer:prepare',
      verifyCommand: 'db:ple-reviewer:verify',
      prepareOperation: 'test-fixture',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['ple-reviewer-acceptance'],
    },
  ] as const),
});

export function assertDataRoleManifest(
  manifest: typeof DATA_ROLE_MANIFEST = DATA_ROLE_MANIFEST,
): void {
  if (manifest.manifestVersion !== DATA_ROLE_MANIFEST_VERSION) {
    throw new Error('Database Authority data-role manifest version is unsupported.');
  }

  const keys = manifest.roles.map(role => role.key);
  if (new Set(keys).size !== keys.length) {
    throw new Error('Database Authority data-role manifest contains duplicate role keys.');
  }

  for (const role of manifest.roles) {
    if (
      role.targetClasses[0] !== 'disposable-worktree' ||
      role.targetClasses[1] !== 'disposable-test' ||
      role.transaction !== 'bounded' ||
      role.schemaMutation !== false ||
      !/^[a-f0-9]{64}$/.test(role.digest) ||
      !role.version ||
      !role.adapterPath
    ) {
      throw new Error(`Database Authority data-role manifest entry ${role.key} is malformed.`);
    }
  }
}
