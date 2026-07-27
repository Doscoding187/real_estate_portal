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
    const properties = readRepoFile('client/src/pages/Properties.tsx');

    expect(route).toContain("import PropertyDetailPage from './PropertyDetailPage'");
    expect(route).not.toContain('matchMedia');
    expect(route).not.toContain('PropertyDetailMobileOptimized');
    expect(page).toContain('trpc.properties.toggleFavorite.useMutation');
    expect(page).toContain('trpc.properties.getFavorites.useQuery');
    expect(page).toContain('utils.properties.getFavorites.invalidate()');
    expect(page).toContain('const isFavorite = favorites.some');
    expect(page).toContain('disabled={toggleFavoriteMutation.isPending}');
    expect(page).not.toContain(retiredFavoriteMutation);
    expect(properties).toContain('trpc.properties.toggleFavorite.useMutation');
    expect(properties).toContain('utils.properties.getFavorites.invalidate()');
    expect(properties).not.toContain(retiredFavoriteMutation);
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
      "leadType: formData.inquiryType === 'viewing' ? 'viewing_request' : 'inquiry'",
    );
    expect(modal).toContain('trpc.leads.create.useMutation');
    expect(modal).toContain('Request a Viewing');
    expect(modal).not.toContain(retiredScheduleLabel);
    expect(page).toContain("requestType: 'viewing_request'");
    expect(page).toContain('Submit viewing request');
    expect(page).not.toContain(retiredAppointmentLabel);
    expect(leadsRouter).toContain("'viewing_request'");
  });

  it('states that a listing contact must confirm the appointment after the request', () => {
    const modal = readRepoFile('client/src/components/property/PropertyContactModal.tsx');
    const page = readRepoFile('client/src/pages/PropertyDetailPage.tsx');

    expect(modal).toContain('will follow up to confirm a suitable date and time');
    expect(page).toContain('will follow up to confirm a suitable date and time');
  });

  it('keeps ordinary enquiries, loading, and not-found states in the shared page', () => {
    const modal = readRepoFile('client/src/components/property/PropertyContactModal.tsx');
    const page = readRepoFile('client/src/pages/PropertyDetailPage.tsx');

    expect(modal).toContain("intent = 'enquiry'");
    expect(modal).toContain(
      "leadType: formData.inquiryType === 'viewing' ? 'viewing_request' : 'inquiry'",
    );
    expect(modal).toContain("'Failed to send inquiry. Please try again.'");
    expect(page).toContain('if (isLoading)');
    expect(page).toContain('Property Not Found');
    expect(page).toContain('trpc.properties.getById.useQuery');
  });
});
