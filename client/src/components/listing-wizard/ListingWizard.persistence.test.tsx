import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMutation as useQueryMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { hydrateListingWizardForUser, useListingWizardStore } from '@/hooks/useListingWizard';

const harness = vi.hoisted(() => ({
  user: { id: 101, role: 'agent' },
  create: vi.fn(),
  update: vi.fn(),
  review: vi.fn(),
  inventory: vi.fn(),
  read: vi.fn(),
  navigate: vi.fn(),
  realMutations: false,
}));
const client = {
  listing: { getById: { query: harness.read }, myListings: { query: harness.inventory } },
};
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ client }),
    listing: {
      create: {
        useMutation: (options?: { retry?: boolean }) => {
          const mutation = useQueryMutation(
            { mutationFn: (input: unknown) => harness.create(input), ...options },
            queryClient,
          );
          return harness.realMutations ? mutation : { mutateAsync: harness.create };
        },
      },
      update: {
        useMutation: (options?: { retry?: boolean }) => {
          const mutation = useQueryMutation(
            { mutationFn: (input: unknown) => harness.update(input), ...options },
            queryClient,
          );
          return harness.realMutations ? mutation : { mutateAsync: harness.update };
        },
      },
      submitForReview: {
        useMutation: (options?: { retry?: boolean }) => {
          const mutation = useQueryMutation(
            { mutationFn: (input: unknown) => harness.review(input), ...options },
            queryClient,
          );
          return harness.realMutations ? mutation : { mutateAsync: harness.review };
        },
      },
      getSubmissionPreflight: {
        useQuery: () => ({
          data: { canPrepareDraft: true, canStartListing: false },
          isLoading: false,
        }),
      },
    },
    canvassing: { getListingPrefill: { useQuery: () => ({}) } },
  },
}));
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: harness.user, loading: false }),
}));
vi.mock('wouter', async original => {
  const actual = await original<typeof import('wouter')>();
  return {
    ...actual,
    useLocation: () => {
      const [path, navigate] = actual.useLocation();
      return [
        path,
        (to: string) => {
          harness.navigate(to);
          navigate(to);
        },
      ];
    },
  };
});
vi.mock('@/lib/readiness', () => ({
  calculateListingReadiness: () => ({ score: 100, missing: [] }),
}));
vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: () => ({ lastSaved: null, isSaving: false, error: null }),
}));
vi.mock('@/components/wizard/DraftManager', () => ({
  DraftManager: ({ open, onResume, onStartFresh }: any) =>
    open ? (
      <div>
        <button onClick={onResume}>Resume device copy</button>
        <button onClick={onStartFresh}>Discard device copy</button>
      </div>
    ) : null,
}));
vi.mock('./steps/ActionStep', () => ({ default: () => <div>Intent step</div> }));
vi.mock('./steps/PropertyTypeStep', () => ({ default: () => null }));
vi.mock('./steps/BasicInformationStep', () => ({ default: () => null }));
vi.mock('./steps/AdditionalInformationStep', () => ({ AdditionalInformationStep: () => null }));
vi.mock('./steps/PricingStep', () => ({ default: () => null }));
vi.mock('./steps/LocationStep', () => ({ default: () => null }));
vi.mock('./steps/MediaUploadStep', () => ({ default: () => null }));
vi.mock('./steps/PreviewStep', () => ({ default: () => null }));
import ListingWizard from './ListingWizard';

const title = 'A private fixture family home';
const description =
  'A carefully described fixture family home with enough detail for the existing draft input contract.';
