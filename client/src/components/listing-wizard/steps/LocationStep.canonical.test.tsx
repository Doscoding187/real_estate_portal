import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { buildListingWizardSubmitPayload } from '@/lib/listingWizardSubmitMapper';

const northRiding = 'pl-place-01-6a145c6d642ba208a2c12de7';
vi.mock('@/components/location/CanonicalPlaceSelector', async original => {
  const actual = await original<typeof import('@/components/location/CanonicalPlaceSelector')>();
  return {
    ...actual,
    CanonicalPlaceSelector: ({ value, onChange }: any) => (
      <actual.CanonicalPlaceSelectorView
        value={value}
        onChange={onChange}
        query="North Riding"
        onQueryChange={() => {}}
        pending={false}
        error={false}
        discovery={{
          query: 'north riding',
          outcome: 'resolved',
          results: [
            {
              placeId: northRiding,
              preferredPublicLabel: 'North Riding',
              placeType: 'suburb',
              searchEligible: true,
              searchScope: 'locality',
              matchedName: 'North Riding',
              isAliasMatch: false,
              context: { administrativeContext: 'City of Johannesburg / Gauteng' },
            },
          ],
        }}
      />
    ),
  };
});
vi.mock('@/components/location/LocationMapPicker', () => ({
  LocationMapPicker: ({ onLocationSelect }: any) => (
    <button
      onClick={() =>
        onLocationSelect({
          latitude: -26.05,
          longitude: 27.96,
          city: 'Roodepoort',
          suburb: 'Provider Alternative',
          province: 'Provider Province',
          placeId: 'provider-observation-only',
          coordinateSource: 'map',
          addressComponents: [
            { types: ['route'], long_name: 'Congo Street' },
            { types: ['street_number'], long_name: '5' },
          ],
        })
      }
    >
      Add private map evidence
    </button>
  ),
}));
import LocationStep from './LocationStep';

afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'local-unit-test-key');
  useListingWizardStore.getState().reset();
  useListingWizardStore.getState().setPropertyType('house');
});
describe('North Riding private house authoring', () => {
  it('requires explicit locality selection and preserves street/postal evidence without inventing a city', () => {
    render(<LocationStep />);
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /North Riding suburb/ }));
    fireEvent.change(screen.getByLabelText(/Street number/), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Street name/), { target: { value: 'Congo Street' } });
    fireEvent.change(screen.getByLabelText(/Postal code/), { target: { value: '2169' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm location' }));
    const state = useListingWizardStore.getState();
    expect(state.canAdvanceFromStep(6)).toBe(true);
    const payload = buildListingWizardSubmitPayload({
      ...state,
      action: 'sell',
      pricing: { askingPrice: 1000000 },
    });
    expect(payload.location).toEqual({
      version: 2,
      canonicalPlaceId: northRiding,
      privateAddress: { streetNumber: '5', streetName: 'Congo Street', postalCode: '2169' },
      coordinates: null,
      coordinateSource: 'manual_confirmed',
      locationConfirmationState: 'confirmed',
      publicLocationPrecision: 'approximate',
      providerObservation: null,
    });
    for (const key of ['city', 'province', 'suburb', 'cityId', 'suburbId'])
      expect(payload.location).not.toHaveProperty(key);
  });
  it('keeps house confirmation unavailable without street evidence', () => {
    render(<LocationStep />);
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /North Riding suburb/ }));
    expect(screen.getByRole('button', { name: 'Confirm location' })).toBeDisabled();
  });
});

it('provider enrichment preserves North Riding identity and resets confirmation', () => {
  render(<LocationStep />);
  fireEvent.focus(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', { name: /North Riding suburb/ }));
  screen.getByText('Use map search').closest('details')!.open = true;
  fireEvent.click(screen.getByRole('button', { name: 'Add private map evidence' }));
  const state = useListingWizardStore.getState();
  expect(state.location?.canonicalPlace?.canonicalPlaceId).toBe(northRiding);
  expect(state.location?.canonicalPlace?.label).toBe('North Riding');
  expect(state.location?.locationConfirmationState).toBe('needs_confirmation');
  expect(state.location?.privateAddress).toEqual({ streetNumber: '5', streetName: 'Congo Street' });
  expect(state.location?.cityId).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm location' }));
  const payload = buildListingWizardSubmitPayload({
    ...useListingWizardStore.getState(),
    action: 'sell',
    pricing: { askingPrice: 1000000 },
  });
  expect(payload.location.canonicalPlaceId).toBe(northRiding);
  expect(payload.location.providerObservation).toEqual({
    provider: 'google',
    providerPlaceId: 'provider-observation-only',
  });
});
