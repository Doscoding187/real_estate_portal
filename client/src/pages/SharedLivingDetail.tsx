import { Link, useRoute } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { createLeadCaptureRequestId, publicLeadConsent } from '@/lib/leadCapture';
import { getSharedLivingSearchReturn } from '@shared/sharedLivingSearchContract';
import { SHARED_LIVING_ACCOMMODATION_LABELS } from '@shared/sharedLivingDomain';

const money = (minor: number | null | undefined) =>
  minor == null
    ? 'To confirm'
    : `R ${(minor / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;

const label = (text: string) => text.replace(/_/g, ' ').replace(/^./, char => char.toUpperCase());

function known(value: string | null | undefined, fallback = 'To confirm') {
  return !value || value === 'unknown' ? fallback : label(value);
}

export default function SharedLivingDetail() {
  const [, params] = useRoute('/shared-living/:slug');
  const slug = params?.slug || '';
  const detail = trpc.sharedLiving.detail.useQuery({ slug }, { enabled: Boolean(slug) });
  const space: any = detail.data;
  const returnTo = getSharedLivingSearchReturn(window.location.search) || '/shared-living';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [captureRequestId] = useState(createLeadCaptureRequestId);
  const enquiry = trpc.sharedLiving.enquire.useMutation();
  const [submitted, setSubmitted] = useState<{
    threadToken: string;
    message?: string;
    delivered: boolean;
  } | null>(null);

  if (!slug) return <main className="p-8">Shared Living listing not found.</main>;
  if (detail.isLoading) return <main className="p-8">Loading…</main>;
  if (detail.error)
    return (
      <main className="mx-auto max-w-3xl p-8">
        <Link href={returnTo} className="text-emerald-700">
          ← Back to Shared Living search
        </Link>
        <p
          role="alert"
          className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {detail.error.message}
        </p>
      </main>
    );
  if (!space)
    return (
      <main className="mx-auto max-w-3xl p-8">
        <Link href={returnTo} className="text-emerald-700">
          ← Back to Shared Living search
        </Link>
        <p className="mt-4 rounded border bg-white p-4 text-sm text-slate-600">
          This listing is no longer available. Browse other rooms and small places on the Shared
          Living page.
        </p>
      </main>
    );

  const canSend =
    name.trim().length >= 2 && email.trim().length > 0 && message.trim().length >= 5 && consent;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Link href={returnTo} className="text-sm text-emerald-700">
        ← Back to Shared Living search
      </Link>

      <header>
        <p className="text-sm font-medium text-emerald-700">
          {SHARED_LIVING_ACCOMMODATION_LABELS[
            space.accommodationType as keyof typeof SHARED_LIVING_ACCOMMODATION_LABELS
          ] || label(space.accommodationType)}
        </p>
        <h1 className="text-3xl font-semibold">{space.label}</h1>
        {/* Private street address and exact coordinates are deliberately never part of this DTO. */}
        <p className="mt-1 text-slate-600">{space.locationDisplay}</p>
        {space.rentableAreaM2 != null && (
          <p className="mt-1 text-sm text-slate-600">
            {Number(space.rentableAreaM2).toLocaleString()} m²
          </p>
        )}
      </header>

      {space.rentUnknown ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          The rent has not been confirmed yet — enquire and the lister will confirm the monthly
          amount with you.
        </p>
      ) : (
        <p className="text-lg font-semibold">
          {money(space.rentAmountMinor)}
          <span className="text-sm font-normal text-slate-500"> / month</span>
        </p>
      )}

      <section
        aria-label="Arrangement facts"
        className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-2"
      >
        <Fact label="Furnishing" value={known(space.furnishedState)} />
        <Fact
          label="Bathroom"
          value={
            space.bathroomAccess === 'own'
              ? 'Own bathroom'
              : space.bathroomAccess === 'shared'
                ? 'Shared bathroom'
                : 'To confirm'
          }
        />
        <Fact
          label="Parking"
          value={space.parkingBays != null ? `${space.parkingBays} bay(s)` : 'To confirm'}
        />
        <Fact label="Available from" value={space.availableFrom ?? 'To confirm'} />
      </section>

      <section className="rounded border bg-white p-5">
        <h2 className="text-lg font-semibold">What is included</h2>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <IncludedItem label="Electricity" included={space.billsIncluded.electricity} />
          <IncludedItem label="Water" included={space.billsIncluded.water} />
          <IncludedItem label="Wi-Fi" included={space.billsIncluded.wifi} />
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Anything not listed here still needs confirming with the lister — it is never treated as
          included by default.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <section className="rounded border bg-white p-5">
          <h2 className="text-lg font-semibold">Household &amp; home rhythm</h2>
          <dl className="mt-2 grid gap-2 text-sm">
            <Fact
              label="Current occupants"
              value={
                space.household.occupantsCount == null
                  ? 'To confirm'
                  : String(space.household.occupantsCount)
              }
            />
            <Fact label="Household" value={known(space.household.occupantsType)} />
            <Fact label="Smoking" value={known(space.household.smoking)} />
            <Fact label="Pets" value={known(space.household.pets)} />
            <Fact label="Visitors" value={known(space.household.visitors)} />
            <Fact label="Cleaning" value={known(space.household.cleaning)} />
          </dl>
        </section>
        <section className="rounded border bg-white p-5">
          <h2 className="text-lg font-semibold">Lister &amp; checks</h2>
          <p className="mt-2 text-sm font-medium text-slate-800">{space.attribution.label}</p>
          {space.attribution.name && (
            <p className="text-sm text-slate-600">{space.attribution.name}</p>
          )}
          {space.attribution.agencyName && (
            <p className="text-sm text-slate-600">{space.attribution.agencyName}</p>
          )}
          <ul className="mt-3 grid gap-1 text-sm">
            <TrustItem label="Phone verified" verified={space.trust.phoneVerified} />
            <TrustItem label="Listing reviewed" verified={space.trust.propertyVerified} />
            {space.attribution.kind === 'practitioner' && (
              <TrustItem
                label="Mandate evidence reviewed"
                verified={space.trust.relationshipVerified}
              />
            )}
          </ul>
        </section>
      </section>

      {space.description && (
        <section className="rounded border bg-white p-5">
          <h2 className="text-lg font-semibold">About this place</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{space.description}</p>
        </section>
      )}

      <section className="rounded border p-5">
        <h2 className="text-lg font-semibold">Enquire about this space</h2>
        {submitted ? (
          <div
            role="status"
            className="mt-2 space-y-3 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm"
          >
            <p>{submitted.message || 'Your enquiry was captured by Property Listify.'}</p>
            {submitted.delivered && (
              <p>
                The responsible lister can now see it in their authenticated Shared Living inbox.
              </p>
            )}
            <p>
              Keep this link to follow the conversation on-platform:
              <br />
              <Link
                href={`/shared-living/thread/${submitted.threadToken}`}
                className="font-medium underline"
              >
                Open your conversation thread
              </Link>
            </p>
            <p className="text-slate-600">
              We keep early communication on the platform so both sides stay safe.
            </p>
          </div>
        ) : (
          <>
            <input
              aria-label="Your name"
              className="m-1 w-full max-w-md border p-2"
              placeholder="Your name"
              value={name}
              onChange={event => setName(event.target.value)}
            />
            <input
              aria-label="Your email"
              className="m-1 block w-full max-w-md border p-2"
              placeholder="Email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
            <textarea
              aria-label="Your enquiry"
              className="m-1 block w-full max-w-md border p-2"
              placeholder="Tell the lister about yourself and what you need"
              value={message}
              onChange={event => setMessage(event.target.value)}
            />
            <label className="mt-2 flex max-w-md gap-2 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={event => setConsent(event.target.checked)}
              />
              I agree that Property Listify may share this enquiry with the responsible lister.
            </label>
            <button
              type="button"
              className="mt-3 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              disabled={!canSend || enquiry.isPending}
              onClick={() =>
                enquiry.mutate(
                  {
                    slPlaceId: Number(space.placeId),
                    slSpaceId: Number(space.spaceId),
                    name,
                    email,
                    message,
                    captureRequestId,
                    consent: publicLeadConsent('shared_living_detail'),
                  },
                  {
                    onSuccess: result =>
                      setSubmitted({
                        threadToken: result.threadToken,
                        message: result.message,
                        delivered: result.delivered,
                      }),
                  },
                )
              }
            >
              Send enquiry
            </button>
            {enquiry.error && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {enquiry.error.message}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function Fact({ label: factLabel, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <dt className="text-slate-500">{factLabel}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function IncludedItem({ label: itemLabel, included }: { label: string; included: boolean }) {
  return (
    <li className={included ? 'text-emerald-800' : 'text-slate-400'}>
      {included ? '✓ ' : '○ '}
      {itemLabel} {included ? 'included' : 'not marked as included'}
    </li>
  );
}

function TrustItem({ label: itemLabel, verified }: { label: string; verified: boolean }) {
  return (
    <li className={verified ? 'text-emerald-800' : 'text-slate-500'}>
      {verified ? '✓ ' : '○ '}
      {itemLabel} {verified ? 'shown' : 'not shown'}
    </li>
  );
}
