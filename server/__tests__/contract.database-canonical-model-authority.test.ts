import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function countPhysicalTableDefinitions(
  source: string,
  physicalTableName: string,
): number {
  const escapedName = physicalTableName.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );

  return (
    source.match(
      new RegExp(
        `mysqlTable\\(\\s*['"]${escapedName}['"]`,
        'g',
      ),
    ) ?? []
  ).length;
}

describe('database canonical model authority', () => {
  it('retires the duplicate root listing schema', () => {
    expect(
      existsSync(path.join(ROOT, 'drizzle/listing-schema.ts')),
    ).toBe(false);
  });

  it('retires the unadopted economic actor abstraction', () => {
    expect(
      existsSync(path.join(ROOT, 'drizzle/schema/economicActors.ts')),
    ).toBe(false);

    const schemaIndex = readRepoFile('drizzle/schema/index.ts');
    const runtimeCapabilities = readRepoFile(
      'server/services/runtimeSchemaCapabilities.ts',
    );
    const cleanupScript = readRepoFile('cleanup-production-data.ts');

    expect(schemaIndex).not.toContain(
      "export * from './economicActors';",
    );

    const retiredRuntimeAuthority = [
      'economicActorsReady',
      'economicActorsDetails',
      'economicActorsTable',
      "'economic_actors'",
    ];

    for (const authorityName of retiredRuntimeAuthority) {
      expect(runtimeCapabilities).not.toContain(authorityName);
    }

    expect(cleanupScript).not.toContain(
      'DELETE FROM agent_profiles',
    );
  });

  it('defines each canonical listing physical table once', () => {
    const schemaDirectory = path.join(ROOT, 'drizzle/schema');

    const modularSchemaSource = readdirSync(schemaDirectory)
      .filter(fileName => fileName.endsWith('.ts'))
      .map(fileName =>
        readFileSync(
          path.join(schemaDirectory, fileName),
          'utf8',
        ),
      )
      .join('\n');

    const listingTables = [
      'listings',
      'listing_analytics',
      'listing_approval_queue',
      'listing_leads',
      'listing_media',
      'listing_settings',
      'listing_viewings',
    ];

    for (const physicalTableName of listingTables) {
      expect(
        countPhysicalTableDefinitions(
          modularSchemaSource,
          physicalTableName,
        ),
        physicalTableName,
      ).toBe(1);
    }
  });

  it('exports the canonical listing and Google Places modules', () => {
    const schemaIndex = readRepoFile('drizzle/schema/index.ts');

    expect(schemaIndex).toContain("export * from './listings';");
    expect(schemaIndex).toContain(
      "export * from './googlePlacesMonitoring';",
    );
  });

  it('models all active Google Places monitoring tables', () => {
    const monitoringSchema = readRepoFile(
      'drizzle/schema/googlePlacesMonitoring.ts',
    );

    const tableNames = [
      'google_places_api_logs',
      'google_places_api_daily_summary',
      'google_places_api_alerts',
      'google_places_api_config',
    ];

    for (const physicalTableName of tableNames) {
      expect(
        countPhysicalTableDefinitions(
          monitoringSchema,
          physicalTableName,
        ),
        physicalTableName,
      ).toBe(1);
    }
  });

  it('preserves the active Google Places migration indexes and constraints', () => {
    const monitoringSchema = readRepoFile(
      'drizzle/schema/googlePlacesMonitoring.ts',
    );

    const authorityNames = [
      'idx_gpal_timestamp',
      'idx_gpal_request_type',
      'idx_gpal_success',
      'idx_gpal_session_token',
      'idx_gpal_user_id',
      'google_places_api_daily_summary_date_uq',
      'idx_gpads_date',
      'idx_gpaa_triggered',
      'idx_gpaa_type',
      'idx_gpaa_severity',
      'idx_gpaa_resolved',
      'google_places_api_config_key_uq',
      'idx_gpac_key',
    ];

    for (const authorityName of authorityNames) {
      expect(monitoringSchema).toContain(`'${authorityName}'`);
    }
  });
});
