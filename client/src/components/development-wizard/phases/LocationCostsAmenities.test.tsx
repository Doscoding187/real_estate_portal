import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  user: { id: 1, role: 'property_developer' } as { id: number; role: string },
  publisher: null as { cataloguePublisherId: number } | null,
  derived: null as null | { placeId: string; suburb: string; city: string; distanceKm: number },
}));

vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/hooks/usePublisherContext', () => ({
  usePublisherContext: () => ({ context: auth.publisher }),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: {
      locateByPoint: {
        useQuery: (_input: unknown, opts: { enabled?: boolean }) => ({
          data: opts?.enabled ? (auth.derived ?? null) : undefined,
          isLoading: false,
          isFetching: false,
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
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { buildDevelopmentSubmitPayload } from '@/lib/developmentSubmitPayload';
import { buildPreviewModel } from '@/components/wizard/previewModel';
import { LocationPhase } from './LocationPhase';
import { EstateProfilePhase } from './EstateProfilePhase';
import { AmenitiesPhase } from './AmenitiesPhase';

const store = () => useDevelopmentWizard.getState();

beforeEach(() => {
  localStorage.clear();
  store().reset();
  auth.user = { id: 1, role: 'property_developer' };
  auth.publisher = null;
  auth.derived = null;
});

describe('LocationPhase', () => {
  it('marks the address and the map pin required and keeps manual latitude/longitude entry', () => {
    render(<LocationPhase />);
    expect(screen.getByText('(required)')).toBeInTheDocument();
    expect(screen.getByText(/Drop the pin at the entrance or show house \(required\)/)).toBeInTheDocument();
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

  it('an address search fills the pin automatically', () => {
    render(<LocationPhase />);
    fireEvent.click(screen.getByText('Search address (mock)'));
    expect(store().getWizardData().location).toMatchObject({
      address: '499 Boundary Road, Kya Sand',
      postalCode: '2169',
      latitude: '-26.0412',
      longitude: '27.9561',
    });
    expect((screen.getByLabelText('Latitude') as HTMLInputElement).value).toBe('-26.0412');
  });

  it('"No street address yet" makes the address optional but the pin stays required', () => {
    render(<LocationPhase />);
    fireEvent.click(screen.getByLabelText(/No street address yet/));
    expect(store().getWizardData().location).toMatchObject({ noOfficialStreet: true });
    expect(screen.getByText('(optional)')).toBeInTheDocument();
    expect(screen.getByText(/Drop the pin at the entrance or show house/)).toBeInTheDocument();
  });

  it('the hand-pick suburb picker is gone for everyone', () => {
    auth.user = { id: 2, role: 'super_admin' };
    auth.publisher = { cataloguePublisherId: 44 };
    render(<LocationPhase />);
    expect(screen.queryByText('Suburb shown to buyers')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Start typing, e\.g\. North Riding/)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows the suburb derived from the pin read-only, keeps it for the assignment and in the preview', async () => {
    auth.user = { id: 2, role: 'super_admin' };
    auth.publisher = { cataloguePublisherId: 44 };
    auth.derived = { placeId: 'place_north_riding', suburb: 'North Riding', city: 'Johannesburg', distanceKm: 0.4 };
    render(<LocationPhase />);
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '-26.05' } });
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '28.01' } });
    expect(await screen.findByText(/North Riding, Johannesburg — from the map pin/, {}, { timeout: 2000 })).toBeInTheDocument();
    await waitFor(() => expect((store().getWizardData().location as any).suburbPlaceId).toBe('place_north_riding'));
    expect((store().getWizardData().location as any).suburbLabel).toBe('North Riding');
    expect(buildPreviewModel(store().getWizardData()).locationLabel).toBe('North Riding, Johannesburg');
  });

  it('says so when the pin matches no suburb, and a developer still gets the read-only suggestion', async () => {
    auth.derived = null;
    render(<LocationPhase />);
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '10' } });
    expect(await screen.findByText(/couldn’t match this pin to a suburb/, {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText(/A reviewer confirms the suburb/)).toBeInTheDocument();
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
      levyRange: { min: 0, max: 0 },
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
