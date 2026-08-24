import { Link, useRoute } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { createLeadCaptureRequestId, publicLeadConsent } from '@/lib/leadCapture';

const money = (minor: number | null | undefined) =>
  minor == null
    ? 'To confirm'
    : `R ${(minor / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;

const label = (text: string) => text.replace(/_/g, ' ').replace(/^./, char => char.toUpperCase());

export default function SharedLivingDetail() {
  const [, params] = useRoute('/shared-living/:slug');
  const slug = params?.slug || '';
  const detail = trpc.sharedLiving.detail.useQuery({ slug }, { enabled: Boolean(slug) });
  const space: any = detail.data;

  // Enquiry form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [captureRequestId] = useState(createLeadCaptureRequestId);
  const enquiry = trpc.sharedLiving.enquire.useMutation();
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);

  if (!slug) return <main className="p-8">Shared Living listing not found.</main>;
  if (detail.isLoading) return <main className="p-8">Loading…</main>;
  if (detail.error)
    return (
      <main className="mx-auto max-w-3xl p-8">
        <Link href="/shared-living" className="text-sky-700">
          ← Shared Living
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
        <Link href="/shared-living" className="text-emerald-700">
          ← Shared Living
        </Link>
        <p className="mt-4 rounded border bg-white p-4 text-sm text-slate-600">
          This listing is no longer available. Browse other rooms and small places on the Shared
          Living page.
        </p>
      </main>
    );

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Link href="/shared-living" className="text-sm text-emerald-700">
        ← Shared Living
      </Link>

      <header>
        <p className="text-sm font-medium text-emerald-700">{label(space.accommodationType)}</p>
        <h1 className="text-3xl font-semibold">{space.label}</h1>
        {/* Privacy model: approximate area identity; the street address is never published for shared formats. */}
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
        <Fact
          label="Furnishing"
          value={space.furnishedState === 'unknown' ? 'To confirm' : label(space.furnishedState)}
        />
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

      {space.description && (
        <section className="rounded border bg-white p-5">
          <h2 className="text-lg font-semibold">About this place</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{space.description}</p>
        </section>
      )}

      <section className="rounded border p-5">
        <h2 className="text-lg font-semibold">Enquire about this space</h2>
        {submittedToken ? (
          <div
            role="status"
            className="mt-2 space-y-3 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm"
          >
            <p>Your enquiry was captured by Property Listify.</p>
            <p>
              Keep this link to follow the conversation on-platform:
              <br />
              <Link
                href={`/shared-living/thread/${submittedToken}`}
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
              className="m-1 w-full max-w-md border p-2"
              placeholder="Your name"
              value={name}
              onChange={event => setName(event.target.value)}
            />
            <input
              className="m-1 block w-full max-w-md border p-2"
              placeholder="Email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
            <textarea
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
              className="mt-3 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              disabled={!consent || enquiry.isPending}
              onClick={() =>
                enquiry.mutate(
                  {
                    slPlaceId: Number(space.placeId),
                    slSpaceId: space.spaceId,
                    name,
                    email,
                    message,
                    captureRequestId,
                    consent: publicLeadConsent('shared_living_detail'),
                  },
                  { onSuccess: result => setSubmittedToken(result.threadToken) },
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
    <p className="flex justify-between gap-2 text-sm">
      <span className="text-slate-500">{factLabel}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </p>
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
