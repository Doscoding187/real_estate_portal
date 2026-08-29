import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('PXF-S1 property prospect contract', () => {
  const retiredFavoriteMutation = ['trpc', 'favorites', 'add'].join('.');
  const retiredScheduleLabel = ['Schedule', 'Viewing'].join(' ');
  const retiredAppointmentLabel = ['Book', 'an', 'Appointment'].join(' ');

  it('uses one responsive property-detail authority and canonical persisted saves', () => {
    const route = readRepoFile('client/src/pages/PropertyDetail.tsx');
    const page = readRepoFile('client/src/pages/PropertyDetailPage.tsx');
    const searchResults = readRepoFile('client/src/pages/SearchResults.tsx');

    expect(route).toContain("import PropertyDetailPage from './PropertyDetailPage'");
    expect(route).not.toContain('matchMedia');
    expect(route).not.toContain('PropertyDetailMobileOptimized');
    expect(page).toContain('trpc.properties.toggleFavorite.useMutation');
    expect(page).toContain('trpc.properties.getFavorites.useQuery');
    expect(page).toContain('utils.properties.getFavorites.invalidate()');
    expect(page).toContain('const isFavorite = favorites.some');
    expect(page).toContain('disabled={toggleFavoriteMutation.isPending}');
    expect(page).not.toContain(retiredFavoriteMutation);
    expect(searchResults).toContain('trpc.properties.toggleFavorite.useMutation');
    expect(searchResults).toContain('utils.properties.getFavorites.invalidate()');
    expect(searchResults).not.toContain(retiredFavoriteMutation);
  });

  it('hands off anonymous saves to sign-in without a second save authority', () => {
    const page = readRepoFile('client/src/pages/PropertyDetailPage.tsx');

    expect(page).toContain('if (!isAuthenticated)');
    expect(page).toContain(
      '/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}',
    );
    expect(page).not.toContain('addGuestFavorite');
    expect(page).toContain('if (toggleFavoriteMutation.isPending) return;');
    expect(page).toContain('toggleFavoriteMutation.mutate({ propertyId })');
  });

  it('submits viewing requests through the canonical lead authority without booking claims', () => {
    const modal = readRepoFile('client/src/components/property/PropertyContactModal.tsx');
    const page = readRepoFile('client/src/pages/PropertyDetailPage.tsx');
    const leadsRouter = readRepoFile('server/leadsRouter.ts');

    expect(modal).toContain(
      "leadType: formData.enquiryType === 'viewing' ? 'viewing_request' : 'inquiry'",
    );
    expect(modal).toContain('trpc.leads.create.useMutation');
    expect(modal).toContain('Request a viewing');
    expect(modal).not.toContain(retiredScheduleLabel);
    expect(page).toContain("requestType: 'viewing_request'");
    expect(page).toContain('Submit viewing request');
    expect(page).not.toContain(retiredAppointmentLabel);
    expect(leadsRouter).toContain("'viewing_request'");
  });

  it('states that delivery is not a booked appointment without promising a follow-up', () => {
    const modal = readRepoFile('client/src/components/property/PropertyContactModal.tsx');
    const page = readRepoFile('client/src/pages/PropertyDetailPage.tsx');

    expect(modal).toContain('This does not confirm an appointment');
    expect(modal).toContain('they can contact you to arrange a suitable date and time');
    expect(page).toContain('This is not a confirmed appointment');
    expect(page).toContain('the representative can contact you to arrange a suitable time');
    expect(modal).not.toContain('will follow up to confirm a suitable date and time');
    expect(page).not.toContain('will follow up to confirm a suitable date and time');
  });

  it('keeps ordinary enquiries, loading, and not-found states in the shared page', () => {
    const modal = readRepoFile('client/src/components/property/PropertyContactModal.tsx');
    const page = readRepoFile('client/src/pages/PropertyDetailPage.tsx');

    expect(modal).toContain("intent = 'enquiry'");
    expect(modal).toContain(
      "leadType: formData.enquiryType === 'viewing' ? 'viewing_request' : 'inquiry'",
    );
    expect(modal).toContain(
      "'We could not save your enquiry. Your details are still here, so you can try again.'",
    );
    expect(page).toContain('if (isLoading)');
    expect(page).toContain('Property temporarily unavailable');
    expect(page).toContain('onClick={() => void refetch()}');
    expect(page).toContain('Property no longer available');
    expect(page).toContain('getPropertySearchReturn(window.sessionStorage');
    expect(page).toContain('trpc.properties.getById.useQuery');
    expect(page).toContain('trpc.properties.getRelatedPublicInventory.useQuery');
    expect(page).not.toContain('trpc.properties.getAll.useQuery');
  });

  it('uses canonical public identity and removes invented trust and finance claims', () => {
    const page = readRepoFile('client/src/pages/PropertyDetailPage.tsx');

    expect(page).toContain('const publicIdentity = property.publicIdentity');
    expect(page).toContain("contactMode === 'agency'");
    expect(page).not.toContain("normalizedListerType === 'private'");
    expect(page).not.toContain("'Verified Agent'");
    expect(page).not.toContain("'Registered Agent'");
    expect(page).not.toContain('displayRepayment');
    expect(page).not.toContain('<PropertyQualificationDrawer');
    expect(page).not.toContain('<BondCalculator');
    expect(page).not.toContain('<SuburbInsights');
    expect(page).not.toContain('<LocalityGuide');
    expect(page).not.toContain('<PropertyServiceActions');
  });

  it('renders the server-owned public detail presentation instead of reparsing authoring JSON', () => {
    const page = readRepoFile('client/src/pages/PropertyDetailPage.tsx');
    const comparison = readRepoFile('client/src/pages/CompareProperties.tsx');
    const dto = readRepoFile('server/services/publicPropertyDto.ts');
    const locationOverview = readRepoFile(
      'client/src/components/property/PropertyLocationOverview.tsx',
    );

    expect(page).toContain('const presentation = property.detailPresentation');
    expect(page).not.toContain('JSON.parse(property.propertyDetails)');
    expect(page).not.toContain('getPropertyBuyerChecklist(property)');
    expect(page).not.toContain('buildPricingContract(');
    expect(comparison).toContain('detailPresentation');
    expect(comparison).not.toContain('normalizePropertyForUI');
    expect(dto).toContain('buildPublicPropertyDetailPresentation');
    expect(dto).toContain('detailPresentation');
    expect(dto).toContain('publicLocation:');
    expect(page).toContain('PropertyLocationOverview');
    expect(page).toContain('location={presentation.location}');
    expect(page).not.toContain('NearbyLandmarks');
    expect(locationOverview).not.toContain('getNearbyAmenities');
    expect(locationOverview).not.toContain("from '@/lib/trpc'");
    expect(page).toContain("presentation.location.precision === 'exact'");
  });

  it('keeps one responsive action hierarchy and semantic related-property navigation', () => {
    const page = readRepoFile('client/src/pages/PropertyDetailPage.tsx');

    // The same lead command is intentionally surfaced in the hero, sticky
    // desktop layer, right rail and mobile layer. Count is not an authority;
    // each surface must delegate to the same canonical handlers.
    expect(page.match(/onClick={handleOpenStandardEnquiry}/g)?.length).toBeGreaterThanOrEqual(3);
    expect(page).toContain('const handleOpenStandardEnquiry = () =>');
    expect(page).toContain("isRentalListing ?");
    expect(page).toContain("Send rental enquiry");
    expect(page).toContain('const handleRequestViewing = () =>');
    expect(page).toContain('const [isStickyNavVisible, setIsStickyNavVisible]');
    expect(page).toContain('overviewSectionRef');
    expect(page).toContain('fixed inset-x-0 top-16');
    expect(page).toContain('{isStickyNavVisible && (');
    expect(page).toContain('{hasPrimaryContactAction && isStickyNavVisible && (');
    expect(page).toContain('aria-label="Property enquiry actions"');
    expect(page).toContain('pb-[calc(0.75rem+env(safe-area-inset-bottom))]');
    expect(page).toContain('lg:hidden');
    expect(page).toContain('aria-label="Request a viewing"');
    expect(page).toContain('href={prop.href}');
    expect(page).toContain('aria-label={`Open ${prop.title}`}');
    expect(page).toContain('<Link href={similarListingsHref}>View all matching listings</Link>');
    expect(page).toContain('HouseMeasureIcon');
    expect(page.indexOf('aria-labelledby="listed-by-heading"')).toBeLessThan(
      page.indexOf('aria-labelledby="contact-heading"'),
    );
    expect(page).not.toContain('onClick={() => setLocation(prop.href)}');
  });

  it('only offers WhatsApp through the canonical lead handoff when public contact exists', () => {
    const page = readRepoFile('client/src/pages/PropertyDetailPage.tsx');

    expect(page).toContain('const handleWhatsAppContact = () =>');
    expect(page).toContain("intent: 'whatsapp'");
    expect(page).toContain('whatsappNumber &&');
    expect(page).toContain('const whatsappActionLabel');
    expect(page).toContain(
      "source={contactIntent === 'whatsapp' ? 'property_detail_whatsapp' : 'property_detail'}",
    );
    expect(page).toContain('successAction={');
    expect(page).toContain("type: 'whatsapp'");
  });
});
