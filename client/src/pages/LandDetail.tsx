import { useRoute, Link } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  createLeadCaptureRequestId,
  publicLeadCaptureAcknowledgement,
  publicLeadConsent,
} from '@/lib/leadCapture';

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
      {land.intendedUse && <p className="mt-3 font-medium">Intended use: {land.intendedUse}</p>}
      {land.description && <p className="mt-3 whitespace-pre-line text-slate-700">{land.description}</p>}
    </section>
    {land.media?.length > 0 && <section aria-label="Land marketing media" className="grid gap-3 sm:grid-cols-2">{land.media.map((item: any, index: number) => <img key={`${item.url}-${index}`} src={item.url} alt={index === 0 ? land.title : ''} className="h-64 w-full rounded border object-cover" />)}</section>}
    <section>
      <h2 className="text-xl font-semibold">Land Passport</h2>
      <p>{label(land.passport.trustState || 'listed_with_disclosures')}</p>
      {land.parcelCount > 1 && <p>This site comprises {land.parcelCount} parcels.</p>}
      {land.passport.claims.map((claim: any) => <p key={claim.code}>{label(claim.code)}: {claim.state === 'asserted' ? 'Seller declared' : label(claim.state)}</p>)}
      {land.passport.assertions.map((assertion: any, index: number) => <div key={index} className="mt-2 text-sm"><p>{label(assertion.claimCode)} — {label(assertion.status)}{assertion.sourceProvider ? ` · ${assertion.sourceProvider}` : ''}{assertion.checkedAt ? ` · checked ${String(assertion.checkedAt).slice(0, 10)}` : ''}</p>{assertion.publicConclusion && <p className="text-slate-700">{assertion.publicConclusion}</p>}{assertion.limitations && <p className="text-slate-500">Limits: {assertion.limitations}</p>}</div>)}
    </section>
    <section className="rounded border p-4">
      <h2 className="text-xl font-semibold">Enquire</h2>
      <p className="m-1 text-sm text-slate-600">Property Listify sends this enquiry directly only while the approved Land marketing representative remains verified and deliverable.</p>
      <input className="m-1 border p-2" placeholder="Your name" value={name} onChange={event => setName(event.target.value)} />
      <input className="m-1 border p-2" placeholder="Email" value={email} onChange={event => setEmail(event.target.value)} />
      <textarea className="m-1 block w-full border p-2" placeholder="Request information or a site visit" value={message} onChange={event => setMessage(event.target.value)} />
      <label className="m-1 flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={consentAccepted} onChange={event => setConsentAccepted(event.target.checked)} />
        <span>I agree that Property Listify may share this enquiry with the approved marketing representative for this land.</span>
      </label>
      <button className="m-1 rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50" disabled={!consentAccepted || enquiry.isPending} onClick={() => enquiry.mutate({ name, email, message, listingId: land.listingId, leadType: 'inquiry', source: 'plots_and_land', sourceSurface: 'land_detail', captureRequestId, consent: publicLeadConsent('land_detail_enquiry') })}>Request information</button>
      {enquiry.isSuccess && <p role="status" className="m-1 text-sm text-emerald-700">{publicLeadCaptureAcknowledgement(enquiry.data, 'Your enquiry has been recorded and sent to the approved Land marketing representative.')}</p>}
      {enquiry.error && <p role="alert" className="m-1 text-sm text-rose-700">{enquiry.error.message}</p>}
    </section>
  </main>;
}
