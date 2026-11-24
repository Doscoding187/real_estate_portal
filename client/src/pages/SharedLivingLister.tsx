import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { CanonicalPlaceSelector, type CanonicalPlaceSelection } from '@/components/location/CanonicalPlaceSelector';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { SHARED_LIVING_ACCOMMODATION_LABELS, SHARED_LIVING_ACCOMMODATION_TYPES } from '@shared/sharedLivingDomain';

const today = new Date().toISOString().slice(0, 10);
const inOneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const facilityOptions = [
  ['secure_parking', 'Secure parking'], ['garden', 'Garden'], ['laundry', 'Laundry'],
  ['pool', 'Pool'], ['security', 'Security'], ['shared_kitchen', 'Shared kitchen'],
  ['study_area', 'Study area'], ['communal_lounge', 'Communal lounge'],
  ['backup_power', 'Backup power'], ['wifi', 'Wi-Fi'],
] as const;

async function uploadFile(url: string, file: File): Promise<void> {
  const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!response.ok) throw new Error('The upload did not complete. Please try again.');
}

function ErrorText({ message }: { message?: string }) {
  return message ? <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null;
}

export default function SharedLivingLister() {
  const utils = trpc.useUtils();
  const places = trpc.sharedLiving.myPlaces.useQuery();
  const [takeoverMode, setTakeoverMode] = useState(false);
  const [takeoverPlaceId, setTakeoverPlaceId] = useState<number | null>(null);
  const requestable = trpc.sharedLiving.requestableResidences.useQuery(undefined, { enabled: takeoverMode });
  const [placeId, setPlaceId] = useState<number | null>(null);
  const [canonicalPlace, setCanonicalPlace] = useState<CanonicalPlaceSelection | null>(null);
  const [residenceName, setResidenceName] = useState('');
  const [privateAddress, setPrivateAddress] = useState('');
  const [placeKind, setPlaceKind] = useState<'house' | 'apartment' | 'townhouse' | 'student_residence' | 'other'>('house');
  const [responsiblePartyRole, setResponsiblePartyRole] = useState<'owner' | 'landlord' | 'operator'>('owner');
  const [responsiblePartyName, setResponsiblePartyName] = useState('');
  const [responsiblePartyEmail, setResponsiblePartyEmail] = useState('');
  const [responsiblePartyPhone, setResponsiblePartyPhone] = useState('');
  const [authorityEffectiveDate, setAuthorityEffectiveDate] = useState(today);
  const [authorityExpiryDate, setAuthorityExpiryDate] = useState(inOneYear);
  const [mandateFile, setMandateFile] = useState<File | null>(null);
  const [residenceImage, setResidenceImage] = useState<File | null>(null);
  const [spacePhoto, setSpacePhoto] = useState<File | null>(null);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [spaceLabel, setSpaceLabel] = useState('');
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
  const [spaceDescription, setSpaceDescription] = useState('');
  const [accommodationType, setAccommodationType] = useState<(typeof SHARED_LIVING_ACCOMMODATION_TYPES)[number]>('private_room');
  const [marketTag, setMarketTag] = useState<'room_share' | 'independent_micro' | 'student'>('room_share');
  const [rent, setRent] = useState('');
  const [rentUnknown, setRentUnknown] = useState(false);
  const [rentBasis, setRentBasis] = useState<'per_space' | 'per_person'>('per_space');
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'occupied' | 'unavailable'>('available');
  const [availableFrom, setAvailableFrom] = useState(today);
  const [occupancyCount, setOccupancyCount] = useState('1');
  const [furnishedState, setFurnishedState] = useState<'furnished' | 'unfurnished' | 'partial' | 'unknown'>('unknown');
  const [bathroomAccess, setBathroomAccess] = useState<'own' | 'shared' | 'unknown'>('unknown');
  const [parkingBays, setParkingBays] = useState('');
  const [bills, setBills] = useState<Record<'electricity' | 'water' | 'wifi', 'included' | 'excluded' | 'to_be_confirmed'>>({ electricity: 'to_be_confirmed', water: 'to_be_confirmed', wifi: 'to_be_confirmed' });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!placeId && places.data?.length) setPlaceId(places.data[0]!.id);
  }, [placeId, places.data]);

  const detail = trpc.sharedLiving.residenceDetail.useQuery({ placeId: placeId || 0 }, { enabled: placeId !== null });
  const createResidence = trpc.sharedLiving.createDraft.useMutation({ onSuccess: async result => {
    setNotice('Residence draft saved. Upload the mandate evidence to request verification.');
    setPlaceId(result.placeId);
    await utils.sharedLiving.myPlaces.invalidate();
  } });
  const requestAuthority = trpc.sharedLiving.requestAuthority.useMutation({ onSuccess: async result => {
    setNotice('Authority request saved. Upload the signed mandate evidence for independent review.');
    setPlaceId(result.placeId);
    setTakeoverMode(false);
    setTakeoverPlaceId(null);
    await Promise.all([utils.sharedLiving.myPlaces.invalidate(), utils.sharedLiving.residenceDetail.invalidate()]);
  } });
  const evidenceTarget = trpc.sharedLiving.mandateEvidenceUploadTarget.useMutation();
  const attachEvidence = trpc.sharedLiving.attachMandateEvidence.useMutation();
  const submitMandate = trpc.sharedLiving.submitMandateForReview.useMutation({ onSuccess: async () => { setNotice('Mandate submitted for independent review. You can continue preparing the residence and its spaces.'); await Promise.all([utils.sharedLiving.myPlaces.invalidate(), utils.sharedLiving.residenceDetail.invalidate()]); } });
  const addSpace = trpc.sharedLiving.addSpace.useMutation({ onSuccess: async result => {
    setNotice(`${spaceLabel} saved as a draft. Upload a photo so it can be reviewed.`);
    await Promise.all([utils.sharedLiving.myPlaces.invalidate(), utils.sharedLiving.residenceDetail.invalidate()]);
    if (spacePhoto) await attachPhoto('space', result.spaceId, spacePhoto);
    setSpaceLabel(''); setSpaceDescription(''); setRent(''); setSpacePhoto(null);
  } });
  const updateSpace = trpc.sharedLiving.updateSpace.useMutation({ onSuccess: async () => {
    setNotice(`${spaceLabel} updated. Material changes to a published space are queued for review.`);
    await Promise.all([utils.sharedLiving.myPlaces.invalidate(), utils.sharedLiving.residenceDetail.invalidate()]);
    setSpaceLabel(''); setSpaceDescription(''); setRent(''); setSpacePhoto(null); setEditingSpaceId(null);
  } });
  const attachMedia = trpc.sharedLiving.attachMedia.useMutation();
  const presign = trpc.upload.presign.useMutation();
  const saveFacilities = trpc.sharedLiving.saveResidenceFacilities.useMutation({ onSuccess: () => void detail.refetch() });
  const submitResidence = trpc.sharedLiving.submitForReview.useMutation({ onSuccess: async result => {
    setNotice(`Residence submitted for review with ${result.spacesSubmitted} accommodation space(s).`);
    await Promise.all([utils.sharedLiving.myPlaces.invalidate(), utils.sharedLiving.residenceDetail.invalidate()]);
  } });

  async function attachPhoto(scope: 'residence' | 'space', entityId: number, file: File) {
    try {
      const reservation = await presign.mutateAsync({ filename: file.name, contentType: file.type });
      await uploadFile(reservation.url, file);
      await attachMedia.mutateAsync({ scope, entityId, key: reservation.key, contentType: file.type, caption: file.name });
      setNotice('Photo uploaded and queued for review.');
      await Promise.all([utils.sharedLiving.myPlaces.invalidate(), utils.sharedLiving.residenceDetail.invalidate()]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The photo could not be uploaded.');
    }
  }

  async function createResidenceDraft(event: React.FormEvent) {
    event.preventDefault();
    if (!canonicalPlace) { setNotice('Choose an approved Property Listify Place.'); return; }
    setNotice('');
    createResidence.mutate({
      residenceName, addressLinePrivate: privateAddress, canonicalPlaceId: canonicalPlace.canonicalPlaceId,
      placeKind, responsiblePartyRole, responsiblePartyName, responsiblePartyEmail,
      ...(responsiblePartyPhone ? { responsiblePartyPhone } : {}),
      authorityEffectiveDate, authorityExpiryDate,
    });
  }

  async function uploadMandate() {
    if (!placeId || !detail.data || !mandateFile) return;
    try {
      const target = await evidenceTarget.mutateAsync({ placeId, fileName: mandateFile.name, contentType: mandateFile.type });
      await uploadFile(target.url, mandateFile);
      await attachEvidence.mutateAsync({ authorityId: detail.data.authorityId, uploadToken: target.uploadToken });
      setNotice('Mandate evidence securely attached. Submit the mandate for independent review.');
      setMandateFile(null);
      await detail.refetch();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Mandate evidence could not be uploaded.');
    }
  }

  function createSpace(event: React.FormEvent) {
    event.preventDefault();
    if (!placeId) return;
    const values = {
      label: spaceLabel, description: spaceDescription, accommodationType, marketTag,
      rentAmountMinor: Math.round(Number(rent || 0) * 100), rentUnknown, rentBasis,
      availabilityStatus, ...(availableFrom ? { availableFrom } : {}),
      ...(occupancyCount ? { occupancyCount: Number(occupancyCount) } : {}),
      furnishedState, bathroomAccess,
      bills, facilities: [],
    };
    if (editingSpaceId) {
      updateSpace.mutate({ ...values, spaceId: editingSpaceId, parkingBays: parkingBays ? Number(parkingBays) : null });
    } else {
      addSpace.mutate({ ...values, placeId, ...(parkingBays ? { parkingBays: Number(parkingBays) } : {}) });
    }
  }

  function beginSpaceEdit(space: NonNullable<typeof detail.data>['spaces'][number]) {
    setEditingSpaceId(space.id);
    setSpaceLabel(space.label);
    setSpaceDescription(space.description || '');
    setAccommodationType(space.accommodationType as typeof accommodationType);
    setMarketTag(space.marketTag as typeof marketTag);
    setRent(String((space.availability?.rentAmountMinor || 0) / 100));
    setRentUnknown(Boolean(space.availability?.rentUnknown));
    setRentBasis((space.availability?.rentBasis || 'per_space') as typeof rentBasis);
    setAvailabilityStatus(space.availabilityStatus as typeof availabilityStatus);
    setAvailableFrom(String(space.availability?.availableFrom || '').slice(0, 10));
    setOccupancyCount(String(space.occupancyCount || 1));
    setFurnishedState(space.furnishedState as typeof furnishedState);
    setBathroomAccess(space.bathroomAccess as typeof bathroomAccess);
    setParkingBays(space.parkingBays == null ? '' : String(space.parkingBays));
    setBills(space.availability?.bills || { electricity: 'to_be_confirmed', water: 'to_be_confirmed', wifi: 'to_be_confirmed' });
    setNotice('Edit the selected accommodation space.');
  }

  const activeResidence = detail.data;
  const authorityApproved = activeResidence?.authorityStatus === 'approved' && new Date(activeResidence.authorityExpiry).getTime() > Date.now();

  return (
    <AgentAppShell>
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-7 text-white shadow-sm md:p-9">
          <Link href="/shared-living" className="text-sm text-emerald-200 hover:text-white">← Shared Living marketplace</Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-emerald-300">Property Listify · Agent workspace</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Manage accommodation listings</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">Create a residence once, then add rooms or cottages as separate listings. A residence and every space are reviewed independently before publication.</p>
        </header>

        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
        {places.error && <ErrorText message={places.error.message} />}

        <section className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Your residences</h2><span className="text-xs text-slate-500">{places.data?.length ?? 0}</span></div>
              <div className="mt-3 space-y-2">
                {(places.data ?? []).map(residence => (
                  <button key={`${residence.id}-${residence.authorityStatus}`} type="button" onClick={() => setPlaceId(residence.id)} className={`w-full rounded-xl border p-3 text-left ${placeId === residence.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="block font-medium">{residence.residenceName || residence.slug}</span>
                    <span className="mt-1 block text-xs text-slate-500">{residence.publicationStatus.replace('_', ' ')} · mandate {residence.authorityStatus.replace('_', ' ')}</span>
                    <span className="block text-xs text-slate-500">{residence.spaces.length} space(s)</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setPlaceId(null); setTakeoverMode(false); setCanonicalPlace(null); setNotice(''); }} className="mt-3 w-full rounded-xl border border-dashed border-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">+ Add a new residence</button>
              <button type="button" onClick={() => { setPlaceId(null); setTakeoverMode(true); setNotice(''); }} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Request authority for an existing residence</button>
            </div>
            <ListerInbox />
          </aside>

          <div className="space-y-5">
            {placeId === null && takeoverMode ? (
              <form onSubmit={event => { event.preventDefault(); if (!takeoverPlaceId) return; requestAuthority.mutate({ placeId: takeoverPlaceId, responsiblePartyRole, responsiblePartyName, responsiblePartyEmail, ...(responsiblePartyPhone ? { responsiblePartyPhone } : {}), authorityEffectiveDate, authorityExpiryDate }); }} className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm md:p-7">
                <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Existing residence · replacement mandate</p><h2 className="mt-1 text-xl font-semibold">Request authority to manage an existing residence</h2><p className="mt-1 text-sm text-slate-600">Only previously represented residences without a current or pending agent mandate appear here. Private addresses and previous enquiry information are not disclosed.</p></div>
                {requestable.isLoading && <p className="text-sm text-slate-600">Finding residences eligible for a new mandate…</p>}
                {requestable.error && <ErrorText message={requestable.error.message} />}
                {!requestable.isLoading && requestable.data?.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">There are no unrepresented residences available for a replacement mandate request.</p>}
                {!!requestable.data?.length && <label className="block text-sm font-medium">Residence<select required value={takeoverPlaceId || ''} onChange={event => setTakeoverPlaceId(Number(event.target.value) || null)} className="mt-1 w-full rounded-lg border p-3 font-normal"><option value="">Choose a residence</option>{requestable.data.map(item => <option key={item.id} value={item.id}>{item.residenceName} · {item.publicLocation}</option>)}</select></label>}
                <div className="rounded-xl bg-slate-50 p-4"><h3 className="font-semibold">Responsible property party</h3><div className="mt-3 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium">Relationship<select value={responsiblePartyRole} onChange={event => setResponsiblePartyRole(event.target.value as typeof responsiblePartyRole)} className="mt-1 w-full rounded-lg border p-3 font-normal"><option value="owner">Owner</option><option value="landlord">Landlord</option><option value="operator">Residence operator</option></select></label>
                  <label className="text-sm font-medium">Grantor name<input required value={responsiblePartyName} onChange={event => setResponsiblePartyName(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                  <label className="text-sm font-medium">Grantor email<input required type="email" value={responsiblePartyEmail} onChange={event => setResponsiblePartyEmail(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                  <label className="text-sm font-medium">Grantor phone <span className="font-normal text-slate-500">(optional)</span><input value={responsiblePartyPhone} onChange={event => setResponsiblePartyPhone(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                  <label className="text-sm font-medium">Effective date<input required type="date" value={authorityEffectiveDate} onChange={event => setAuthorityEffectiveDate(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                  <label className="text-sm font-medium">Expiry date<input required type="date" min={authorityEffectiveDate} value={authorityExpiryDate} onChange={event => setAuthorityExpiryDate(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                </div></div>
                <p className="text-sm text-slate-600">Upload a signed mandate or equivalent authorization after saving. A Property Listify reviewer must independently approve the evidence before the agent can manage or publish this residence.</p>
                <div className="flex flex-wrap gap-3"><button disabled={requestAuthority.isPending || !takeoverPlaceId} className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{requestAuthority.isPending ? 'Saving request…' : 'Request authority'}</button><button type="button" onClick={() => setTakeoverMode(false)} className="rounded-xl border px-5 py-3 font-semibold">Create a new residence instead</button></div>
                {requestAuthority.error && <ErrorText message={requestAuthority.error.message} />}
              </form>
            ) : placeId === null ? (
              <form onSubmit={createResidenceDraft} className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm md:p-7">
                <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">01 · Residence and authority</p><h2 className="mt-1 text-xl font-semibold">Who is authorising this accommodation?</h2><p className="mt-1 text-sm text-slate-600">The property party is recorded separately from your agent account. The private street address is never shown publicly.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium">Residence or property name<input required value={residenceName} onChange={e => setResidenceName(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" placeholder="e.g. Oakwood Student Residence" /></label>
                  <label className="text-sm font-medium">Property type<select value={placeKind} onChange={e => setPlaceKind(e.target.value as typeof placeKind)} className="mt-1 w-full rounded-lg border p-3 font-normal"><option value="house">House</option><option value="apartment">Apartment</option><option value="townhouse">Townhouse</option><option value="student_residence">Student residence</option><option value="other">Other</option></select></label>
                  <label className="text-sm font-medium md:col-span-2">Exact street address <span className="font-normal text-slate-500">(private; reviewer only)</span><input required value={privateAddress} onChange={e => setPrivateAddress(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" autoComplete="street-address" /></label>
                </div>
                <CanonicalPlaceSelector value={canonicalPlace} onChange={setCanonicalPlace} label="Public area" purpose="authoring" placeholder="Search an approved suburb, town or city" hint="Only this approved geographic area appears on the public listing." />
                <div className="rounded-xl bg-slate-50 p-4"><h3 className="font-semibold">Responsible property party</h3><div className="mt-3 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium">Relationship<select value={responsiblePartyRole} onChange={e => setResponsiblePartyRole(e.target.value as typeof responsiblePartyRole)} className="mt-1 w-full rounded-lg border p-3 font-normal"><option value="owner">Owner</option><option value="landlord">Landlord</option><option value="operator">Residence operator</option></select></label>
                  <label className="text-sm font-medium">Grantor name<input required value={responsiblePartyName} onChange={e => setResponsiblePartyName(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                  <label className="text-sm font-medium">Grantor email<input required type="email" value={responsiblePartyEmail} onChange={e => setResponsiblePartyEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                  <label className="text-sm font-medium">Grantor phone <span className="font-normal text-slate-500">(optional)</span><input value={responsiblePartyPhone} onChange={e => setResponsiblePartyPhone(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                  <label className="text-sm font-medium">Mandate effective date<input required type="date" value={authorityEffectiveDate} onChange={e => setAuthorityEffectiveDate(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                  <label className="text-sm font-medium">Mandate expiry date<input required type="date" min={authorityEffectiveDate} value={authorityExpiryDate} onChange={e => setAuthorityExpiryDate(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                </div></div>
                <p className="text-sm text-slate-600">A signed mandate or equivalent verifiable owner/landlord authorization is required. A self-declared representation cannot be approved.</p>
                <button disabled={createResidence.isPending} className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{createResidence.isPending ? 'Saving residence…' : 'Save residence and continue'}</button>
                <ErrorText message={createResidence.error?.message} />
              </form>
            ) : detail.isLoading ? <div className="rounded-2xl border bg-white p-6">Loading residence…</div> : detail.error ? <ErrorText message={detail.error.message} /> : activeResidence ? (
              <>
                <section className="rounded-2xl border bg-white p-5 shadow-sm md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Residence · {activeResidence.publicationStatus.replace('_', ' ')}</p><h2 className="mt-1 text-2xl font-semibold">{activeResidence.residenceName}</h2><p className="mt-1 text-sm text-slate-600">Mandate: {activeResidence.authorityStatus.replace('_', ' ')} · evidence files: {activeResidence.authorityEvidenceCount}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{activeResidence.canonicalPlaceId}</span></div>
                  {activeResidence.authorityStatus !== 'approved' && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold text-amber-950">Mandate review</h3><p className="mt-1 text-sm text-amber-900">Upload the signed mandate or other verifiable authorization. A reviewer must approve it before the residence or spaces can be submitted.</p><div className="mt-3 flex flex-wrap items-center gap-3"><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setMandateFile(e.target.files?.[0] || null)} className="text-sm" /><button type="button" onClick={() => void uploadMandate()} disabled={!mandateFile || attachEvidence.isPending || evidenceTarget.isPending} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Upload evidence</button><button type="button" onClick={() => submitMandate.mutate({ authorityId: activeResidence.authorityId })} disabled={activeResidence.authorityEvidenceCount < 1 || submitMandate.isPending || !['draft', 'rejected'].includes(activeResidence.authorityStatus)} className="rounded-lg border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50">Submit mandate</button></div><ErrorText message={attachEvidence.error?.message || evidenceTarget.error?.message || submitMandate.error?.message} /></div>}
                  {activeResidence.authorityStatus === 'approved' && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Current mandate approved through {String(activeResidence.authorityExpiry).slice(0, 10)}.</div>}
                  {activeResidence.media.map(photo => <span key={photo.id} className="mr-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs">Residence photo · {photo.reviewStatus}</span>)}
                  <div className="mt-4 flex flex-wrap items-center gap-3"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={e => setResidenceImage(e.target.files?.[0] || null)} /><button type="button" disabled={!residenceImage || presign.isPending} onClick={() => { if (residenceImage && placeId) void attachPhoto('residence', placeId, residenceImage); }} className="rounded-lg border px-3 py-2 text-sm font-semibold">Upload residence photo (optional)</button></div>
                  <div className="mt-5"><h3 className="font-semibold">Shared residence facilities</h3><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">{facilityOptions.map(([code, label]) => <label key={code} className="flex items-center gap-2 rounded-lg border p-2 text-sm"><input type="checkbox" checked={selectedFacilities.includes(code)} onChange={e => setSelectedFacilities(value => e.target.checked ? [...value, code] : value.filter(item => item !== code))} />{label}</label>)}</div><button type="button" disabled={saveFacilities.isPending} onClick={() => saveFacilities.mutate({ placeId: activeResidence.id, facilities: selectedFacilities })} className="mt-3 rounded-lg border px-3 py-2 text-sm font-semibold">Save shared facilities</button></div>
                </section>

                <section className="rounded-2xl border bg-white p-5 shadow-sm md:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Independent accommodation spaces</p><h2 className="mt-1 text-xl font-semibold">Rooms and cottages at this residence</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{activeResidence.spaces.length} space(s)</span></div>
                  {activeResidence.spaces.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-2">{activeResidence.spaces.map(space => <article key={space.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{space.label}</h3><p className="text-sm text-slate-600">{SHARED_LIVING_ACCOMMODATION_LABELS[space.accommodationType as keyof typeof SHARED_LIVING_ACCOMMODATION_LABELS] || space.accommodationType}</p><p className="mt-1 text-sm font-semibold text-emerald-800">{space.availability?.rentUnknown ? 'Rent to be confirmed' : `R ${((space.availability?.rentAmountMinor || 0) / 100).toLocaleString('en-ZA')} / month${space.availability?.rentBasis === 'per_person' ? ' per person' : ' per space'}`}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{space.publicationStatus.replace('_', ' ')}</span></div><p className="mt-1 text-sm text-slate-600">Availability: {space.availabilityStatus} · occupancy {space.occupancyCount ?? 'to confirm'}</p><div className="mt-2 flex flex-wrap gap-2">{space.media.map(photo => <span key={photo.id} className="rounded-full bg-slate-50 px-2 py-1 text-xs text-slate-600">Photo · {photo.reviewStatus}</span>)}{space.media.length === 0 && <span className="text-xs text-amber-700">Needs a photo</span>}</div><button type="button" onClick={() => beginSpaceEdit(space)} className="mt-3 rounded-lg border px-3 py-2 text-xs font-semibold">Edit this space</button></article>)}</div>}
                  <form onSubmit={createSpace} className="mt-6 space-y-4 border-t pt-5">
                    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{editingSpaceId ? `Edit ${spaceLabel}` : 'Add another space'}</h3>{editingSpaceId && <button type="button" onClick={() => { setEditingSpaceId(null); setSpaceLabel(''); setSpaceDescription(''); setRent(''); setSpacePhoto(null); }} className="text-sm font-semibold text-slate-600 underline">Cancel edit</button>}</div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-medium">Space name<input required value={spaceLabel} onChange={e => setSpaceLabel(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" placeholder="e.g. Garden cottage" /></label>
                      <label className="text-sm font-medium">Accommodation type<select value={accommodationType} onChange={e => setAccommodationType(e.target.value as typeof accommodationType)} className="mt-1 w-full rounded-lg border p-3 font-normal">{SHARED_LIVING_ACCOMMODATION_TYPES.map(type => <option key={type} value={type}>{SHARED_LIVING_ACCOMMODATION_LABELS[type]}</option>)}</select></label>
                      <label className="text-sm font-medium">Listing market<select value={marketTag} onChange={e => setMarketTag(e.target.value as typeof marketTag)} className="mt-1 w-full rounded-lg border p-3 font-normal"><option value="room_share">Room share</option><option value="independent_micro">Independent cottage or studio</option><option value="student">Student accommodation</option></select></label>
                      <label className="text-sm font-medium">Monthly rent (R)<input type="number" min="0" step="50" value={rent} onChange={e => setRent(e.target.value)} disabled={rentUnknown} required={!rentUnknown} className="mt-1 w-full rounded-lg border p-3 font-normal" /><span className="mt-1 flex items-center gap-2 font-normal"><input type="checkbox" checked={rentUnknown} onChange={e => setRentUnknown(e.target.checked)} />Rent to be confirmed</span></label>
                      <label className="text-sm font-medium">Pricing basis<select value={rentBasis} onChange={e => setRentBasis(e.target.value as typeof rentBasis)} className="mt-1 w-full rounded-lg border p-3 font-normal"><option value="per_space">Per space</option><option value="per_person">Per person</option></select></label>
                      <label className="text-sm font-medium">Availability status<select value={availabilityStatus} onChange={e => setAvailabilityStatus(e.target.value as typeof availabilityStatus)} className="mt-1 w-full rounded-lg border p-3 font-normal"><option value="available">Available</option><option value="occupied">Occupied</option><option value="unavailable">Unavailable</option></select></label>
                      <label className="text-sm font-medium">Available from<input type="date" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                      <label className="text-sm font-medium">Maximum occupants<input type="number" min="1" max="50" value={occupancyCount} onChange={e => setOccupancyCount(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                      <label className="text-sm font-medium">Furnishing<select value={furnishedState} onChange={e => setFurnishedState(e.target.value as typeof furnishedState)} className="mt-1 w-full rounded-lg border p-3 font-normal"><option value="unknown">To be confirmed</option><option value="furnished">Furnished</option><option value="partial">Part furnished</option><option value="unfurnished">Unfurnished</option></select></label>
                      <label className="text-sm font-medium">Bathroom access<select value={bathroomAccess} onChange={e => setBathroomAccess(e.target.value as typeof bathroomAccess)} className="mt-1 w-full rounded-lg border p-3 font-normal"><option value="unknown">To be confirmed</option><option value="own">Private</option><option value="shared">Shared</option></select></label>
                      <label className="text-sm font-medium">Parking bays<input type="number" min="0" max="50" value={parkingBays} onChange={e => setParkingBays(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>
                      <label className="text-sm font-medium md:col-span-2">Space description<textarea required minLength={20} maxLength={4000} rows={4} value={spaceDescription} onChange={e => setSpaceDescription(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" placeholder="Describe this room or cottage, its layout and what is included." /></label>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">{(['electricity', 'water', 'wifi'] as const).map(item => <label key={item} className="text-sm font-medium capitalize">{item.replace('_', ' ')}<select value={bills[item]} onChange={e => setBills(prev => ({ ...prev, [item]: e.target.value as typeof prev[typeof item] }))} className="mt-1 w-full rounded-lg border p-3 font-normal"><option value="to_be_confirmed">To be confirmed</option><option value="included">Included</option><option value="excluded">Excluded</option></select></label>)}</div>
                    <label className="block text-sm font-medium">Space photo {editingSpaceId ? '(optional replacement)' : '(required before submission)'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={e => setSpacePhoto(e.target.files?.[0] || null)} className="mt-2 block w-full rounded-lg border p-3 font-normal" /></label>
                    {editingSpaceId && spacePhoto && <button type="button" onClick={() => { if (spacePhoto && editingSpaceId) void attachPhoto('space', editingSpaceId, spacePhoto); }} className="rounded-lg border px-4 py-2 text-sm font-semibold">Upload replacement photo</button>}
                    <button disabled={addSpace.isPending || updateSpace.isPending || !authorityApproved} className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{addSpace.isPending || updateSpace.isPending ? 'Saving space…' : editingSpaceId ? 'Save space changes' : 'Add accommodation space'}</button>
                    {!authorityApproved && <p className="text-sm text-amber-800">The verified mandate must be approved before spaces can be added.</p>}
                    <ErrorText message={addSpace.error?.message || updateSpace.error?.message || attachMedia.error?.message} />
                  </form>
                </section>

                <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm"><div><h2 className="font-semibold">Submit the residence and spaces</h2><p className="mt-1 text-sm text-slate-600">Review is independent for the residence and each space. A listing only appears when both are approved and the mandate remains current.</p></div><button type="button" disabled={!authorityApproved || activeResidence.spaces.length === 0 || submitResidence.isPending} onClick={() => submitResidence.mutate({ placeId: activeResidence.id })} className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-50">{submitResidence.isPending ? 'Submitting…' : 'Submit for review'}</button><ErrorText message={submitResidence.error?.message} /></section>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
    </AgentAppShell>
  );
}

function ListerInbox() {
  const threads = trpc.sharedLiving.myListerThreads.useQuery();
  const [token, setToken] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const thread = trpc.sharedLiving.listerThread.useQuery({ token: token || '00000000-0000-0000-0000-000000000000' }, { enabled: Boolean(token) });
  const reply = trpc.sharedLiving.replyAsLister.useMutation({ onSuccess: () => { setBody(''); void thread.refetch(); } });
  return <section aria-label="Shared Living inbox" className="rounded-2xl border bg-white p-4 shadow-sm">
    <h2 className="font-semibold">Enquiry history</h2>
    {threads.error && <ErrorText message={threads.error.message} />}
    {!threads.isLoading && !threads.error && !(threads.data?.length || 0) && <p className="mt-2 text-sm text-slate-600">No enquiries yet.</p>}
    <ul className="mt-3 space-y-2">{(threads.data ?? []).map(item => <li key={item.token}><button type="button" onClick={() => setToken(item.token)} className={`w-full rounded-lg border p-2 text-left text-sm ${token === item.token ? 'border-emerald-500 bg-emerald-50' : ''}`}><span className="block font-medium">{item.spaceLabelSnapshot || 'Accommodation enquiry'}</span><span className="text-xs text-slate-500">{item.deliveryStatus}</span></button></li>)}</ul>
    {token && thread.data && <div className="mt-3 rounded-lg bg-slate-50 p-3"><div className="max-h-40 space-y-2 overflow-y-auto">{thread.data.messages.map(message => <p key={message.id} className="text-xs"><strong>{message.authorKind}:</strong> {message.body}</p>)}</div><textarea aria-label="Reply to enquiry" value={body} onChange={e => setBody(e.target.value)} className="mt-2 w-full rounded border p-2 text-sm" placeholder="Reply while your mandate is current" /><button type="button" disabled={!body.trim() || reply.isPending} onClick={() => reply.mutate({ token, body })} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Send reply</button><ErrorText message={reply.error?.message} /></div>}
  </section>;
}
