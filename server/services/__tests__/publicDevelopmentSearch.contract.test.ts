import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('public Developments search authority', () => {
  it('uses the public eligibility, canonical location, active-unit and server pagination authorities', () => {
    const service = readRepoFile('server/services/publicDevelopmentSearchService.ts');

    expect(service).toContain('publicDevelopmentEligibilityConditions()');
    expect(service).toContain(
      'Commercial development records are not an alternate public Commercial',
    );
    expect(service).toContain('buildCanonicalLocationQueryBoundary');
    expect(service).toContain("journey: 'developments'");
    expect(service).toContain('eq(unitTypes.isActive, 1)');
    expect(service).toContain('normalizePublicSearchPageForTotal');
    expect(service).toContain('sortPublicDevelopmentSearchItems');
    expect(service).not.toContain('listPublicDevelopments');
  });

  it('keeps generic global search out of the dedicated Commercial journey', () => {
    const globalSearch = readRepoFile('server/services/globalSearchService.ts');

    expect(globalSearch).toContain("ne(developments.developmentType, 'commercial')");
    expect(globalSearch).toContain("ne(properties.propertyType, 'commercial')");
  });

  it('keeps the router and consumer page on one development-first query entry point', () => {
    const router = readRepoFile('server/routers.ts');
    const page = readRepoFile('client/src/pages/DevelopmentsDemo.tsx');

    expect(router).toContain('publicDevelopmentSearchService.search(input)');
    expect(page).toContain('trpc.properties.searchDevelopments.useQuery');
    expect(page).toContain('transactionType={development.transactionType}');
    expect(page).toContain('availabilityState={development.availabilityState}');
    expect(page).not.toContain('trpc.developer.listPublicDevelopments.useQuery');
    expect(page).not.toContain('SidebarFilters');
  });

  it('keeps transaction filtering optional so sale and rental developments share Search', () => {
    const router = readRepoFile('server/routers.ts');
    const page = readRepoFile('client/src/pages/DevelopmentsDemo.tsx');

    expect(router).toContain("transactionType: z.enum(['for_sale', 'for_rent']).optional()");
    expect(page).toContain(
      '      transactionType:\n' +
        "        intent.filters.transactionType === 'for_sale' ||\n" +
        "        intent.filters.transactionType === 'for_rent'\n" +
        '          ? intent.filters.transactionType\n' +
        '          : undefined,',
    );
    expect(page).toContain("value={intent.filters.transactionType || ''}");
    expect(page).toContain('<option value="">Sale or rent</option>');
  });

  it('keeps Search, Card, Detail and Unit Detail on the shared public fact contract', () => {
    const projection = readRepoFile('shared/publicDevelopmentSearch.ts');
    const detailService = readRepoFile('server/services/publicDevelopmentDetailService.ts');
    const developmentService = readRepoFile('server/services/developmentService.ts');
    const detail = readRepoFile('client/src/pages/DevelopmentDetail.tsx');
    const unitDetail = readRepoFile('client/src/pages/DevelopmentUnitDetailPage.tsx');
    const card = readRepoFile('client/src/components/DevelopmentCard.tsx');

    expect(projection).toContain('export function projectPublicDevelopmentFacts(');
    expect(detailService).toContain('publicDevelopmentEligibilityConditions()');
    expect(detailService).toContain('eq(unitTypes.isActive, 1)');
    expect(detailService).toContain('projectPublicDevelopmentFacts(development, projectionUnits)');
    expect(developmentService).toContain(
      'return publicDevelopmentDetailService.getBySlugOrId(slugOrId);',
    );
    expect(detail).toContain('const publicFacts = dev.publicFacts;');
    expect(detail).toContain('activeLeadUnit.publicFacts?.priceFrom');
    expect(detail).toContain("listingType={isRentalDevelopment ? 'rent' : 'sale'}");
    expect(unitDetail).toContain('const publicFacts = dev.publicFacts;');
    expect(unitDetail).toContain('selectedUnit?.publicFacts?.priceFrom');
    expect(card).toContain("transactionType?: 'for_sale' | 'for_rent';");
    expect(card).toContain('availabilityState?:');
    expect(card).toContain('Price on request');
    expect(card).toContain('Monthly rent on request');
    expect(detail).not.toMatch(/trpc\.developer\.listPublicDevelopments/);
  });

  it('contains unsafe public fallbacks and keeps product capability separate from release authority', () => {
    const detailService = readRepoFile('server/services/publicDevelopmentDetailService.ts');
    const detail = readRepoFile('client/src/pages/DevelopmentDetail.tsx');
    const publisher = readRepoFile('client/src/components/development/DeveloperOverview.tsx');
    const navigation = readRepoFile('client/src/lib/publicNavigation.ts');

    expect(detailService).toContain('coordinatesAreZeroPair');
    expect(detailService).toContain('coordinatesAreZeroPair ? null : latitude');
    expect(detail).not.toContain("latitude: '0'");
    expect(detail).not.toContain("longitude: '0'");
    expect(publisher).not.toContain('Unknown Developer');
    expect(publisher).toContain('No public developer description has been provided.');
    expect(navigation).toContain('productHomepageVisible: true');
    expect(navigation).toContain('productHomepageEnabled: true');
    expect(navigation).toContain('isPublicHeroJourneyReleased');
    expect(navigation).toContain('VITE_PUBLIC_JOURNEY_RELEASES');
  });
});
