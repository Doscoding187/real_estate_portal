import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';

/**
 * Lister workspace (MVP): phone-verification rung, draft creation, and the
 * listing inbox. Practitioner authoring reuses this spine behind the existing
 * practitioner identity; attribution is enforced server-side.
 */

const money = (minor: number) =>
  `R ${(minor / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;

export default function SharedLivingLister() {
  const verification = trpc.sharedLiving.verificationStatus.useQuery();
  const myListings = trpc.sharedLiving.myPlaces.useQuery();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Shared Living · List a space</p>
        <h1 className="text-2xl font-semibold">List your room or small place</h1>
        <p className="mt-2 text-sm text-slate-600">
          Publishing requires a verified phone number so enquirers know who they are talking to.
        </p>
      </header>

      {!verification.isLoading && !verification.data?.phoneVerified && <PhoneVerificationPanel />}
      {verification.data?.phoneVerified && (
        <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          ✓ Phone verified
        </p>
      )}

      {verification.data?.phoneVerified && (
        <>
          <CreateListingForm />
          <MyPlaces places={myListings.data?.places ?? []} />
        </>
      )}
    </main>
  );
}

function PhoneVerificationPanel() {
  const utils = trpc.useUtils();
  const [phone, setPhone] = useState('+27');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState<{ devCode?: string } | null>(null);
  const send = trpc.sharedLiving.sendPhoneOtp.useMutation({
    onSuccess: result => {
      if (result.status === 'dev_mode') setOtpSent({ devCode: result.devCode });
      else setOtpSent({});
    },
    onError: () => setOtpSent(null),
  });
  const verify = trpc.sharedLiving.verifyPhoneOtp.useMutation({
    onSuccess: () => void utils.sharedLiving.verificationStatus.invalidate(),
  });

  return (
    <section className="rounded border bg-white p-5">
      <h2 className="text-lg font-semibold">Verify your phone number</h2>
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

function CreateListingForm() {
  const utils = trpc.useUtils();
  const create = trpc.sharedLiving.createDraft.useMutation();
  const submitForReview = trpc.sharedLiving.submitForReview.useMutation();
  const [created, setCreated] = useState<{ placeId: number; slug: string } | null>(null);
  const [submittedPlaceIds, setSubmittedPlaceIds] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFormError(null);
    try {
      const rentUnknown = form.get('rentUnknown') === 'on';
      const result = await create.mutateAsync({
        addressLinePrivate: String(form.get('addressLinePrivate') || ''),
        citySlug: String(form.get('citySlug') || '') || undefined,
        placeKind: 'house',
        spaceLabel: String(form.get('spaceLabel') || ''),
        accommodationType: String(form.get('accommodationType')) as any,
        marketTag: String(form.get('marketTag')) as any,
        rentAmountMinor: Math.round(Number(form.get('rent') || 0) * 100),
        rentUnknown,
        bills: {
          electricity: form.get('billsElectricity') === 'on',
          water: form.get('billsWater') === 'on',
          wifi: form.get('billsWifi') === 'on',
        },
      });
      setCreated({ placeId: result.placeId, slug: result.slug });
      await utils.sharedLiving.myPlaces.invalidate();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save the listing.');
    }
  }

  if (created) {
    const alreadySubmitted =
      submittedPlaceIds.includes(created.placeId) || submitForReview.isSuccess;
    return (
      <section className="space-y-3 rounded border border-emerald-200 bg-emerald-50 p-5 text-sm">
        <p className="font-medium">Draft saved ✓</p>
        {alreadySubmitted ? (
          <p>Your listing is under review. It goes live once moderation approves it.</p>
        ) : (
          <button
            type="button"
            className="rounded bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
            disabled={submitForReview.isPending}
            onClick={async () => {
              try {
                await submitForReview.mutateAsync({ placeId: created.placeId });
                setSubmittedPlaceIds(previous => [...previous, created.placeId]);
                await utils.sharedLiving.myPlaces.invalidate();
              } catch (error) {
                setFormError(
                  error instanceof Error ? error.message : 'Could not submit for review.',
                );
              }
            }}
          >
            Submit for review
          </button>
        )}
        {submitForReview.error && (
          <p role="alert" className="text-red-700">
            {submitForReview.error.message}
          </p>
        )}
        {formError && (
          <p role="alert" className="text-red-700">
            {formError}
          </p>
        )}
      </section>
    );
  }

  return (
    <form className="grid gap-3 rounded border bg-white p-5 sm:grid-cols-2" onSubmit={onSubmit}>
      <label className="grid gap-1 text-sm sm:col-span-2">
        <span>Street address (kept private — only your area shows publicly)</span>
        <input name="addressLinePrivate" required minLength={5} className="rounded border p-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>City slug</span>
        <input name="citySlug" className="rounded border p-2" placeholder="johannesburg" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>What are you offering?</span>
        <select name="accommodationType" className="rounded border p-2" defaultValue="private_room">
          <option value="private_room">Private room in my home</option>
          <option value="shared_room">Shared room / bed</option>
          <option value="en_suite_room">En-suite room</option>
          <option value="garden_cottage">Garden cottage</option>
          <option value="granny_flat">Granny flat</option>
          <option value="bachelor_studio">Bachelor / studio</option>
          <option value="backyard_room">Backyard room</option>
          <option value="backyard_unit">Backyard flat (self-contained)</option>
          <option value="room_shared_house">Room in shared house</option>
          <option value="room_shared_apartment">Room in shared apartment</option>
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
        <span>Space name</span>
        <input
          name="spaceLabel"
          required
          minLength={2}
          className="rounded border p-2"
          placeholder="e.g. Backyard room with own entrance"
        />
      </label>
      <label className="grid gap-1 text-sm sm:col-span-2">
        <span>Monthly rent (R)</span>
        <input name="rent" type="number" min="0" step="1" className="rounded border p-2" />
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
      <button
        type="submit"
        className="rounded bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50 sm:col-span-2"
        disabled={create.isPending}
      >
        Save draft
      </button>
      {create.error && (
        <p role="alert" className="text-red-700 sm:col-span-2">
          {create.error.message}
        </p>
      )}
    </form>
  );
}

function MyPlaces({ places }: { places: Array<{ id: number; slug: string; status: string }> }) {
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
      <ul className="space-y-2 text-sm">
        {places.map(place => (
          <li key={place.id} className="flex items-center justify-between gap-3">
            <Link
              href={`/shared-living/${place.slug}`}
              className="text-emerald-700 hover:underline"
            >
              {place.slug}
            </Link>
            <Badge status={place.status} />
          </li>
        ))}
      </ul>
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
