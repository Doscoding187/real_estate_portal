import { Link, useRoute } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  createLeadCaptureRequestId,
  publicLeadCaptureAcknowledgement,
  publicLeadConsent,
} from '@/lib/leadCapture';

const money = (minor?: number | null) =>
  minor == null
    ? 'To confirm'
    : `R ${(minor / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;

const label = (text: string) =>
  text.replace(/_/g, ' ').replace(/^./, character => character.toUpperCase());

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function mediaUrl(item: any, field: 'url' | 'thumbnailUrl' | 'previewUrl' = 'url'): string | null {
  const value = item?.[field];
  return typeof value === 'string' && value.trim() ? value : null;
}

function knownSpecificationValue(item: any): string {
  if (item.valueState !== 'known') return label(item.valueState);
  if (item.textValue != null) return item.textValue;
  if (item.booleanValue === 1) return 'Yes';
  if (item.booleanValue === 0) return 'No';
  if (item.numericValue != null) return Number(item.numericValue).toLocaleString('en-ZA');
  return 'To confirm';
}

function specificationByCode(space: any, code: string) {
  return space.specifications?.find((item: any) => item.specificationCode === code) || null;
}

function Fact({ title, value }: { title: string; value: string }) {
  return (
    <p className="flex justify-between gap-3 border-b py-2 text-sm last:border-0">
      <span className="text-slate-500">{title}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </p>
  );
}

export default function CommercialOfficeDetail() {
  const [, params] = useRoute('/commercial/:slug');
  const slug = params?.slug || '';
  const detail = trpc.commercial.detail.useQuery({ slug }, { enabled: Boolean(slug) });
  const enquiry = trpc.leads.create.useMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [captureRequestId] = useState(createLeadCaptureRequestId);
  const [acknowledgement, setAcknowledgement] = useState<string | null>(null);
  const space: any = detail.data;

  if (!slug) return <main className="p-8">Commercial space unavailable.</main>;
  if (detail.isLoading) return <main className="p-8">Loading commercial space…</main>;
  if (detail.error)
    return (
      <main className="mx-auto max-w-4xl p-6">
        <Link href="/commercial" className="text-sky-700">
          ← Commercial leasing
        </Link>
        <p role="alert" className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          {detail.error.message}
        </p>
      </main>
    );
  if (!space)
    return (
      <main className="mx-auto max-w-4xl p-6">
        <Link href="/commercial" className="text-sky-700">
          ← Commercial leasing
        </Link>
        <p className="mt-4 rounded border bg-white p-4 text-sm text-slate-600">
          This commercial space is no longer publicly available. Browse current opportunities.
        </p>
      </main>
    );

  const parking = specificationByCode(space, 'parking_bays');
  const contextCodes = [
    'building_grade',
    'fit_out_condition',
    'frontage_visibility',
    'footfall_context',
    'tenant_mix_context',
    'delivery_access',
    'truck_access',
    'eaves_height_m',
    'power_capacity_kva',
    'loading_docks',
    'roller_doors',
  ];
  const contextFacts = contextCodes.map(code => specificationByCode(space, code)).filter(Boolean);
  const media = (Array.isArray(space.media) ? space.media : []).filter((item: any) =>
    Boolean(mediaUrl(item)),
  );
  const enquiryReady = Boolean(name.trim() && validEmail(email) && consent && !enquiry.isPending);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <Link href="/commercial" className="text-sky-700">
        ← Commercial leasing
      </Link>

      <header>
        <p className="text-sm font-medium text-sky-700">{label(space.space.useType)}</p>
        <h1 className="text-3xl font-semibold">{space.title || space.space.identifier}</h1>
        <p className="mt-1 text-slate-600">
          {space.asset.name} · {space.space.identifier} ·{' '}
          {Number(space.space.rentableAreaM2).toLocaleString('en-ZA')} m²
        </p>
        <p className="mt-1 text-sm text-slate-600">{space.asset.suburb || space.asset.city}</p>
        <p className="mt-3 font-medium">
          {space.availability.label}
          {space.availability.occupationDate ? ` ${space.availability.occupationDate}` : ''}
        </p>
        <p className="text-sm text-slate-600">
          {space.availability.confirmedAt
            ? `Confirmed ${String(space.availability.confirmedAt).slice(0, 10)}`
            : 'Confirmation date not supplied'}
          {space.availability.source ? ` by ${space.availability.source}` : ''}
        </p>
      </header>

      {media.length ? (
        <section className="rounded border p-5" aria-label="Commercial media">
          <h2 className="text-xl font-semibold">Space media</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item: any, index: number) => {
              const url = mediaUrl(item);
              if (!url) return null;
              const poster =
                mediaUrl(item, 'thumbnailUrl') || mediaUrl(item, 'previewUrl') || undefined;
              if (item.mediaType === 'image') {
                return (
                  <a
                    key={item.id ?? `${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded border bg-slate-50"
                  >
                    <img
                      src={poster || url}
                      alt={`${space.title || space.space.identifier} — media ${index + 1}`}
                      className="aspect-[4/3] w-full object-cover"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  </a>
                );
              }
              if (item.mediaType === 'video') {
                return (
                  <video
                    key={item.id ?? `${url}-${index}`}
                    className="aspect-[4/3] w-full rounded border bg-black object-cover"
                    controls
                    preload="metadata"
                    poster={poster}
                  >
                    <source src={url} type={item.mimeType || undefined} />
                  </video>
                );
              }
              return (
                <a
                  key={item.id ?? `${url}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-24 items-center rounded border bg-slate-50 p-3 text-sm font-medium text-sky-700 underline"
                >
                  {item.mediaType === 'floorplan' ? 'Open floor plan' : 'Open marketing document'}
                  {item.originalFileName ? ` · ${item.originalFileName}` : ''}
                </a>
              );
            })}
          </div>
        </section>
      ) : null}

      {typeof space.description === 'string' && space.description.trim() ? (
        <section className="rounded border p-5">
          <h2 className="text-xl font-semibold">About this space</h2>
          <p className="mt-2 whitespace-pre-line text-slate-700">{space.description}</p>
        </section>
      ) : null}

      <section className="rounded border p-5">
        <h2 className="text-xl font-semibold">Commercial Cost Passport</h2>
        <p className="mt-1 text-sm text-slate-700">
          Quoted rental:{' '}
          {space.pricing.quotedRent
            ? `${money(space.pricing.quotedRent.amountMinor)} / ${
                space.pricing.quotedRent.chargeBasis === 'per_m2_month' ? 'm²' : 'month'
              }`
            : 'To confirm'}{' '}
          · VAT {label(space.pricing.vatTreatment)}
        </p>
        <p className="mt-3 text-lg font-semibold">
          Known recurring occupancy: {money(space.costPassport.monthlyMinimumMinor)}–
          {money(space.costPassport.monthlyMaximumMinor)} / month
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {space.economics.map((item: any) => (
            <Fact
              key={item.componentCode}
              title={label(item.componentCode)}
              value={
                item.valueState === 'unknown' || item.valueState === 'not_applicable'
                  ? item.valueState === 'unknown'
                    ? 'Unknown / to confirm'
                    : 'Not applicable'
                  : `${money(item.amountMinor)}${
                      item.chargeBasis === 'per_m2_month'
                        ? ' / m² / month'
                        : item.chargeBasis === 'per_bay_month'
                          ? ' / bay / month'
                          : item.chargeBasis === 'annual'
                            ? ' / year'
                            : item.chargeBasis === 'once'
                              ? ' once'
                              : ' / month'
                    }${item.valueState === 'estimated' ? ' (estimated)' : ''}`
              }
            />
          ))}
        </div>
        {space.costPassport.unknownComponentCodes.length ? (
          <p className="mt-3 text-amber-700">
            Not included as R0: {space.costPassport.unknownComponentCodes.map(label).join(', ')}.
          </p>
        ) : (
          <p className="mt-3 text-emerald-700">All declared recurring components are included.</p>
        )}
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded border p-5">
          <h2 className="text-xl font-semibold">Space and access</h2>
          <div className="mt-3">
            <Fact title="Use type" value={label(space.space.useType)} />
            <Fact title="Space type" value={label(space.space.kind)} />
            <Fact title="Asset type" value={label(space.asset.kind)} />
            <Fact
              title="Rentable area"
              value={`${Number(space.space.rentableAreaM2).toLocaleString('en-ZA')} m²`}
            />
            <Fact
              title="Usable area"
              value={
                space.space.usableAreaM2 == null
                  ? 'To confirm'
                  : `${Number(space.space.usableAreaM2).toLocaleString('en-ZA')} m²`
              }
            />
            <Fact
              title="Parking"
              value={parking ? knownSpecificationValue(parking) : 'To confirm'}
            />
          </div>
        </div>

        <div className="rounded border p-5">
          <h2 className="text-xl font-semibold">Use and local context</h2>
          <div className="mt-3">
            {contextFacts.length ? (
              contextFacts.map((item: any) => (
                <Fact
                  key={item.specificationCode}
                  title={label(item.specificationCode)}
                  value={knownSpecificationValue(item)}
                />
              ))
            ) : (
              <p className="text-sm text-slate-600">
                No additional operational context has been supplied yet.
              </p>
            )}
            <Fact title="Zoning / permitted use" value="Confirm with the verified advertiser" />
          </div>
        </div>
      </section>

      <section className="rounded border p-5">
        <h2 className="text-xl font-semibold">Lease terms</h2>
        {space.leaseTerms ? (
          <div className="mt-3 grid gap-x-8 md:grid-cols-2">
            <Fact
              title="Minimum term"
              value={
                space.leaseTerms.minimumLeaseMonths
                  ? `${space.leaseTerms.minimumLeaseMonths} months`
                  : 'To confirm'
              }
            />
            <Fact
              title="Quoted term"
              value={
                space.leaseTerms.quotedLeaseMonths
                  ? `${space.leaseTerms.quotedLeaseMonths} months`
                  : 'To confirm'
              }
            />
            <Fact
              title="Annual escalation"
              value={
                space.leaseTerms.annualEscalationPercent == null
                  ? 'To confirm'
                  : `${space.leaseTerms.annualEscalationPercent}%`
              }
            />
            <Fact title="Deposit" value={money(space.leaseTerms.depositMinor)} />
            <Fact
              title="Tenant installation allowance"
              value={money(space.leaseTerms.tenantInstallationAllowanceMinor)}
            />
            <Fact
              title="Beneficial occupation"
              value={
                space.leaseTerms.beneficialOccupationDays == null
                  ? 'To confirm'
                  : `${space.leaseTerms.beneficialOccupationDays} days`
              }
            />
          </div>
        ) : (
          <p className="mt-2 text-slate-600">Lease terms to confirm with the advertiser.</p>
        )}
      </section>

      <section className="rounded border p-5">
        <h2 className="text-xl font-semibold">Enquire about this space</h2>
        <p className="mt-1 text-sm text-slate-600">
          Property Listify only sends this enquiry directly when the responsible advertiser is still
          a verified, deliverable recipient.
        </p>
        <input
          className="mt-3 w-full max-w-md border p-2"
          placeholder="Your name"
          aria-label="Your name"
          required
          value={name}
          onChange={event => setName(event.target.value)}
        />
        <input
          className="mt-2 block w-full max-w-md border p-2"
          placeholder="Email"
          aria-label="Email"
          type="email"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
        <textarea
          className="mt-2 block w-full border p-2"
          placeholder="Tell the advertiser about your space, term and operational requirements"
          value={message}
          onChange={event => setMessage(event.target.value)}
        />
        <label className="mt-3 flex gap-2 text-sm">
          <input
            type="checkbox"
            aria-label="Commercial enquiry consent"
            required
            checked={consent}
            onChange={event => setConsent(event.target.checked)}
          />
          I agree that Property Listify may share this Commercial enquiry with the responsible
          advertiser.
        </label>
        <button
          className="mt-3 rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
          disabled={!enquiryReady}
          onClick={() =>
            enquiry.mutate(
              {
                name,
                email,
                message,
                listingId: space.listingId,
                commercialAvailabilityId: space.availability.id,
                leadType: 'inquiry',
                source: 'commercial',
                sourceSurface: 'commercial_detail',
                captureRequestId,
                consent: publicLeadConsent('commercial_enquiry'),
              },
              {
                onSuccess: result => {
                  setAcknowledgement(
                    publicLeadCaptureAcknowledgement(
                      result,
                      'Your enquiry was sent to the responsible verified advertiser.',
                    ),
                  );
                  setName('');
                  setEmail('');
                  setMessage('');
                  setConsent(false);
                },
                onError: error =>
                  setAcknowledgement(
                    error instanceof Error
                      ? error.message
                      : 'Your enquiry could not be submitted. Please try again.',
                  ),
              },
            )
          }
        >
          Request information
        </button>
        <p id="commercial-enquiry-requirements" className="mt-2 text-xs text-slate-500">
          Enter your name, a valid email address and consent to enable the enquiry.
        </p>
        {acknowledgement ? (
          <p
            role="status"
            className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-800"
          >
            {acknowledgement}
          </p>
        ) : null}
      </section>
    </main>
  );
}
