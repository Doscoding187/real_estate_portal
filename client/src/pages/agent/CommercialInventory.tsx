import { useState } from 'react';
import { Link } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { trpc } from '@/lib/trpc';
import {
  COMMERCIAL_CONFIRMATION_SOURCE_LABELS,
  COMMERCIAL_CONFIRMATION_SOURCES,
  type CommercialConfirmationSource,
} from '@shared/commercial-domain';

type ConfirmationSource = CommercialConfirmationSource;
type MarketingMediaType = 'image' | 'video' | 'pdf';

const localDateTimeInput = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
};

const commercialUseTypeLabel = (value: string) =>
  value === 'industrial_logistics'
    ? 'Industrial & logistics'
    : value.replace(/_/g, ' ').replace(/^./, character => character.toUpperCase());

const statusLabel = (value: string) => value.replace(/_/g, ' ');

const marketingMediaTypeForFile = (file: Pick<File, 'type'>): MarketingMediaType | null => {
  const contentType = file.type.trim().toLowerCase();
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType === 'application/pdf') return 'pdf';
  return null;
};

export default function CommercialInventory() {
  const inventory = trpc.commercial.myInventory.useQuery();
  const reconfirm = trpc.commercial.reconfirmAvailability.useMutation({
    onSuccess: () => {
      setEditingAvailabilityId(null);
      inventory.refetch();
    },
  });
  const setAvailabilityStatus = trpc.commercial.setAvailabilityStatus.useMutation({
    onSuccess: () => inventory.refetch(),
  });
  const attachMarketingMedia = trpc.commercial.attachMarketingMedia.useMutation();
  const submitForReview = trpc.commercial.submit.useMutation({
    onSuccess: () => inventory.refetch(),
    onError: (error, variables) =>
      setMarketingError({ listingId: variables.listingId, message: error.message }),
  });
  const uploadMedia = trpc.listing.uploadMedia.useMutation();
  const confirmMediaUpload = trpc.listing.confirmMediaUpload.useMutation();
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<number | null>(null);
  const [availabilityState, setAvailabilityState] = useState<
    'available_confirmed' | 'available_upcoming'
  >('available_confirmed');
  const [occupationDate, setOccupationDate] = useState('');
  const [confirmationSource, setConfirmationSource] = useState<ConfirmationSource>('broker');
  const [confirmationSourceLabel, setConfirmationSourceLabel] = useState('');
  const [lastConfirmedAt, setLastConfirmedAt] = useState(() => localDateTimeInput(new Date()));
  const [reconfirmationDueAt, setReconfirmationDueAt] = useState(() =>
    localDateTimeInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadingListingId, setUploadingListingId] = useState<number | null>(null);
  const [marketingError, setMarketingError] = useState<{
    listingId: number;
    message: string;
  } | null>(null);
  const authoringHref = window.location.pathname.startsWith('/agency')
    ? '/agency/commercial/create'
    : '/agent/commercial/create';

  const beginReconfirmation = (item: any) => {
    setEditingAvailabilityId(item.availability.id);
    setAvailabilityState(
      item.availability.state === 'available_upcoming'
        ? 'available_upcoming'
        : 'available_confirmed',
    );
    setOccupationDate(item.availability.occupationDate?.slice(0, 10) || '');
    const source = item.availability.confirmationSource;
    const matchingSource = COMMERCIAL_CONFIRMATION_SOURCES.includes(source);
    setConfirmationSource(matchingSource ? source : 'other');
    setConfirmationSourceLabel(
      source === 'other'
        ? item.availability.confirmationSourceLabel || ''
        : matchingSource
          ? ''
          : item.availability.source || '',
    );
    setLastConfirmedAt(localDateTimeInput(new Date()));
    setReconfirmationDueAt(localDateTimeInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
    setValidationError(null);
  };

  const saveReconfirmation = () => {
    if (editingAvailabilityId == null) return;
    if (availabilityState === 'available_upcoming' && !occupationDate) {
      setValidationError('Enter an occupation date for upcoming availability.');
      return;
    }
    if (confirmationSource === 'other' && !confirmationSourceLabel.trim()) {
      setValidationError('Describe the source of the availability confirmation.');
      return;
    }
    const confirmed = new Date(lastConfirmedAt);
    const due = new Date(reconfirmationDueAt);
    if (!Number.isFinite(confirmed.getTime()) || !Number.isFinite(due.getTime())) {
      setValidationError('Enter valid confirmation and reconfirmation dates.');
      return;
    }
    if (due < confirmed) {
      setValidationError('Reconfirm by must be on or after the confirmation date.');
      return;
    }
    setValidationError(null);
    reconfirm.mutate({
      commercialAvailabilityId: editingAvailabilityId,
      availabilityState,
      occupationDate: occupationDate || null,
      confirmationSource,
      confirmationSourceLabel: confirmationSourceLabel.trim() || null,
      lastConfirmedAt: confirmed.toISOString(),
      reconfirmationDueAt: due.toISOString(),
    });
  };

  const addMarketingMedia = async (listingId: number, file: File) => {
    const type = marketingMediaTypeForFile(file);
    if (!type) {
      setMarketingError({
        listingId,
        message: 'Choose an image, video or PDF for Commercial marketing.',
      });
      return;
    }
    setMarketingError(null);
    setUploadingListingId(listingId);
    try {
      const reservation = await uploadMedia.mutateAsync({
        listingId,
        type,
        filename: file.name,
        contentType: file.type,
      });
      const response = await fetch(reservation.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error('Marketing media upload failed.');
      const confirmed = await confirmMediaUpload.mutateAsync({
        uploadToken: reservation.uploadToken,
      });
      await attachMarketingMedia.mutateAsync({ listingId, uploadToken: confirmed.uploadToken });
      await inventory.refetch();
    } catch (error) {
      setMarketingError({
        listingId,
        message: error instanceof Error ? error.message : 'Unable to attach marketing media.',
      });
    } finally {
      setUploadingListingId(current => (current === listingId ? null : current));
    }
  };

  return (
    <AgentAppShell>
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sky-700">Commercial · Leasing inventory</p>
            <h1 className="text-3xl font-semibold">Manage commercial availability</h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Reconfirm availability before its deadline. Stale records stay out of public discovery
              until a responsible source supplies fresh timing and provenance.
            </p>
          </div>
          <Link href={authoringHref} className="rounded bg-slate-900 px-4 py-2 text-white">
            Create vacancy
          </Link>
        </header>

        {inventory.isLoading ? <p>Loading Commercial inventory…</p> : null}
        {inventory.error ? (
          <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-rose-900">
            {inventory.error.message}
          </p>
        ) : null}
        {!inventory.isLoading && !inventory.error && inventory.data?.length === 0 ? (
          <section className="rounded border border-dashed p-6 text-slate-600">
            No Commercial vacancies have been created yet.
          </section>
        ) : null}

        <section className="space-y-4" aria-label="Commercial inventory">
          {inventory.data?.map((item: any) => {
            const isEditing = editingAvailabilityId === item.availability.id;
            const availabilityStateValue = String(item.availability.state || '');
            const canPrepareForReview = ['draft', 'rejected'].includes(item.listing.status);
            const completedMediaCount = Number(item.marketing?.completedMediaCount || 0);
            const completedImageCount = Number(item.marketing?.completedImageCount || 0);
            const itemMarketingError =
              marketingError && marketingError.listingId === item.listing.id
                ? marketingError.message
                : null;
            return (
              <article key={item.availability.id} className="rounded border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-sky-700">
                      {commercialUseTypeLabel(item.space.useType)} ·{' '}
                      {item.space.kind.replace(/_/g, ' ')}
                    </p>
                    <h2 className="text-xl font-semibold">
                      {item.listing.title || item.space.identifier}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {item.asset.name} · {item.space.identifier} ·{' '}
                      {Number(item.space.rentableAreaM2).toLocaleString('en-ZA')} m²
                    </p>
                  </div>
                  <span
                    className={
                      item.availability.isPubliclyDiscoverable
                        ? 'rounded bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-800'
                        : 'rounded bg-amber-50 px-2 py-1 text-sm font-medium text-amber-900'
                    }
                  >
                    {item.availability.isPubliclyDiscoverable
                      ? 'Publicly discoverable'
                      : 'Not publicly discoverable'}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                  <p>
                    <span className="text-slate-500">Availability:</span>{' '}
                    <b>{item.availability.label}</b>
                    {item.availability.occupationDate
                      ? ` ${item.availability.occupationDate.slice(0, 10)}`
                      : ''}
                  </p>
                  <p>
                    <span className="text-slate-500">Listing:</span>{' '}
                    {statusLabel(item.listing.status)} / {statusLabel(item.listing.approvalStatus)}
                  </p>
                  <p>
                    <span className="text-slate-500">Last confirmed:</span>{' '}
                    {item.availability.confirmedAt?.slice(0, 10) || 'Not supplied'}
                    {item.availability.source ? ` by ${item.availability.source}` : ''}
                  </p>
                  <p>
                    <span className="text-slate-500">Reconfirm by:</span>{' '}
                    {item.availability.reconfirmationDueAt?.slice(0, 10) || 'Not supplied'}
                  </p>
                  <p>
                    <span className="text-slate-500">Marketing media:</span>{' '}
                    {completedMediaCount > 0
                      ? `${completedMediaCount} confirmed file${
                          completedMediaCount === 1 ? '' : 's'
                        }${
                          completedImageCount > 0
                            ? ` (${completedImageCount} image${
                                completedImageCount === 1 ? '' : 's'
                              })`
                            : ''
                        }`
                      : 'No confirmed marketing media'}
                  </p>
                </div>

                {canPrepareForReview ? (
                  <section className="mt-5 space-y-3 border-t pt-5" aria-label="Marketing review">
                    <div>
                      <h3 className="font-semibold">Marketing and review</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Add a confirmed image, video or PDF before submitting this Commercial
                        marketing listing for review. The physical asset and availability remain
                        governed separately.
                      </p>
                    </div>
                    <label className="grid max-w-md gap-1 text-sm">
                      <span>Add marketing media</span>
                      <input
                        aria-label={`Add marketing media to ${item.listing.title || item.space.identifier}`}
                        type="file"
                        accept="image/*,video/*,application/pdf"
                        disabled={uploadingListingId === item.listing.id}
                        onChange={event => {
                          const file = event.target.files?.[0];
                          event.currentTarget.value = '';
                          if (file) void addMarketingMedia(item.listing.id, file);
                        }}
                      />
                    </label>
                    {itemMarketingError ? (
                      <p role="alert" className="text-sm text-rose-700">
                        {itemMarketingError}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                        disabled={completedMediaCount === 0 || submitForReview.isPending}
                        onClick={() => {
                          setMarketingError(null);
                          submitForReview.mutate({ listingId: item.listing.id });
                        }}
                      >
                        Submit for review
                      </button>
                      {completedMediaCount === 0 ? (
                        <p className="self-center text-sm text-slate-600">
                          One confirmed marketing medium is required.
                        </p>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                <section className="mt-5 border-t pt-5" aria-label="Availability lifecycle">
                  <h3 className="font-semibold">Availability lifecycle</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    These actions immediately remove the space from public Commercial discovery.
                    Restoring it requires a fresh availability confirmation.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availabilityStateValue !== 'under_offer' ? (
                      <button
                        type="button"
                        className="rounded border border-amber-300 px-3 py-2 text-sm font-medium text-amber-900 disabled:opacity-50"
                        disabled={setAvailabilityStatus.isPending}
                        onClick={() =>
                          setAvailabilityStatus.mutate({
                            commercialAvailabilityId: item.availability.id,
                            availabilityState: 'under_offer',
                          })
                        }
                      >
                        Mark under offer
                      </button>
                    ) : null}
                    {availabilityStateValue !== 'occupied' ? (
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
                        disabled={setAvailabilityStatus.isPending}
                        onClick={() =>
                          setAvailabilityStatus.mutate({
                            commercialAvailabilityId: item.availability.id,
                            availabilityState: 'occupied',
                          })
                        }
                      >
                        Mark occupied
                      </button>
                    ) : null}
                    {availabilityStateValue !== 'withdrawn' ? (
                      <button
                        type="button"
                        className="rounded border border-rose-300 px-3 py-2 text-sm font-medium text-rose-800 disabled:opacity-50"
                        disabled={setAvailabilityStatus.isPending}
                        onClick={() =>
                          setAvailabilityStatus.mutate({
                            commercialAvailabilityId: item.availability.id,
                            availabilityState: 'withdrawn',
                          })
                        }
                      >
                        Withdraw vacancy
                      </button>
                    ) : null}
                  </div>
                  {setAvailabilityStatus.error ? (
                    <p role="alert" className="mt-2 text-sm text-rose-700">
                      {setAvailabilityStatus.error.message}
                    </p>
                  ) : null}
                </section>

                {!isEditing ? (
                  <button
                    type="button"
                    className="mt-4 rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800"
                    onClick={() => beginReconfirmation(item)}
                  >
                    {['under_offer', 'occupied', 'withdrawn'].includes(availabilityStateValue)
                      ? 'Restore with fresh confirmation'
                      : 'Reconfirm availability'}
                  </button>
                ) : (
                  <section
                    className="mt-5 space-y-4 border-t pt-5"
                    aria-label="Reconfirm availability"
                  >
                    <h3 className="font-semibold">Reconfirm availability</h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="grid gap-1 text-sm">
                        <span>Availability</span>
                        <select
                          aria-label="Availability"
                          className="rounded border p-2"
                          value={availabilityState}
                          onChange={event =>
                            setAvailabilityState(
                              event.target.value as 'available_confirmed' | 'available_upcoming',
                            )
                          }
                        >
                          <option value="available_confirmed">Available now — confirmed</option>
                          <option value="available_upcoming">Available from a future date</option>
                        </select>
                      </label>
                      {availabilityState === 'available_upcoming' ? (
                        <label className="grid gap-1 text-sm">
                          <span>Occupation date</span>
                          <input
                            aria-label="Occupation date"
                            className="rounded border p-2"
                            type="date"
                            value={occupationDate}
                            onChange={event => setOccupationDate(event.target.value)}
                          />
                        </label>
                      ) : null}
                      <label className="grid gap-1 text-sm">
                        <span>Confirmed at</span>
                        <input
                          aria-label="Confirmed at"
                          className="rounded border p-2"
                          type="datetime-local"
                          value={lastConfirmedAt}
                          onChange={event => setLastConfirmedAt(event.target.value)}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span>Reconfirm by</span>
                        <input
                          aria-label="Reconfirm by"
                          className="rounded border p-2"
                          type="datetime-local"
                          value={reconfirmationDueAt}
                          onChange={event => setReconfirmationDueAt(event.target.value)}
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span>Confirmation source</span>
                        <select
                          aria-label="Confirmation source"
                          className="rounded border p-2"
                          value={confirmationSource}
                          onChange={event =>
                            setConfirmationSource(event.target.value as ConfirmationSource)
                          }
                        >
                          {COMMERCIAL_CONFIRMATION_SOURCES.map(source => (
                            <option key={source} value={source}>
                              {COMMERCIAL_CONFIRMATION_SOURCE_LABELS[source]}
                            </option>
                          ))}
                        </select>
                      </label>
                      {confirmationSource === 'other' ? (
                        <label className="grid gap-1 text-sm">
                          <span>Confirmation source details</span>
                          <input
                            aria-label="Confirmation source details"
                            className="rounded border p-2"
                            value={confirmationSourceLabel}
                            onChange={event => setConfirmationSourceLabel(event.target.value)}
                          />
                        </label>
                      ) : null}
                    </div>
                    {validationError ? (
                      <p role="alert" className="text-sm text-rose-700">
                        {validationError}
                      </p>
                    ) : null}
                    {reconfirm.error ? (
                      <p role="alert" className="text-sm text-rose-700">
                        {reconfirm.error.message}
                      </p>
                    ) : null}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                        disabled={reconfirm.isPending}
                        onClick={saveReconfirmation}
                      >
                        Save fresh confirmation
                      </button>
                      <button
                        type="button"
                        className="rounded border px-3 py-2 text-sm"
                        onClick={() => setEditingAvailabilityId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </section>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </AgentAppShell>
  );
}