const place = {
  canonicalPlaceId: 'pl-place-01-000000000000000000000001',
  label: 'Fixture locality',
  scope: 'locality' as const,
  placeType: 'suburb',
  administrativeContext: 'Fixture province',
};
function seed() {
  const s = useListingWizardStore.getState();
  s.setAction('sell');
  s.setPropertyType('house');
  s.setTitle(title);
  s.setDescription(description);
  s.setPricing({ askingPrice: 1000000 });
  s.setLocation({
    address: '',
    city: '',
    province: '',
    latitude: null,
    longitude: null,
    canonicalPlace: place,
    privateAddress: { streetName: 'Example Street' },
    coordinateSource: 'manual_confirmed',
    locationConfirmationState: 'confirmed',
    publicLocationPrecision: 'approximate',
  });
}
async function open() {
  const view = render(<ListingWizard />);
  await screen.findByRole('button', { name: 'Save private draft' });
  await act(async () => {
    seed();
  });
  return view;
}
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save private draft' }));
function serverRecord(id = 88, status = 'draft') {
  return {
    property: {
      id,
      status,
      title,
      description,
      action: 'sell',
      propertyType: 'house',
      pricing: { askingPrice: 1000000 },
      propertyDetails: {},
      canonicalPlace: place,
      privateAddress: { streetName: 'Example Street' },
      coordinateSource: 'manual_confirmed',
      locationConfirmationState: 'confirmed',
    },
    media: [
      {
        id: 45,
        mediaType: 'image',
        url: '/api/media/fixture.png',
        isPrimary: true,
        processingStatus: 'completed',
      },
    ],
  };
}
beforeEach(async () => {
  harness.realMutations = false;
  queryClient.clear();
  localStorage.clear();
  window.history.replaceState({}, '', '/listings/create');
  harness.user = { id: 101, role: 'agent' };
  harness.create.mockResolvedValue({ id: 88, status: 'draft' });
  harness.inventory.mockResolvedValue([{ id: 88, title }]);
  harness.update.mockResolvedValue({ success: true });
  harness.read.mockResolvedValue(serverRecord());
  await hydrateListingWizardForUser(null);
});

