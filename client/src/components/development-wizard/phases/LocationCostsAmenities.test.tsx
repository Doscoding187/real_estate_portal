import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  user: { id: 1, role: 'property_developer' } as { id: number; role: string },
  publisher: null as { cataloguePublisherId: number } | null,
  centre: null as null | { lat: number; lng: number },
}));

vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/hooks/usePublisherContext', () => ({
  usePublisherContext: () => ({ context: auth.publisher }),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: {
      getPlaceCentre: {
        useQuery: (_input: unknown, opts: { enabled?: boolean }) => ({
          data: opts?.enabled ? auth.centre : undefined,
        }),
      },
    },
    admin: {
      adminGetDevelopmentPlaceAssignmentContext: {
        useQuery: () => ({ data: { assignments: [] } }),
      },
    },
  },
}));
vi.mock('@/components/location/LocationMapPicker', () => ({
  LocationMapPicker: ({ onLocationSelect }: { onLocationSelect: (v: any) => void }) => (
    <button
      type="button"
      onClick={() =>
        onLocationSelect({
          address: '499 Boundary Road, Kya Sand',
          postalCode: '2169',
          latitude: -26.0412,
          longitude: 27.9561,
          coordinateSource: 'autocomplete',
        })
      }
    >
      Search address (mock)
    </button>
  ),
}));
vi.mock('@/components/location/CanonicalPlaceSelector', () => {
  const options = [
    { placeId: 'pl-north-riding', preferredPublicLabel: 'North Riding', searchScope: 'locality', matchedName: 'North Riding', canonicalPath: '/gauteng/randburg/north-riding' },
    { placeId: 'pl-kya-informal', preferredPublicLabel: 'Kya Sands Informal Settlement', searchScope: 'locality', matchedName: 'Kya Sands Informal Settlement', canonicalPath: '/gauteng/johannesburg/kya-sands-informal-settlement' },
    { placeId: 'pl-johannesburg', preferredPublicLabel: 'Johannesburg', searchScope: 'metro_city', matchedName: 'Johannesburg', canonicalPath: '/gauteng/johannesburg' },
  ];
  return {
    CanonicalPlaceSelector: ({ onChange, optionFilter }: { onChange: (v: any) => void; optionFilter?: (o: any) => boolean }) => (
      <div>
        <button type="button" onClick={() => onChange(null)}>
          Clear (mock)
        </button>
        {options
          .filter(o => !optionFilter || optionFilter(o))
          .map(o => (
            <button
              key={o.placeId}
              type="button"
              onClick={() =>
                onChange({
                  canonicalPlaceId: o.placeId,
                  label: o.preferredPublicLabel,
                  placeType: 'suburb',
                  scope: o.searchScope,
                  administrativeContext: null,
                })
              }
            >
              Offer: {o.preferredPublicLabel}
            </button>
          ))}
      </div>
    ),
  };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { buildDevelopmentSubmitPayload } from '@/lib/developmentSubmitPayload';
import { buildPreviewModel } from '@/components/wizard/previewModel';
import { LocationPhase } from './LocationPhase';
import { validateLocationStep } from '@/lib/wizardLocationCostsAmenities';
import { EstateProfilePhase } from './EstateProfilePhase';
import { AmenitiesPhase } from './AmenitiesPhase';

const store = () => useDevelopmentWizard.getState();

beforeEach(() => {
  localStorage.clear();
  store().reset();
  auth.user = { id: 1, role: 'property_developer' };
  auth.publisher = null;
  auth.centre = null;
});

describe('LocationPhase', () => {
  it('marks the address, the suburb and the map pin required; manual lat/lng entry stays', () => {
    render(<LocationPhase />);
    expect(screen.getAllByText('(required)').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Suburb \(part of the official address\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/Drop the pin at the entrance or show house \(required\)/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Street address/), {
      target: { value: '499 Boundary Road' },
    });
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '-26.05' } });
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '28.01' } });
    expect(store().getWizardData().location).toMatchObject({
      address: '499 Boundary Road',
      latitude: '-26.05',
      longitude: '28.01',
    });
  });

  it('an address search fills the pin automatically but never the suburb', () => {
    render(<LocationPhase />);
    fireEvent.click(screen.getByText('Search address (mock)'));
    expect(store().getWizardData().location).toMatchObject({
      address: '499 Boundary Road, Kya Sand',
      postalCode: '2169',
      latitude: '-26.0412',
      longitude: '27.9561',
    });
    expect((store().getWizardData().location as any).suburbPlaceId).toBeUndefined();
  });

  it('"No street address yet" makes the address optional but the pin stays required', () => {
    render(<LocationPhase />);
    fireEvent.click(screen.getByLabelText(/No street address yet/));
    expect(store().getWizardData().location).toMatchObject({ noOfficialStreet: true });
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('offers suburbs only, never informal settlements, and saves the choice for the preview', () => {
    render(<LocationPhase />);
    expect(screen.getByText('Offer: North Riding')).toBeInTheDocument();
    expect(screen.queryByText(/Informal Settlement/)).not.toBeInTheDocument();
    expect(screen.queryByText('Offer: Johannesburg')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Offer: North Riding'));
    const location = store().getWizardData().location as Record<string, any>;
    expect(location.suburbPlaceId).toBe('pl-north-riding');
    expect(location.suburbLabel).toBe('North Riding');
    expect(buildPreviewModel(store().getWizardData()).locationLabel).toBe('North Riding');
  });

  it('warns in amber when the pin is over 5 km from the suburb centre, and not otherwise', () => {
    auth.centre = { lat: -26.0, lng: 28.0 };
    render(<LocationPhase />);
    fireEvent.click(screen.getByText('Offer: North Riding'));
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '-26.01' } });
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '28.01' } });
    expect(screen.queryByTestId('pin-far-warning')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '-26.2' } });
    expect(screen.getByTestId('pin-far-warning')).toHaveTextContent(
      /This pin is \d+ km from North Riding — check the address or the pin\./,
    );
  });

  it('no centre in our data means no warning', () => {
    auth.centre = null;
    render(<LocationPhase />);
    fireEvent.click(screen.getByText('Offer: North Riding'));
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '-20' } });
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '20' } });
    expect(screen.queryByTestId('pin-far-warning')).not.toBeInTheDocument();
  });

  it('there is no derived "from the map pin" line; copy is truthful and a reviewer confirms the suburb', () => {
    render(<LocationPhase />);
    expect(screen.queryByText(/Location buyers see/)).not.toBeInTheDocument();
    expect(screen.getByText(/A reviewer confirms the suburb/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Buyers see the suburb in search; the street address shows on the development page for directions/,
      ),
    ).toBeInTheDocument();
  });

  it('clearing the suburb really clears it (null, not undefined) and it stays cleared', () => {
    render(<LocationPhase />);
    fireEvent.click(screen.getByText('Offer: North Riding'));
    expect((store().getWizardData().location as any).suburbPlaceId).toBe('pl-north-riding');
    fireEvent.click(screen.getByText('Clear (mock)'));
    const location = store().getWizardData().location as any;
    expect(location.suburbPlaceId ?? null).toBeNull();
    expect(location.suburbLabel ?? null).toBeNull();
    expect(validateLocationStep(location).map(e => e.field)).toContain('suburbPlaceId');
    // Picking another replaces it.
    fireEvent.click(screen.getByText('Offer: North Riding'));
    expect((store().getWizardData().location as any).suburbPlaceId).toBe('pl-north-riding');
  });

  it('a suburb saved earlier that is an informal settlement is cleared on load, with a clear message', () => {
    store().saveWorkflowStepData('location', {
      suburbPlaceId: 'pl-kya-informal',
      suburbLabel: 'Kya Sands Informal Settlement',
    } as any);
    render(<LocationPhase />);
    const location = store().getWizardData().location as any;
    expect(location.suburbPlaceId ?? null).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose the suburb from the list');
  });

  it('a chosen suburb survives a draft save and reload (hydrate)', () => {
    render(<LocationPhase />);
    fireEvent.click(screen.getByText('Offer: North Riding'));
    const saved = JSON.parse(JSON.stringify(store().getDraftData()));
    store().reset();
    store().hydrateDevelopment({ draftData: saved } as any);
    expect(store().getWizardData().location).toMatchObject({
      suburbPlaceId: 'pl-north-riding',
      suburbLabel: 'North Riding',
    });
  });

  it('reopening a saved development keeps the no-street tick, the empty address and the suburb', () => {
    store().hydrateDevelopment({
      id: 9,
      name: 'Baltimore',
      developmentType: 'residential',
      transactionType: 'for_sale',
      address: '',
      latitude: '-26.05',
      longitude: '28.0',
      estateSpecs: JSON.stringify({
        noStreetAddress: true,
        setting: 'estate',
        suburbPlaceId: 'pl-north-riding',
        suburbLabel: 'North Riding',
      }),
    } as any);
    expect(store().getWizardData().location).toMatchObject({
      noOfficialStreet: true,
      address: '',
      suburbPlaceId: 'pl-north-riding',
      suburbLabel: 'North Riding',
    });
    render(<LocationPhase />);
    expect((screen.getByLabelText(/No street address yet/) as HTMLInputElement).checked).toBe(true);
  });
});

