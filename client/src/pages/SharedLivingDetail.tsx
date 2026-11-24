import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { ArrowLeft, Bath, BedDouble, Check, MapPin, ShieldCheck, Users } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const labels: Record<string, string> = {
  private_bathroom: 'Private bathroom', furnished: 'Furnished', bed: 'Bed', desk: 'Desk', wardrobe: 'Wardrobe',
  kitchenette: 'Kitchenette', balcony: 'Balcony', air_conditioning: 'Air conditioning', private_entrance: 'Private entrance',
  secure_parking: 'Secure parking', garden: 'Garden', laundry: 'Laundry', pool: 'Pool', security: 'Security',
  shared_kitchen: 'Shared kitchen', study_area: 'Study area', communal_lounge: 'Communal lounge', backup_power: 'Backup power', wifi: 'Wi-Fi',
};
const accommodationLabels: Record<string, string> = {
  private_room: 'Private room', shared_room: 'Shared room', en_suite_room: 'En-suite room', garden_cottage: 'Garden cottage', granny_flat: 'Granny flat', bachelor_studio: 'Bachelor / studio', backyard_room: 'Backyard room', backyard_unit: 'Backyard unit', room_shared_house: 'Room in shared house', room_shared_apartment: 'Room in shared apartment',
};

export default function SharedLivingDetail() {
  const [, params] = useRoute('/shared-living/:slug');
  const slug = params?.slug || '';
  const detail = trpc.sharedLiving.detail.useQuery({ slug }, { enabled: Boolean(slug), retry: false });
  const [captureRequestId, setCaptureRequestId] = useState('');
  const enquiry = trpc.sharedLiving.enquire.useMutation({ onSuccess: (_result, variables) => setCaptureRequestId(variables.captureRequestId) });
  const item = detail.data;

  if (detail.isLoading) return <main className="mx-auto max-w-6xl px-4 py-10"><div className="h-96 animate-pulse rounded-3xl bg-slate-200" /></main>;
  if (detail.error || !item) return <main className="mx-auto max-w-3xl px-4 py-12"><div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h1 className="text-xl font-bold">This accommodation is no longer available.</h1><p className="mt-2 text-sm text-amber-950">It may have been rented, paused or removed from public discovery.</p><Link href="/shared-living" className="mt-4 inline-flex items-center gap-2 font-semibold text-emerald-800"><ArrowLeft className="h-4 w-4" />Browse other accommodation</Link></div></main>;

  const rent = item.rentUnknown ? 'Rent to be confirmed' : `R ${new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 }).format(item.rentAmountMinor / 100)} / month${item.rentBasis === 'per_person' ? ' per person' : ' per space'}`;
  const images = [...item.images, ...item.residenceImages].filter((image, index, all) => all.findIndex(other => other.url === image.url) === index);
  const bills = (['electricity', 'water', 'wifi'] as const).map(key => ({ key, status: item.bills[key] }));

  return <main className="min-h-screen bg-[#f5f8fb] text-slate-900">
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <Link href="/shared-living" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowLeft className="h-4 w-4" />Back to Shared Living</Link>
      <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
        <section>
          <div className="grid h-[280px] overflow-hidden rounded-3xl bg-slate-200 sm:h-[420px] sm:grid-cols-[1.6fr_.8fr]">
            {images[0] ? <img src={images[0].url} alt={images[0].caption || item.label} className="h-full min-h-0 w-full object-cover" /> : <div className="flex items-center justify-center bg-gradient-to-br from-slate-200 to-emerald-100 text-slate-500">Accommodation photographs</div>}
            <div className="hidden grid-rows-2 gap-2 bg-[#f5f8fb] p-2 sm:grid">{[images[1], images[2]].map((image, index) => image ? <img key={image.url} src={image.url} alt={image.caption || `${item.label} photo ${index + 2}`} className="h-full w-full rounded-2xl object-cover" /> : <div key={index} className="rounded-2xl bg-slate-200" />)}</div>
          </div>
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4"><div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">{accommodationLabels[item.accommodationType] || 'Accommodation'}</span><h1 className="mt-3 text-3xl font-bold md:text-4xl">{item.label}</h1><p className="mt-2 flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4 text-emerald-700" />{item.locationLabel} · {item.residenceName}</p></div><div className="rounded-2xl bg-white px-5 py-4 shadow-sm"><p className="text-xl font-bold text-emerald-800">{rent}</p><p className="mt-1 text-xs text-slate-500">Monthly rent as supplied by the lister</p></div></div>
          <div className="mt-5 flex flex-wrap gap-3"><span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm"><Users className="h-4 w-4 text-emerald-700" />Occupancy up to {item.occupancyCount ?? 'to be confirmed'}</span><span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm"><Bath className="h-4 w-4 text-emerald-700" />{item.bathroomAccess === 'own' ? 'Private bathroom' : item.bathroomAccess === 'shared' ? 'Shared bathroom' : 'Bathroom to be confirmed'}</span><span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm"><BedDouble className="h-4 w-4 text-emerald-700" />{item.furnishedState === 'unknown' ? 'Furnishing to be confirmed' : item.furnishedState === 'partial' ? 'Part furnished' : item.furnishedState}</span></div>
          <section className="mt-7 rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">About this space</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{item.description}</p>{item.residenceDescription && <><h3 className="mt-6 font-bold">About {item.residenceName}</h3><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{item.residenceDescription}</p></>}</section>
          <section className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="font-bold">Space facilities</h2><div className="mt-3 flex flex-wrap gap-2">{item.spaceFacilities.length ? item.spaceFacilities.map(code => <span key={code} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs">{labels[code] || code.replace(/_/g, ' ')}</span>) : <span className="text-sm text-slate-500">No additional space facilities supplied.</span>}</div></div>
            <div className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="font-bold">Shared residence facilities</h2><div className="mt-3 flex flex-wrap gap-2">{item.sharedFacilities.length ? item.sharedFacilities.map(code => <span key={code} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs">{labels[code] || code.replace(/_/g, ' ')}</span>) : <span className="text-sm text-slate-500">No shared facilities supplied.</span>}</div></div>
          </section>
          <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm"><h2 className="font-bold">Utilities</h2><div className="mt-3 grid gap-2 sm:grid-cols-3">{bills.map(({ key, status }) => <p key={key} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm capitalize"><span className={`h-2 w-2 rounded-full ${status === 'included' ? 'bg-emerald-500' : status === 'excluded' ? 'bg-slate-400' : 'bg-amber-400'}`} />{key}: {status === 'to_be_confirmed' ? 'To be confirmed' : status}</p>)}</div></section>
          <p className="mt-5 flex items-start gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-950"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />This accommodation has been reviewed for publication. The location shown is approximate; the private street address is shared only through an authorized process.</p>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start"><section className="rounded-3xl bg-white p-6 shadow-md"><p className="text-xs font-bold uppercase tracking-[.15em] text-emerald-800">Ask about this space</p><h2 className="mt-2 text-2xl font-bold">Contact the listing agent</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your enquiry is delivered to the currently authorized agent for this residence. Contact details are protected in the on-platform conversation.</p>
            {captureRequestId ? <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 font-bold text-emerald-900"><Check className="h-5 w-5" />Enquiry sent</div><p className="mt-2 text-sm text-emerald-900">Your conversation is ready. Use this private link to follow up and see replies.</p><Link href={`/shared-living/thread/${captureRequestId}`} className="mt-3 inline-flex rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white">Open your enquiry</Link></div> : <form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); enquiry.mutate({ slPlaceId: item.placeId, slSpaceId: item.id, name: String(new FormData(event.currentTarget).get('name') || ''), email: String(new FormData(event.currentTarget).get('email') || ''), phone: String(new FormData(event.currentTarget).get('phone') || '') || undefined, message: String(new FormData(event.currentTarget).get('message') || ''), captureRequestId: crypto.randomUUID(), consent: { accepted: true, version: 'shared-living-enquiry-v1', source: 'shared_living_space_detail' } }); }}>
              <label className="block text-sm font-medium">Your name<input required name="name" maxLength={120} autoComplete="name" className="mt-1 w-full rounded-xl border border-slate-200 p-3" /></label>
              <label className="block text-sm font-medium">Email address<input required type="email" name="email" maxLength={320} autoComplete="email" className="mt-1 w-full rounded-xl border border-slate-200 p-3" /></label>
              <label className="block text-sm font-medium">Phone <span className="font-normal text-slate-500">(optional)</span><input name="phone" maxLength={32} autoComplete="tel" className="mt-1 w-full rounded-xl border border-slate-200 p-3" /></label>
              <label className="block text-sm font-medium">Your message<textarea required minLength={5} maxLength={4000} name="message" rows={4} className="mt-1 w-full rounded-xl border border-slate-200 p-3" placeholder={`I'm interested in ${item.label}…`} /></label>
              <p className="text-xs leading-5 text-slate-500">By sending this enquiry, you agree Property Listify may share it with the currently authorized lister so they can respond.</p>
              <button disabled={enquiry.isPending} className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{enquiry.isPending ? 'Sending enquiry…' : 'Send private enquiry'}</button>
              {enquiry.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{enquiry.error.message}</p>}
            </form>}
          </section></aside>
      </div>
    </div>
  </main>;
}
