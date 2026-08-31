import { type FormEvent, useState } from 'react';
import { Link } from 'wouter';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { hasCanonicalLocationIdentity } from '@/lib/locationDiscovery';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import type { LocationNode } from '@/types/location';
import {
  SHARED_LIVING_ACCOMMODATION_LABELS,
  SHARED_LIVING_ACCOMMODATION_TYPES,
  SHARED_LIVING_MARKET_TAGS,
  SHARED_LIVING_PLACE_KINDS,
} from '@shared/sharedLivingDomain';

const EMPTY_THREAD_TOKEN = '00000000-0000-0000-0000-000000000000';

type DraftResult = { placeId: number; spaceId: number; slug: string };
type Place = {
  id: number;
  slug: string;
  status: string;
  spaces: Array<{ id: number; slug: string; label: string; status: string }>;
};

function asMinorUnits(value: FormDataEntryValue | null, rentUnknown: boolean): number | undefined {
  if (rentUnknown) return undefined;
  const wholeRand = Number(value || 0);
  return Number.isSafeInteger(wholeRand) && wholeRand > 0 ? wholeRand * 100 : undefined;
}

/**
 * The server owns authority checks. This page lets an owner create a draft
 * before phone verification, then makes the submit-for-review boundary clear.
 */
export default function SharedLivingLister() {
  const { user } = useAuth();
  const verification = trpc.sharedLiving.verificationStatus.useQuery();
  const myListings = trpc.sharedLiving.myPlaces.useQuery();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Shared Living · List a space</p>
        <h1 className="text-2xl font-semibold">List your room or small place</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Save a private draft first. A verified phone number and moderation approval are required
          before it can appear in Shared Living search.
        </p>
      </header>

      {!verification.isLoading && !verification.data?.phoneVerified && <PhoneVerificationPanel />}
      {verification.data?.phoneVerified && (
        <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          ✓ Phone verified — you can submit complete drafts for review.
        </p>
      )}

      <CreateListingForm
        actorRole={user?.role}
        phoneVerified={Boolean(verification.data?.phoneVerified)}
      />
      <MyPlaces
        places={(myListings.data?.places ?? []) as Place[]}
        phoneVerified={Boolean(verification.data?.phoneVerified)}
      />
      <ListerInbox />
    </main>
  );
}

function PhoneVerificationPanel() {
  const utils = trpc.useUtils();
  const [phone, setPhone] = useState('+27');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState<{ devCode?: string } | null>(null);
  const send = trpc.sharedLiving.sendPhoneOtp.useMutation({
    onSuccess: result =>
      setOtpSent(result.status === 'dev_mode' ? { devCode: result.devCode } : {}),
    onError: () => setOtpSent(null),
  });
  const verify = trpc.sharedLiving.verifyPhoneOtp.useMutation({
    onSuccess: () => void utils.sharedLiving.verificationStatus.invalidate(),
  });

  return (
    <section className="rounded border bg-white p-5">
      <h2 className="text-lg font-semibold">Verify your phone before publishing</h2>
      <p className="mt-1 text-sm text-slate-600">
        You can still save and edit a draft while this is outstanding.
      </p>
      {!otpSent ? (
        <>
          <input
            aria-label="Mobile number"
            className="mt-2 w-full max-w-sm rounded border p-2"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            placeholder="+27 82 000 0000"
          />
          <button
            type="button"
            className="mt-2 block rounded bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
            disabled={send.isPending}
            onClick={() => send.mutate({ phone })}
          >
            Send code
          </button>
        </>
      ) : (
        <>
          {otpSent.devCode && (
            <p
              data-testid="dev-otp"
              className="mb-2 rounded border border-dashed border-slate-300 p-2 text-sm"
            >
              Dev mode code: <strong>{otpSent.devCode}</strong>
            </p>
          )}
          <input
            aria-label="Verification code"
            className="w-full max-w-xs rounded border p-2"
            value={code}
            onChange={event => setCode(event.target.value)}
            placeholder="Verification code"
          />
          <button
            type="button"
            className="mt-2 block rounded bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
            disabled={verify.isPending}
            onClick={() => verify.mutate({ phone, code })}
          >
            Verify
          </button>
        </>
      )}
      {(send.isPending || verify.isPending) && (
        <p className="mt-1 text-sm text-slate-500">Working…</p>
      )}
      {send.error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {send.error.message}
        </p>
      )}
      {verify.error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {verify.error.message}
        </p>
      )}
    </section>
  );
}

