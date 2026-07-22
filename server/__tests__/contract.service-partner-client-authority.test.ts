import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('canonical Service Partner client identity authority', () => {
  const providerCard = read(
    'client/src/components/services/ProviderCard.tsx',
  );

  const catalog = read(
    'client/src/features/services/catalog.ts',
  );

  const onboardingStatus = read(
    'client/src/hooks/useServiceProviderOnboardingStatus.ts',
  );

  const profilePage = read(
    'client/src/pages/services/ServiceProviderProfilePage.tsx',
  );

  const reviewsPage = read(
    'client/src/pages/services/ServiceProviderReviewsPage.tsx',
  );

  const requestPage = read(
    'client/src/pages/services/ServicesRequestPage.tsx',
  );

  const resultsPage = read(
    'client/src/pages/services/ServicesResultsPage.tsx',
  );

  it('uses integer provider IDs in shared client types', () => {
    expect(providerCard).toContain(
      'providerId: number;',
    );

    expect(providerCard).toContain(
      'onCta?: (providerId: number) => void;',
    );

    expect(providerCard).toContain(
      'onViewProfile?: (providerId: number) => void;',
    );

    expect(onboardingStatus).toContain(
      'providerId: number;',
    );

    expect(providerCard).not.toContain(
      'providerId: string;',
    );
  });

  it('builds provider slugs from integer IDs', () => {
    expect(catalog).toMatch(
      /toProviderSlug\(companyName:\s*string,\s*providerId:\s*number\)/,
    );

    expect(catalog).toMatch(
      /providerIdFromSlug\(slug:\s*string\):\s*number\s*\|\s*null/,
    );

    expect(catalog).toContain(
      'Number.parseInt',
    );

    expect(catalog).toContain(
      'Number.isInteger',
    );
  });

  it('parses profile and review route IDs as positive integers', () => {
    expect(profilePage).toContain(
      'providerIdFromSlug(decodeURIComponent(slug))',
    );

    expect(reviewsPage).toMatch(
      /parsePositiveInteger\(params\?\.providerId/,
    );

    expect(reviewsPage).not.toContain(
      "String(params?.providerId || '')",
    );
  });

  it('parses request provider IDs numerically', () => {
    expect(requestPage).toContain(
      "parsePositiveInteger(query.get('providerId'))",
    );

    expect(requestPage).not.toContain(
      "query.get('providerId') || undefined",
    );
  });

  it('uses numeric provider IDs for result events and mutations', () => {
    expect(resultsPage).toContain(
      'providerId?: number,',
    );

    expect(resultsPage).not.toContain(
      'providerId?: string,',
    );
  });
});
