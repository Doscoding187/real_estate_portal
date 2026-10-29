import { LOCAL_JOURNEY_VERSION, LOCAL_JOURNEY_DIGEST } from './localJourneyPreview';
import type { DatabaseOperation } from '../types';
import { PLACE_RELEASE_DIGEST, PLACE_RELEASE_POLICY } from './placeRelease';
import {
  CANONICAL_PLACES_NATIONAL_DIGEST,
  CANONICAL_PLACES_NATIONAL_VERSION,
} from './canonicalPlaces';
import { CANONICAL_FOUNDATION_DIGEST, CANONICAL_FOUNDATION_VERSION } from './canonicalFoundation';
import {
  CANONICAL_PLATFORM_SETTINGS_DIGEST,
  CANONICAL_PLATFORM_SETTINGS_VERSION,
} from './canonicalPlatformSettings';
import {
  LISTING_PREVIEW_FIXTURE_DIGEST,
  LISTING_PREVIEW_FIXTURE_VERSION,
} from './listingPreviewFixture';
import {
  HOMEPAGE_JOURNEY_PREVIEW_DIGEST,
  HOMEPAGE_JOURNEY_PREVIEW_VERSION,
} from './homepageJourneyPreviewFixture';
import {
  DISTRIBUTION_REFERRER_PREVIEW_DIGEST,
  DISTRIBUTION_REFERRER_PREVIEW_VERSION,
} from './distributionReferrerPreviewFixture';
import {
  DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_DIGEST,
  DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
} from './distributionReferrerActivityPreviewFixture';
import {
  PLE_PUBLICATION_ENTITLEMENT_DIGEST,
  PLE_PUBLICATION_ENTITLEMENT_VERSION,
} from './plePublicationEntitlement';
import { PLE_REVIEWER_FIXTURE_DIGEST, PLE_REVIEWER_FIXTURE_VERSION } from './pleReviewerFixture';
import {
  MIGRATION_PREFIX_0096_DIGEST,
  MIGRATION_PREFIX_0096_VERSION,
} from './migrationPrefix0096';
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
      key: 'reference.places',
      role: 'reference',
      adapter: 'canonical-places',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/canonicalPlaces.ts',
      version: CANONICAL_PLACES_NATIONAL_VERSION,
      digest: CANONICAL_PLACES_NATIONAL_DIGEST,
      prepareCommand: 'db:places:prepare-national',
      verifyCommand: 'db:places:verify-national',
      prepareOperation: 'reference-seed',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['place-authority', 'location-discovery', 'search-to-lead'],
    },
    {
      key: 'reference.places-release-preview',
      role: 'reference',
      adapter: 'canonical-places-release-preview',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/placeRelease.ts',
      version: PLACE_RELEASE_POLICY,
      digest: PLACE_RELEASE_DIGEST,
      prepareCommand: 'db:places:release-preview:prepare',
      verifyCommand: 'db:places:release-preview:verify',
      prepareOperation: 'reference-seed',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['place-release-preview'],
    },
    {
      key: 'reference.platform-settings',
      role: 'reference',
      adapter: 'canonical-platform-settings',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/canonicalPlatformSettings.ts',
      version: CANONICAL_PLATFORM_SETTINGS_VERSION,
      digest: CANONICAL_PLATFORM_SETTINGS_DIGEST,
      prepareCommand: 'db:platform-settings:prepare',
      verifyCommand: 'db:platform-settings:verify',
      prepareOperation: 'reference-seed',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['distribution-checkfit'],
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
      key: 'demo.distribution-individual-referrer-preview',
      role: 'demo',
      adapter: 'distribution-individual-referrer-preview',
      adapterPath:
        'server/_core/databaseAuthority/dataAdapters/distributionReferrerPreviewFixture.ts',
      version: DISTRIBUTION_REFERRER_PREVIEW_VERSION,
      digest: DISTRIBUTION_REFERRER_PREVIEW_DIGEST,
      prepareCommand: 'db:distribution-referrer-preview:prepare',
      verifyCommand: 'db:distribution-referrer-preview:verify',
      prepareOperation: 'demo-seed',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['distribution-partner-preview'],
    },
    {
      key: 'demo.distribution-referrer-activity-preview',
      role: 'demo',
      adapter: 'distribution-referrer-activity-preview',
      adapterPath:
        'server/_core/databaseAuthority/dataAdapters/distributionReferrerActivityPreviewFixture.ts',
      version: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_VERSION,
      digest: DISTRIBUTION_REFERRER_ACTIVITY_PREVIEW_DIGEST,
      prepareCommand: 'db:distribution-referrer-activity:prepare',
      verifyCommand: 'db:distribution-referrer-activity:verify',
      prepareOperation: 'demo-seed',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['distribution-partner-preview'],
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
      key: 'demo.local-journey',
      role: 'demo',
      adapter: 'local-journey-preview',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/localJourneyPreview.ts',
      version: LOCAL_JOURNEY_VERSION,
      digest: LOCAL_JOURNEY_DIGEST,
      prepareCommand: 'db:local-journey:prepare',
      verifyCommand: 'db:local-journey:verify',
      prepareOperation: 'demo-seed',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['local-journey-review'],
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
    {
      key: 'test-fixture.migration-prefix-0096',
      role: 'test-fixture',
      adapter: 'migration-prefix-0096',
      adapterPath: 'server/_core/databaseAuthority/dataAdapters/migrationPrefix0096.ts',
      version: MIGRATION_PREFIX_0096_VERSION,
      digest: MIGRATION_PREFIX_0096_DIGEST,
      prepareCommand: 'db:migration-prefix-0096:seed',
      verifyCommand: 'db:migration-prefix-0096:verify',
      prepareOperation: 'test-fixture',
      verifyOperation: 'verification',
      targetClasses: DISPOSABLE_TARGETS,
      transaction: 'bounded',
      schemaMutation: false,
      requiredFor: ['b08-upgrade-rehearsal'],
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