function CreateListingForm({
  actorRole,
  phoneVerified,
}: {
  actorRole?: string;
  phoneVerified: boolean;
}) {
  const utils = trpc.useUtils();
  const create = trpc.sharedLiving.createDraft.useMutation();
  const submitForReview = trpc.sharedLiving.submitForReview.useMutation();
  const [created, setCreated] = useState<DraftResult | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationNode[]>([]);
  const [locationIssue, setLocationIssue] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAddSpace, setShowAddSpace] = useState(false);

  function selectLocation(location: LocationNode) {
    if (!hasCanonicalLocationIdentity(location)) {
      setLocationIssue('Choose the address area from the Property Listify location catalogue.');
      return;
    }
    const canonicalLocationId = String(location.canonicalLocationId || location.id);
    setSelectedLocation([{ ...location, id: canonicalLocationId, canonicalLocationId }]);
    setLocationIssue(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const locationId = String(
      selectedLocation[0]?.canonicalLocationId || selectedLocation[0]?.id || '',
    );
    const rentUnknown = form.get('rentUnknown') === 'on';
    const rentAmountMinor = asMinorUnits(form.get('rent'), rentUnknown);
    setFormError(null);
    if (!locationId) {
      setLocationIssue('Choose a canonical city, suburb, or province for the private address.');
      return;
    }
    if (!rentUnknown && rentAmountMinor === undefined) {
      setFormError('Provide a monthly rent in whole Rand, or mark it as to confirm.');
      return;
    }

    try {
      const result = await create.mutateAsync({
        addressLinePrivate: String(form.get('addressLinePrivate') || ''),
        locationId,
        placeKind: String(form.get('placeKind')) as (typeof SHARED_LIVING_PLACE_KINDS)[number],
        description: String(form.get('description') || '') || undefined,
        spaceLabel: String(form.get('spaceLabel') || ''),
        accommodationType: String(
          form.get('accommodationType'),
        ) as (typeof SHARED_LIVING_ACCOMMODATION_TYPES)[number],
        marketTag: String(form.get('marketTag')) as (typeof SHARED_LIVING_MARKET_TAGS)[number],
        ...(rentAmountMinor === undefined ? {} : { rentAmountMinor }),
        rentUnknown,
        bills: {
          electricity: form.get('billsElectricity') === 'on',
          water: form.get('billsWater') === 'on',
          wifi: form.get('billsWifi') === 'on',
        },
        availableFrom: String(form.get('availableFrom') || '') || undefined,
        occupantsCount: form.get('occupantsCount') ? Number(form.get('occupantsCount')) : undefined,
        mandateReference: String(form.get('mandateReference') || '') || undefined,
      });
      setCreated(result);
      await utils.sharedLiving.myPlaces.invalidate();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save the listing.');
    }
  }

  if (created) {
    return (
      <section className="space-y-4 rounded border border-emerald-200 bg-emerald-50 p-5 text-sm">
        <div>
          <p className="font-medium">Draft saved ✓</p>
          <p className="mt-1 text-slate-700">
            It stays private until you submit it and a reviewer approves it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
            disabled={submitForReview.isPending}
            onClick={async () => {
              setFormError(null);
              try {
                await submitForReview.mutateAsync({ placeId: created.placeId });
                await utils.sharedLiving.myPlaces.invalidate();
              } catch (error) {
                setFormError(
                  error instanceof Error
                    ? error.message
                    : 'Could not submit this listing for review.',
                );
              }
            }}
          >
            {phoneVerified ? 'Submit for review' : 'Submit for review (phone required)'}
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800"
            onClick={() => setShowAddSpace(value => !value)}
          >
            {showAddSpace ? 'Hide add-space form' : 'Add another space at this address'}
          </button>
        </div>
        {submitForReview.isSuccess && (
          <p className="font-medium text-emerald-900">
            Submitted for moderation. It is not public yet.
          </p>
        )}
        {showAddSpace && (
          <AddSpaceForm
            placeId={created.placeId}
            onComplete={() => void utils.sharedLiving.myPlaces.invalidate()}
          />
        )}
        {(formError || submitForReview.error) && (
          <p role="alert" className="text-red-700">
            {formError || submitForReview.error?.message}
          </p>
        )}
      </section>
    );
  }

  return (
    <form className="grid gap-3 rounded border bg-white p-5 sm:grid-cols-2" onSubmit={onSubmit}>
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold">Create a private draft</h2>
        {actorRole === 'agent' && (
          <p className="mt-1 text-sm text-slate-600">
            Practitioner listings need an approved profile, active agency membership, and a mandate
            reference.
          </p>
        )}
      </div>
      <label className="grid gap-1 text-sm sm:col-span-2">
        <span>Street address (kept private — only your selected area shows publicly)</span>
        <input name="addressLinePrivate" required minLength={5} className="rounded border p-2" />
      </label>
      <label className="grid gap-1 text-sm sm:col-span-2">
        <span>Address area</span>
        <LocationAutosuggest
          inputId="shared-living-authoring-location"
          placeholder="Choose a canonical city, suburb, or province"
          selectedLocations={selectedLocation}
          maxLocations={1}
          onSelect={selectLocation}
          onRemove={() => {
            setSelectedLocation([]);
            setLocationIssue(null);
          }}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Place kind</span>
        <select name="placeKind" className="rounded border p-2" defaultValue="house">
          {SHARED_LIVING_PLACE_KINDS.map(kind => (
            <option key={kind} value={kind}>
              {kind.replace('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Space name</span>
        <input
          name="spaceLabel"
          required
          minLength={2}
          className="rounded border p-2"
          placeholder="e.g. Backyard room with own entrance"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>What are you offering?</span>
        <select name="accommodationType" className="rounded border p-2" defaultValue="private_room">
          {SHARED_LIVING_ACCOMMODATION_TYPES.map(type => (
            <option key={type} value={type}>
              {SHARED_LIVING_ACCOMMODATION_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Market</span>
        <select name="marketTag" className="rounded border p-2" defaultValue="room_share">
          <option value="room_share">Room sharing</option>
          <option value="independent_micro">Cottage &amp; small place</option>
          <option value="student">Student living</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Monthly rent (R)</span>
        <input name="rent" type="number" min="1" step="1" className="rounded border p-2" />
      </label>
      <label className="flex items-end gap-2 text-sm">
        <input type="checkbox" name="rentUnknown" />
        <span>Rent still to confirm</span>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Available from</span>
        <input name="availableFrom" type="date" className="rounded border p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Current occupants (optional)</span>
        <input
          name="occupantsCount"
          type="number"
          min="0"
          max="50"
          className="rounded border p-2"
        />
      </label>
      {actorRole === 'agent' && (
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span>Client mandate reference</span>
          <input name="mandateReference" required minLength={3} className="rounded border p-2" />
        </label>
      )}
      <label className="grid gap-1 text-sm sm:col-span-2">
        <span>Short description (optional)</span>
        <textarea name="description" maxLength={2000} className="min-h-24 rounded border p-2" />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-slate-700">Included in the rent</legend>
        <label className="mr-4 inline-flex items-center gap-1 text-sm">
          <input type="checkbox" name="billsElectricity" /> Electricity
        </label>
        <label className="mr-4 inline-flex items-center gap-1 text-sm">
          <input type="checkbox" name="billsWater" /> Water
        </label>
        <label className="inline-flex items-center gap-1 text-sm">
          <input type="checkbox" name="billsWifi" /> Wi-Fi
        </label>
      </fieldset>
      {locationIssue && (
        <p role="alert" className="text-red-700 sm:col-span-2">
          {locationIssue}
        </p>
      )}
      {formError && (
        <p role="alert" className="text-red-700 sm:col-span-2">
          {formError}
        </p>
      )}
      {create.error && (
        <p role="alert" className="text-red-700 sm:col-span-2">
          {create.error.message}
        </p>
      )}
      <button
        type="submit"
        className="rounded bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50 sm:col-span-2"
        disabled={create.isPending}
      >
        Save private draft
      </button>
    </form>
  );
}

function AddSpaceForm({ placeId, onComplete }: { placeId: number; onComplete: () => void }) {
  const addSpace = trpc.sharedLiving.addSpace.useMutation();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rentUnknown = form.get('rentUnknown') === 'on';
    const rentAmountMinor = asMinorUnits(form.get('rent'), rentUnknown);
    setError(null);
    if (!rentUnknown && rentAmountMinor === undefined) {
      setError('Provide a monthly rent in whole Rand, or mark it as to confirm.');
      return;
    }
    try {
      await addSpace.mutateAsync({
        placeId,
        spaceLabel: String(form.get('spaceLabel') || ''),
        accommodationType: String(
          form.get('accommodationType'),
        ) as (typeof SHARED_LIVING_ACCOMMODATION_TYPES)[number],
        marketTag: String(form.get('marketTag')) as (typeof SHARED_LIVING_MARKET_TAGS)[number],
        ...(rentAmountMinor === undefined ? {} : { rentAmountMinor }),
        rentUnknown,
        bills: {
          electricity: form.get('billsElectricity') === 'on',
          water: form.get('billsWater') === 'on',
          wifi: form.get('billsWifi') === 'on',
        },
        availableFrom: String(form.get('availableFrom') || '') || undefined,
      });
      event.currentTarget.reset();
      onComplete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add this space.');
    }
  }

  return (
    <form
      className="grid gap-3 rounded border border-emerald-200 bg-white p-4 sm:grid-cols-2"
      onSubmit={onSubmit}
    >
      <h3 className="font-semibold sm:col-span-2">Add another rentable space</h3>
      <label className="grid gap-1 text-sm">
        <span>Space name</span>
        <input name="spaceLabel" required minLength={2} className="rounded border p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Accommodation type</span>
        <select name="accommodationType" className="rounded border p-2" defaultValue="private_room">
          {SHARED_LIVING_ACCOMMODATION_TYPES.map(type => (
            <option key={type} value={type}>
              {SHARED_LIVING_ACCOMMODATION_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Market</span>
        <select name="marketTag" className="rounded border p-2" defaultValue="room_share">
          <option value="room_share">Room sharing</option>
          <option value="independent_micro">Cottage &amp; small place</option>
          <option value="student">Student living</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Monthly rent (R)</span>
        <input name="rent" type="number" min="1" step="1" className="rounded border p-2" />
      </label>
      <label className="flex items-end gap-2 text-sm">
        <input type="checkbox" name="rentUnknown" />
        <span>Rent still to confirm</span>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Available from</span>
        <input name="availableFrom" type="date" className="rounded border p-2" />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-slate-700">Included in the rent</legend>
        <label className="mr-4 inline-flex items-center gap-1 text-sm">
          <input type="checkbox" name="billsElectricity" /> Electricity
        </label>
        <label className="mr-4 inline-flex items-center gap-1 text-sm">
          <input type="checkbox" name="billsWater" /> Water
        </label>
        <label className="inline-flex items-center gap-1 text-sm">
          <input type="checkbox" name="billsWifi" /> Wi-Fi
        </label>
      </fieldset>
      {(error || addSpace.error) && (
        <p role="alert" className="text-red-700 sm:col-span-2">
          {error || addSpace.error?.message}
        </p>
      )}
      <button
        type="submit"
        disabled={addSpace.isPending}
        className="rounded bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50 sm:col-span-2"
      >
        Add space
      </button>
    </form>
  );
}

function MyPlaces({ places, phoneVerified }: { places: Place[]; phoneVerified: boolean }) {
  const utils = trpc.useUtils();
  const submitForReview = trpc.sharedLiving.submitForReview.useMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [submittedPlaceId, setSubmittedPlaceId] = useState<number | null>(null);

  async function submitPersistedDraft(placeId: number) {
    setActionError(null);
    try {
      await submitForReview.mutateAsync({ placeId });
      setSubmittedPlaceId(placeId);
      await utils.sharedLiving.myPlaces.invalidate();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not submit this listing for review.',
      );
    }
  }

  if (!places.length) {
    return (
      <p className="rounded border bg-white p-4 text-sm text-slate-600">
        No listings yet. Save a draft above to get started.
      </p>
    );
  }
  return (
    <section aria-label="My listings" className="rounded border bg-white p-5">
      <h2 className="mb-2 text-lg font-semibold">My listings</h2>
      <ul className="space-y-4 text-sm">
        {places.map(place => (
          <li key={place.id} className="rounded border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{place.slug}</p>
              <div className="flex items-center gap-2">
                <Badge status={place.status} />
                {(place.status === 'draft' || place.status === 'paused') && (
                  <button
                    type="button"
                    disabled={submitForReview.isPending}
                    onClick={() => void submitPersistedDraft(place.id)}
                    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {phoneVerified ? 'Submit for review' : 'Submit (phone required)'}
                  </button>
                )}
              </div>
            </div>
            {submittedPlaceId === place.id && (
              <p className="mt-2 text-xs font-medium text-emerald-700">
                Submitted for moderation. It is not public yet.
              </p>
            )}
            <ul className="mt-2 space-y-1 text-slate-700">
              {place.spaces.map(space => (
                <li key={space.id} className="flex flex-wrap items-center justify-between gap-2">
                  {place.status === 'published' && space.status === 'available' ? (
                    <Link
                      href={`/shared-living/${space.slug}`}
                      className="text-emerald-700 hover:underline"
                    >
                      {space.label}
                    </Link>
                  ) : (
                    <span>{space.label}</span>
                  )}
                  <span className="text-xs text-slate-500">{space.status}</span>
                </li>
              ))}
            </ul>
            {actionError && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {actionError}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ListerInbox() {
  const threads = trpc.sharedLiving.myListerThreads.useQuery();
  const [token, setToken] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const thread = trpc.sharedLiving.listerThread.useQuery(
    { token: token || EMPTY_THREAD_TOKEN },
    { enabled: Boolean(token) },
  );
  const reply = trpc.sharedLiving.replyAsLister.useMutation({
    onSuccess: () => {
      setBody('');
      void thread.refetch();
    },
  });

  return (
    <section aria-label="Shared Living inbox" className="rounded border bg-white p-5">
      <h2 className="text-lg font-semibold">Shared Living inbox</h2>
      <p className="mt-1 text-sm text-slate-600">
        New enquiries are delivered here for the responsible lister.
      </p>
      {!threads.isLoading && !(threads.data?.length || 0) && (
        <p className="mt-3 text-sm text-slate-600">No enquiries yet.</p>
      )}
      <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <ul className="space-y-2">
          {(threads.data ?? []).map(item => (
            <li key={item.token}>
              <button
                type="button"
                onClick={() => setToken(item.token)}
                className={`w-full rounded border p-3 text-left text-sm ${token === item.token ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}
              >
                <span className="block font-medium">
                  {item.spaceLabelSnapshot || 'Shared Living enquiry'}
                </span>
                <span className="text-slate-600">
                  {item.deliveryStatus === 'delivered' ? 'Delivered' : item.deliveryStatus}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {token && (
          <div className="rounded border border-slate-200 p-3">
            {thread.isLoading ? (
              <p className="text-sm text-slate-600">Loading conversation…</p>
            ) : thread.data ? (
              <>
                <p className="font-medium">{thread.data.spaceLabelSnapshot}</p>
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                  {thread.data.messages.map(message => (
                    <p key={message.id} className="rounded bg-slate-50 p-2 text-sm">
                      <span className="font-medium">
                        {message.authorKind === 'lister' ? 'You' : 'Enquirer'}:
                      </span>{' '}
                      {message.body}
                    </p>
                  ))}
                </div>
                <textarea
                  aria-label="Reply to enquiry"
                  className="mt-3 w-full rounded border p-2 text-sm"
                  value={body}
                  onChange={event => setBody(event.target.value)}
                  placeholder="Reply on-platform"
                />
                <button
                  type="button"
                  disabled={body.trim().length === 0 || reply.isPending}
                  onClick={() => reply.mutate({ token, body })}
                  className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Send reply
                </button>
                {reply.error && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {reply.error.message}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-600">This conversation is unavailable.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Badge({ status }: { status: string }) {
  const tone =
    status === 'published'
      ? 'bg-emerald-50 text-emerald-800'
      : status === 'pending_review'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-slate-100 text-slate-700';
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