describe('private draft wizard orchestration (mocked APIs)', () => {
  it('does not replay a failed create under the actual production QueryClient retry defaults', async () => {
    harness.realMutations = true;
    harness.create.mockRejectedValue(new Error('Request result unknown'));
    await open();
    save();
    await screen.findByText(/A save may already have created your draft/, {}, { timeout: 4000 });
    expect(harness.create).toHaveBeenCalledOnce();
    expect(harness.review).not.toHaveBeenCalled();
    expect(localStorage.getItem('listing-wizard-create-uncertain:101')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Save private draft' })).toBeDisabled();
  });

  it.each(['missing', 'stale'] as const)(
    'restores a stored server draft before enabling save with %s device data, including another reload',
    async deviceCopy => {
      await hydrateListingWizardForUser(101);
      if (deviceCopy === 'stale') {
        seed();
        useListingWizardStore.getState().setTitle('Stale device-only family home');
        useListingWizardStore.getState().addMedia({
          id: 'existing:99',
          file: null as any,
          url: '/api/media/stale.png',
          type: 'image',
          displayOrder: 0,
          isPrimary: true,
          processingStatus: 'completed',
        });
      }
      localStorage.setItem('listing-wizard-server-draft:101', '88');
      let resolve!: (value: ReturnType<typeof serverRecord>) => void;
      harness.read.mockImplementationOnce(
        () =>
          new Promise(r => {
            resolve = r;
          }),
      );
      const view = render(<ListingWizard />);
      await waitFor(() => expect(harness.read).toHaveBeenCalledWith({ id: 88 }));
      expect(screen.queryByRole('button', { name: 'Save private draft' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Submit Listing' })).not.toBeInTheDocument();
      expect(harness.update).not.toHaveBeenCalled();
      await act(async () => {
        resolve(serverRecord());
      });

      await waitFor(() => expect(useListingWizardStore.getState().title).toBe(title));
      await screen.findByRole('button', { name: 'Save private draft' });
      expect(useListingWizardStore.getState()).toMatchObject({
        description,
        pricing: { askingPrice: 1000000 },
        location: { canonicalPlace: place, privateAddress: { streetName: 'Example Street' } },
        media: [{ id: 'existing:45', url: '/api/media/fixture.png' }],
        mainMediaId: 'existing:45',
      });
      save();
      await screen.findByText('Private draft saved to your account');
      expect(harness.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 88, title, description, mediaIds: ['existing:45'] }),
      );

      view.unmount();
      // Keep the account's draft pointer, but discard all device form content.
      await hydrateListingWizardForUser(null);
      localStorage.removeItem('listing-wizard-storage');
      render(<ListingWizard />);
      await screen.findByRole('button', { name: 'Save private draft' });
      expect(harness.read).toHaveBeenCalledTimes(2);
      expect(useListingWizardStore.getState().title).toBe(title);
      expect(useListingWizardStore.getState().media.map(m => m.id)).toEqual(['existing:45']);
      save();
      await waitFor(() => expect(harness.update).toHaveBeenCalledTimes(2));
      expect(harness.update.mock.calls[1][0]).toMatchObject({
        id: 88,
        title,
        mediaIds: ['existing:45'],
      });
      expect(localStorage.getItem('listing-wizard-server-draft:101')).toBe('88');
      expect(harness.create).not.toHaveBeenCalled();
      expect(harness.review).not.toHaveBeenCalled();
    },
  );

  it('starting fresh during a saved-draft lookup cannot restore its old listing ID', async () => {
    await hydrateListingWizardForUser(101);
    seed();
    localStorage.setItem('listing-wizard-server-draft:101', '88');
    let resolve!: (value: ReturnType<typeof serverRecord>) => void;
    harness.read.mockImplementationOnce(
      () =>
        new Promise(r => {
          resolve = r;
        }),
    );
    render(<ListingWizard />);
    await screen.findByRole('button', { name: 'Discard device copy' });
    fireEvent.click(screen.getByRole('button', { name: 'Discard device copy' }));
    await screen.findByRole('button', { name: 'Save private draft' });
    act(seed);
    await act(async () => {
      resolve(serverRecord());
    });
    save();
    await screen.findByText('Private draft saved to your account');
    expect(harness.create).toHaveBeenCalledOnce();
    expect(harness.update).not.toHaveBeenCalled();
  });

  it('does not replace another owned draft with a late create response after query navigation', async () => {
    let resolve!: (value: any) => void;
    harness.create.mockImplementation(
      () =>
        new Promise(r => {
          resolve = r;
        }),
    );
    await open();
    save();
    const other = serverRecord(99);
    other.property.title = 'Another owned private family home';
    harness.read.mockResolvedValue(other);
    await act(async () => {
      window.history.pushState({}, '', '/listings/create?id=99&edit=true');
    });
    await waitFor(() => expect(useListingWizardStore.getState().title).toBe(other.property.title));
    await act(async () => {
      resolve({ id: 88, status: 'draft' });
    });
    expect(useListingWizardStore.getState().title).toBe(other.property.title);
    expect(localStorage.getItem('listing-wizard-server-draft:101')).not.toBe('88');
    save();
    await waitFor(() =>
      expect(harness.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 99, title: other.property.title }),
      ),
    );
    expect(harness.create).toHaveBeenCalledOnce();
  });

  it('does not submit the previous draft after navigation while its update is pending', async () => {
    window.history.replaceState({}, '', '/listings/create?id=88&edit=true');
    let resolve!: (value: any) => void;
    harness.update.mockImplementation(
      () =>
        new Promise(r => {
          resolve = r;
        }),
    );
    render(<ListingWizard />);
    await waitFor(() => expect(useListingWizardStore.getState().title).toBe(title));
    act(() => useListingWizardStore.setState({ currentStep: 8, validate: () => true }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Listing' }));
    expect(harness.update).toHaveBeenCalledOnce();
    const other = serverRecord(99);
    other.property.title = 'Another owned private family home';
    harness.read.mockResolvedValue(other);
    await act(async () => {
      window.history.pushState({}, '', '/listings/create?id=99&edit=true');
    });
    await waitFor(() => expect(useListingWizardStore.getState().title).toBe(other.property.title));
    await act(async () => {
      resolve({ success: true, status: 'draft' });
    });
    expect(harness.review).not.toHaveBeenCalled();
    expect(useListingWizardStore.getState().title).toBe(other.property.title);
    expect(window.location.search).toBe('?id=99&edit=true');
  });

  it('allows the newly opened draft to save without a stale completion releasing its pending guard', async () => {
    window.history.replaceState({}, '', '/listings/create?id=88&edit=true');
    let finishOld!: (value: any) => void;
    let finishNew!: (value: any) => void;
    harness.update
      .mockImplementationOnce(
        () =>
          new Promise(r => {
            finishOld = r;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise(r => {
            finishNew = r;
          }),
      );
    render(<ListingWizard />);
    await waitFor(() => expect(useListingWizardStore.getState().title).toBe(title));
    save();
    expect(harness.update).toHaveBeenCalledOnce();
    const other = serverRecord(99);
    other.property.title = 'Another owned private family home';
    harness.read.mockResolvedValue(other);
    await act(async () => {
      window.history.pushState({}, '', '/listings/create?id=99&edit=true');
    });
    await waitFor(() => expect(useListingWizardStore.getState().title).toBe(other.property.title));
    save();
    expect(harness.update).toHaveBeenCalledTimes(2);
    await act(async () => {
      finishOld({ success: true });
    });
    expect(screen.getByRole('button', { name: 'Saving private draft...' })).toBeDisabled();
    expect(screen.queryByText('Private draft saved to your account')).not.toBeInTheDocument();
    await act(async () => {
      finishNew({ success: true });
    });
    await screen.findByText('Private draft saved to your account');
    expect(harness.update.mock.calls[1][0]).toMatchObject({ id: 99, title: other.property.title });
  });

  it('creates with zero media while commercial activation is held, then updates the same ID without review', async () => {
    await open();
    save();
    await screen.findByText('Private draft saved to your account');
    expect(harness.create).toHaveBeenCalledOnce();
    expect(harness.create.mock.calls[0][0]).toMatchObject({
      mediaIds: [],
      location: { version: 2, coordinateSource: 'manual_confirmed' },
    });
    await act(async () => {
      useListingWizardStore.getState().setTitle('Updated private fixture family home');
    });
    save();
    await waitFor(() =>
      expect(harness.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 88, title: 'Updated private fixture family home' }),
      ),
    );
    expect(harness.create).toHaveBeenCalledOnce();
    expect(harness.review).not.toHaveBeenCalled();
  });
  it('guards concurrent clicks before React can repaint', async () => {
    let resolve!: (value: any) => void;
    harness.create.mockImplementation(
      () =>
        new Promise(r => {
          resolve = r;
        }),
    );
    await open();
    const button = screen.getByRole('button', { name: 'Save private draft' });
    act(() => {
      button.click();
      button.click();
    });
    expect(harness.create).toHaveBeenCalledOnce();
    await act(async () => {
      resolve({ id: 88, status: 'draft' });
    });
  });
  it('retains input and blocks another create after an error that may follow insertion, including reload', async () => {
    harness.create.mockRejectedValue(new Error('Readiness failed after insert'));
    const view = await open();
    save();
    await screen.findByText(/A save may already have created your draft/);
    expect(useListingWizardStore.getState().title).toBe(title);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save private draft' })).toBeDisabled(),
    );
    view.unmount();
    render(<ListingWizard />);
    await screen.findByRole('button', { name: 'Resume device copy' });
    fireEvent.click(screen.getByRole('button', { name: 'Resume device copy' }));
    await screen.findByText(/A save may already have created your draft/);
    save();
    expect(harness.create).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Check saved drafts' }));
    await screen.findByLabelText('Choose your saved draft');
    fireEvent.change(screen.getByLabelText('Choose your saved draft'), { target: { value: '88' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue with this saved draft' }));
    await waitFor(() =>
      expect(harness.navigate).toHaveBeenCalledWith('/listings/create?id=88&edit=true'),
    );
    expect(harness.read).toHaveBeenCalledWith({ id: 88 });
    expect(localStorage.getItem('listing-wizard-create-uncertain:101')).toBeNull();
  });
  it('rejects invalid canonical geography and missing required fields before create', async () => {
    await open();
    act(() =>
      useListingWizardStore.getState().setLocation({
        ...useListingWizardStore.getState().location!,
        canonicalPlace: place,
        canonicalLocationRefusal: 'Unavailable fixture locality',
        locationConfirmationState: 'confirmed',
      }),
    );
    save();
    await waitFor(() =>
      expect(
        screen.getByText(/unavailable selected location/i, { selector: 'p.text-red-800' }),
      ).toBeInTheDocument(),
    );
    expect(harness.create).not.toHaveBeenCalled();
    expect(localStorage.getItem('listing-wizard-create-uncertain:101')).toBeNull();
    act(() => {
      seed();
      useListingWizardStore.getState().setTitle('short');
    });
    save();
    await waitFor(() =>
      expect(screen.getByText(/title/, { selector: 'p.text-red-800' })).toBeInTheDocument(),
    );
    expect(harness.create).not.toHaveBeenCalled();
  });
  it('hydrates an edit route using a fresh server read with no device data, and persists existing image references', async () => {
    window.history.replaceState({}, '', '/listings/create?id=88&edit=true');
    render(<ListingWizard />);
    await waitFor(() => expect(useListingWizardStore.getState().title).toBe(title));
    expect(harness.read).toHaveBeenCalledWith({ id: 88 });
    expect(useListingWizardStore.getState().media[0].id).toBe('existing:45');
    save();
    await waitFor(() =>
      expect(harness.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 88, mediaIds: ['existing:45'] }),
      ),
    );
    expect(harness.create).not.toHaveBeenCalled();
    expect(harness.review).not.toHaveBeenCalled();
  });
  it('opens a published owned listing at Preview and returns there after a section edit', async () => {
    harness.read.mockResolvedValue(serverRecord(88, 'published'));
    window.history.replaceState({}, '', '/listings/create?id=88&edit=true');
    render(<ListingWizard />);
    await waitFor(() => expect(useListingWizardStore.getState().currentStep).toBe(8));
    expect(useListingWizardStore.getState().title).toBe(title);
    expect(useListingWizardStore.getState().media[0].id).toBe('existing:45');
    expect(screen.getByText(/Your saved listing is loaded/)).toBeInTheDocument();
    act(() => useListingWizardStore.getState().prevStep());
    fireEvent.click(screen.getByRole('button', { name: 'Return to Preview' }));
    expect(useListingWizardStore.getState().currentStep).toBe(8);
    expect(harness.create).not.toHaveBeenCalled();
    expect(harness.update).not.toHaveBeenCalled();
    expect(harness.review).not.toHaveBeenCalled();
  });
  it('opens an incomplete owned draft at the first missing section', async () => {
    window.history.replaceState({}, '', '/listings/create?id=88&edit=true');
    render(<ListingWizard />);
    await waitFor(() => expect(useListingWizardStore.getState().title).toBe(title));
    expect(useListingWizardStore.getState().currentStep).toBe(3);
    expect(useListingWizardStore.getState().completedSteps).toEqual([1, 2]);
    expect(screen.queryByRole('button', { name: 'Return to Preview' })).not.toBeInTheDocument();
    expect(harness.update).not.toHaveBeenCalled();
  });
  it('keeps the confirmed ID and visible error on a failed update', async () => {
    harness.realMutations = true;
    await open();
    save();
    await screen.findByText('Private draft saved to your account');
    harness.update.mockRejectedValue(new Error('Update unavailable'));
    save();
    await screen.findByText('Update unavailable', {}, { timeout: 4000 });
    expect(harness.update).toHaveBeenCalledOnce();
    expect(localStorage.getItem('listing-wizard-server-draft:101')).toBe('88');
    expect(useListingWizardStore.getState().title).toBe(title);
    harness.update.mockResolvedValue({ success: true });
    save();
    await waitFor(() => expect(harness.update).toHaveBeenCalledTimes(2));
    expect(harness.create).toHaveBeenCalledOnce();
  });
  it('does not copy an in-flight result, form, or media into another account', async () => {
    let resolve!: (value: any) => void;
    harness.create.mockImplementation(
      () =>
        new Promise(r => {
          resolve = r;
        }),
    );
    const view = await open();
    save();
    harness.user = { id: 202, role: 'agent' };
    view.rerender(<ListingWizard />);
    await waitFor(() => expect(useListingWizardStore.getState().persistedOwnerId).toBe(202));
    await act(async () => {
      resolve({ id: 88, status: 'draft' });
    });
    expect(useListingWizardStore.getState()).toMatchObject({
      title: '',
      media: [],
      persistedOwnerId: 202,
    });
    expect(localStorage.getItem('listing-wizard-server-draft:202')).toBeNull();
    expect(screen.queryByText('Private draft saved to your account')).not.toBeInTheDocument();
    expect(harness.review).not.toHaveBeenCalled();
  });
  it.each(['edit route', 'stored pointer'])(
    'fails closed on a wrong-owner server read from the %s',
    async source => {
      if (source === 'edit route')
        window.history.replaceState({}, '', '/listings/create?id=88&edit=true');
      else localStorage.setItem('listing-wizard-server-draft:101', '88');
      harness.read.mockRejectedValue(new Error('FORBIDDEN'));
      render(<ListingWizard />);
      await screen.findByText(/Saved listing access could not be verified/);
      expect(screen.queryByRole('button', { name: 'Save private draft' })).not.toBeInTheDocument();
      expect(useListingWizardStore.getState().title).toBe('');
    },
  );
  it('never labels a pending-review edit as a private draft save', async () => {
    window.history.replaceState({}, '', '/listings/create?id=88&edit=true');
    harness.read.mockResolvedValue(serverRecord(88, 'pending_review'));
    render(<ListingWizard />);
    await waitFor(() => expect(useListingWizardStore.getState().title).toBe(title));
    expect(screen.queryByRole('button', { name: 'Save private draft' })).not.toBeInTheDocument();
    expect(harness.update).not.toHaveBeenCalled();
  });
  it('starting a new draft leaves the previous server draft intact', async () => {
    await open();
    save();
    await screen.findByText('Private draft saved to your account');
    fireEvent.click(screen.getByRole('button', { name: 'Start a new draft' }));
    act(seed);
    save();
    await waitFor(() => expect(harness.create).toHaveBeenCalledTimes(2));
    expect(harness.update).not.toHaveBeenCalled();
  });
  it('submits the same saved ID and retains it after review denial', async () => {
    harness.realMutations = true;
    await open();
    save();
    await screen.findByText('Private draft saved to your account');
    harness.review.mockRejectedValue(new Error('Commercial activation held'));
    act(() => {
      useListingWizardStore.setState({ currentStep: 8, validate: () => true });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Listing' }));
    await waitFor(() => expect(harness.review).toHaveBeenCalledWith({ listingId: 88 }));
    await waitFor(
      () => expect(screen.getByRole('button', { name: 'Submit Listing' })).not.toBeDisabled(),
      { timeout: 4000 },
    );
    expect(harness.review).toHaveBeenCalledOnce();
    expect(harness.create).toHaveBeenCalledOnce();
    expect(harness.update).toHaveBeenCalledWith(expect.objectContaining({ id: 88 }));
    expect(localStorage.getItem('listing-wizard-server-draft:101')).toBe('88');
    expect(useListingWizardStore.getState().title).toBe(title);
  });
  it('does not hydrate a late server read from the previous account', async () => {
    window.history.replaceState({}, '', '/listings/create?id=88&edit=true');
    let resolve!: (value: ReturnType<typeof serverRecord>) => void;
    harness.read
      .mockImplementationOnce(
        () =>
          new Promise(r => {
            resolve = r;
          }),
      )
      .mockRejectedValue(new Error('FORBIDDEN'));
    const view = render(<ListingWizard />);
    await waitFor(() => expect(harness.read).toHaveBeenCalledOnce());
    harness.user = { id: 202, role: 'agent' };
    view.rerender(<ListingWizard />);
    await screen.findByText(/Saved listing access could not be verified/);
    await act(async () => {
      resolve(serverRecord());
    });
    expect(useListingWizardStore.getState()).toMatchObject({
      persistedOwnerId: 202,
      title: '',
      media: [],
    });
    expect(screen.queryByRole('button', { name: 'Save private draft' })).not.toBeInTheDocument();
  });
  it('Open saved draft reacts to a query-only route change and reloads from the server', async () => {
    await open();
    save();
    await screen.findByText('Private draft saved to your account');
    act(() => {
      useListingWizardStore.getState().reset();
      localStorage.clear();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open saved draft' }));
    await waitFor(() => expect(harness.read).toHaveBeenCalledWith({ id: 88 }));
    await waitFor(() => expect(useListingWizardStore.getState().title).toBe(title));
    expect(useListingWizardStore.getState().media[0].id).toBe('existing:45');
    expect(window.location.search).toBe('?id=88&edit=true');
  });
});
