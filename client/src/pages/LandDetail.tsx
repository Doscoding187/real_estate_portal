import { useRoute, Link } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { createLeadCaptureRequestId, publicLeadConsent } from '@/lib/leadCapture';

const label = (value: string) => value.replace(/_/g, ' ').replace(/^\w/, x => x.toUpperCase());

export default function LandDetail() {
  const [, params] = useRoute('/land/:slug');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [captureRequestId] = useState(() => createLeadCaptureRequestId());
  const detail = trpc.landPublic.detail.useQuery({ slug: params?.slug || '' }, { enabled: Boolean(params?.slug) });
  const enquiry = trpc.leads.create.useMutation();
  const land = detail.data;
  if (!land) return <main className="p-8">Land listing unavailable.</main>;

  return <main className="mx-auto max-w-4xl space-y-6 p-6">
    <Link href="/plots-and-land">← Plots &amp; Land</Link>
    <section>
      <h1 className="text-3xl font-semibold">{land.title}</h1>
      <p>{label(land.classification)} · {Number(land.extentM2).toLocaleString()} m² · {land.city}, {land.province}</p>
      <p className="text-sm text-slate-600">Location precision: {land.precision === 'exact' ? 'exact verified site position' : 'approximate site location'}. No cadastral boundary is implied.</p>
    </section>
    <section>
      <h2 className="text-xl font-semibold">Land Passport</h2>
      <p>{label(land.passport.trustState || 'listed_with_disclosures')}</p>
      {land.parcelCount > 1 && <p>This site comprises {land.parcelCount} parcels.</p>}
      {land.passport.claims.map((claim: any) => <p key={claim.code}>{label(claim.code)}: {claim.state === 'asserted' ? 'Seller declared' : label(claim.state)}</p>)}
      {land.passport.assertions.map((assertion: any, index: number) => <p key={index} className="text-sm">{label(assertion.claimCode)} — {label(assertion.status)}{assertion.sourceProvider ? ` · ${assertion.sourceProvider}` : ''}{assertion.checkedAt ? ` · checked ${String(assertion.checkedAt).slice(0, 10)}` : ''}</p>)}
    </section>
    <section className="rounded border p-4">
      <h2 className="text-xl font-semibold">Enquire</h2>
      <input className="m-1 border p-2" placeholder="Your name" value={name} onChange={event => setName(event.target.value)} />
      <input className="m-1 border p-2" placeholder="Email" value={email} onChange={event => setEmail(event.target.value)} />
      <textarea className="m-1 block w-full border p-2" placeholder="Request information or a site visit" value={message} onChange={event => setMessage(event.target.value)} />
      <label className="m-1 flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={consentAccepted} onChange={event => setConsentAccepted(event.target.checked)} />
        <span>I agree that Property Listify may share this enquiry with the approved marketing representative for this land.</span>
      </label>
      <button className="m-1 rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50" disabled={!consentAccepted || enquiry.isPending} onClick={() => enquiry.mutate({ name, email, message, listingId: land.listingId, leadType: 'inquiry', source: 'plots_and_land', sourceSurface: 'land_detail', captureRequestId, consent: publicLeadConsent('land_detail_enquiry') })}>Request information</button>
    </section>
  </main>;
}