describe('Monthly costs (EstateProfilePhase)', () => {
  it('asks rates & taxes first as one amount, then the levy; old governance controls are gone', () => {
    render(<EstateProfilePhase />);
    const labels = screen.getAllByText(/Rates & taxes|Levy \(if applicable\)/).map(n => n.textContent);
    expect(labels[0]).toMatch(/Rates & taxes/);
    expect(screen.queryByText(/Governing Body/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Architectural/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByText(/Min Estimate/)).not.toBeInTheDocument();
  });

  it('saves rates and the chosen levy into the existing fields and the submit payload', () => {
    render(<EstateProfilePhase />);
    fireEvent.change(screen.getByLabelText(/Rates & taxes/), { target: { value: '950' } });
    fireEvent.click(screen.getByRole('button', { name: 'Body corporate levy' }));
    fireEvent.change(screen.getByLabelText(/Body corporate levy \(estimated/), {
      target: { value: '2100' },
    });
    expect(store().stepData.governance_finances).toMatchObject({
      hasGoverningBody: true,
      governanceType: 'body_corporate',
      levyRange: { min: 2100, max: 2100 },
      rightsAndTaxes: { min: 950, max: 950 },
    });
    const payload = buildDevelopmentSubmitPayload({
      amenities: [],
      wizardData: store().getWizardData() as any,
    });
    expect(payload).toMatchObject({
      ratesFrom: 950,
      ratesTo: 950,
      monthlyLevyFrom: 2100,
      monthlyLevyTo: 2100,
    });
    expect(payload.estateSpecs).toMatchObject({ hasHOA: true, governanceType: 'body_corporate' });

    fireEvent.click(screen.getByRole('button', { name: 'No levy' }));
    expect(store().stepData.governance_finances).toMatchObject({
      hasGoverningBody: false,
      levyRange: { min: null, max: null },
      rightsAndTaxes: { min: 950, max: 950 },
    });
  });

  it('keeps stored values the step no longer asks for', () => {
    store().saveWorkflowStepData('governance_finances', {
      architecturalGuidelines: true,
      guidelinesSummary: 'Tiled roofs only',
    } as any);
    render(<EstateProfilePhase />);
    fireEvent.click(screen.getByRole('button', { name: 'HOA levy' }));
    expect(store().stepData.governance_finances).toMatchObject({
      architecturalGuidelines: true,
      guidelinesSummary: 'Tiled roofs only',
    });
  });
});

describe('AmenitiesPhase', () => {
  const chip = (name: RegExp | string) => screen.getByRole('button', { name });

  it('shows the three groups with iconed chips that toggle', () => {
    render(<AmenitiesPhase />);
    for (const title of ['Security', 'Lifestyle', 'In every home']) {
      expect(screen.getByRole('group', { name: title })).toBeInTheDocument();
    }
    const pool = within(screen.getByRole('group', { name: 'Lifestyle' })).getByRole('button', {
      name: 'Swimming Pool',
    });
    expect(pool.querySelector('svg')).not.toBeNull();
    fireEvent.click(pool);
    expect(store().stepData.amenities_features.amenities).toEqual(['swimming_pool']);
    fireEvent.click(chip('Swimming Pool'));
    expect(store().stepData.amenities_features.amenities).toEqual([]);
  });

  it('add-your-own creates a ticked custom chip in that group', () => {
    render(<AmenitiesPhase />);
    fireEvent.change(screen.getByLabelText('Add your own lifestyle item'), {
      target: { value: 'Padel hall' },
    });
    fireEvent.keyDown(screen.getByLabelText('Add your own lifestyle item'), { key: 'Enter' });
    const custom = within(screen.getByRole('group', { name: 'Lifestyle' })).getByRole('button', {
      name: 'Padel hall',
    });
    expect(custom).toHaveAttribute('aria-pressed', 'true');
    expect(custom.querySelector('svg')).not.toBeNull();
    expect(store().stepData.amenities_features.amenities).toEqual(['Padel hall']);
  });

  it('highlight suggestions come only from entered facts, toggle, cap at 24 chars and 8 total', () => {
    store().saveWorkflowStepData('configuration', { setting: 'gated' } as any);
    render(<AmenitiesPhase />);
    const suggestions = () => within(screen.getByRole('group', { name: 'Highlight suggestions' }));
    expect(suggestions().queryByRole('button', { name: /Clubhouse/ })).not.toBeInTheDocument();
    expect(suggestions().getByRole('button', { name: /Gated community/ })).toBeInTheDocument();

    fireEvent.click(chip('Clubhouse'));
    fireEvent.click(suggestions().getByRole('button', { name: /^Clubhouse$/ }));
    expect(store().getWizardData().highlights).toEqual(['Clubhouse']);
    fireEvent.click(suggestions().getByRole('button', { name: /^Clubhouse$/ }));
    expect(store().getWizardData().highlights).toEqual([]);

    const input = screen.getByLabelText('Add your own highlight') as HTMLInputElement;
    expect(input.maxLength).toBe(24);
    fireEvent.change(input, { target: { value: 'Near schools' } });
    expect(screen.getByTestId('highlight-counter')).toHaveTextContent('12/24');
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' }).at(-1)!);
    expect(store().getWizardData().highlights).toEqual(['Near schools']);
    // Mirrors the stored field the server reads.
    expect(store().stepData.marketing_summary.keySellingPoints).toEqual(['Near schools']);

    for (let i = 0; i < 9; i++) {
      fireEvent.change(input, { target: { value: `Tag ${i}` } });
      fireEvent.keyDown(input, { key: 'Enter' });
    }
    expect(store().getWizardData().highlights).toHaveLength(8);
    expect(screen.getByTestId('highlight-status')).toHaveTextContent('8 of 8');
  });

  it('the live preview shows the first three highlights and "+N more"', () => {
    store().setIdentity({ highlights: ['a', 'b', 'c', 'd', 'e'] } as any);
    const model = buildPreviewModel(store().getWizardData());
    expect(model.highlights).toEqual(['a', 'b', 'c']);
    expect(model.moreHighlights).toBe(2);
  });
});
