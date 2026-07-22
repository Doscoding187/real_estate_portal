import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function tableBlock(
  source: string,
  exportName: string,
  nextExportName?: string,
): string {
  const startMarker = `export const ${exportName} =`;
  const start = source.indexOf(startMarker);

  expect(start).toBeGreaterThanOrEqual(0);

  if (!nextExportName) {
    return source.slice(start);
  }

  const endMarker = `export const ${nextExportName} =`;
  const end = source.indexOf(
    endMarker,
    start + startMarker.length,
  );

  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe('canonical Service Partner database authority', () => {
  const partnersSchema = read(
    'drizzle/schema/partners.ts',
  );

  const marketplaceSchema = read(
    'drizzle/schema/marketplace.ts',
  );

  const servicesSchema = read(
    'drizzle/schema/servicesEngine.ts',
  );

  it('isolates Service Partner identity from marketplace and Explore', () => {
    expect(partnersSchema).toContain(
      "export const partners = mysqlTable",
    );

    expect(marketplaceSchema).not.toContain(
      "export const partners =",
    );

    expect(partnersSchema).not.toContain(
      "from './explore'",
    );

    expect(partnersSchema).not.toContain(
      "from './marketplace'",
    );

    expect(partnersSchema).not.toContain(
      "from './servicesEngine'",
    );
  });

  it('models one flexible Service Partner business identity', () => {
    const partners = tableBlock(
      partnersSchema,
      'partners',
      'partnerSubscriptions',
    );

    expect(partners).toContain(
      "id: int().autoincrement().primaryKey()",
    );

    expect(partners).toContain(
      "userId: int('user_id')",
    );

    expect(partners).toContain(
      '.references(() => users.id',
    );

    expect(partners).toContain(
      "unique('ux_partners_user').on(table.userId)",
    );

    expect(partners).toContain(
      "companyName: varchar('company_name'",
    );

    expect(partners).toContain(
      "description: text('description')",
    );

    expect(partners).toContain(
      "verificationStatus: mysqlEnum('verification_status'",
    );

    expect(partners).toContain(
      "trustScore: decimal('trust_score'",
    );

    expect(partners).toContain(
      "approvedContentCount: int('approved_content_count')",
    );

    expect(partners).toContain(
      "isActive: tinyint('is_active')",
    );

    expect(partners).not.toContain(
      'serviceType:',
    );

    expect(partners).not.toContain(
      'serviceAreas:',
    );
  });

  it('uses Service Engine tables for services and operating coverage', () => {
    expect(servicesSchema).toContain(
      'export const serviceProviderServices =',
    );

    expect(servicesSchema).toContain(
      'export const serviceProviderLocations =',
    );

    const services = tableBlock(
      servicesSchema,
      'serviceProviderServices',
      'serviceProviderSubscriptions',
    );

    expect(services).toContain(
      "serviceCategory: mysqlEnum(",
    );

    expect(services).toContain(
      "serviceCode: varchar('service_code'",
    );

    const locations = tableBlock(
      servicesSchema,
      'serviceProviderLocations',
      'serviceProviderServices',
    );

    expect(locations).toContain(
      "province: varchar('province'",
    );

    expect(locations).toContain(
      "city: varchar('city'",
    );

    expect(locations).toContain(
      "suburb: varchar('suburb'",
    );

    expect(locations).toContain(
      "radiusKm: int('radius_km')",
    );
  });

  it('anchors every Service Engine provider reference to integer partners.id', () => {
    expect(servicesSchema).toContain(
      "import { partners } from './partners';",
    );

    expect(servicesSchema).not.toContain(
      'explorePartners',
    );

    expect(servicesSchema).not.toContain(
      "providerId: varchar('provider_id'",
    );

    const providerReferences = [
      'serviceProviderProfiles',
      'serviceProviderLocations',
      'serviceProviderServices',
      'serviceProviderSubscriptions',
      'serviceLeads',
      'serviceProviderReviews',
    ];

    for (let index = 0; index < providerReferences.length; index += 1) {
      const current = providerReferences[index];
      const next = providerReferences[index + 1];

      const block = tableBlock(
        servicesSchema,
        current,
        next,
      );

      expect(block).toContain(
        "providerId: int('provider_id')",
      );

      expect(block).toContain(
        '.references(() => partners.id',
      );
    }
  });
});
