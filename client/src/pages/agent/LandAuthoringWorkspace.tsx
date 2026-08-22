import { useState } from 'react';
import { useLocation } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { LAND_CLASSIFICATION_LABELS, LAND_PUBLIC_CLASSIFICATIONS, type LandPublicClassification } from '@shared/land-domain';

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

const labels = Object.fromEntries(LAND_PUBLIC_CLASSIFICATIONS.map(value => [value, LAND_CLASSIFICATION_LABELS[value]])) as Record<LandPublicClassification, string>;
type LandClassification = LandPublicClassification;

export default function LandAuthoringWorkspace() {
  const [, setLocation] = useLocation();
  const [listingId, setListingId] = useState<number | null>(null);
  const [form, setForm] = useState({ classification: 'residential_stand' as LandClassification, title: '', description: '', askingPrice: '', city: '', province: '', provinceId: '', cityId: '', parcelKind: 'erf' as 'erf' | 'portion' | 'farm' | 'remainder' | 'other', parcelReference: '', extentM2: '', intendedUse: '' });
  const [fact, setFact] = useState({ code: 'water' as any, value: '' });
  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<'mandate' | 'title_registry' | 'parcel_survey' | 'planning' | 'other'>('mandate');
  const create = trpc.land.createDraft.useMutation();
  const addClaims = trpc.land.addClaims.useMutation();
  const authority = trpc.land.declareAuthority.useMutation();
  const requestUpload = trpc.land.requestPrivateEvidenceUpload.useMutation();
  const registerEvidence = trpc.land.addPrivateEvidence.useMutation();
  const submit = trpc.land.submit.useMutation();
  const workspace = trpc.land.getWorkspace.useQuery({ listingId: listingId ?? 0 }, { enabled: Boolean(listingId) });
  const provincesQuery = trpc.location.getLocationHierarchy.useQuery({ depth: 'province' });
  const citiesQuery = trpc.location.getLocationHierarchy.useQuery(
    { depth: 'city', provinceId: Number(form.provinceId) || undefined },
    { enabled: Boolean(form.provinceId) },
  );

  const createDraft = async () => {
    try {
      const result = await create.mutateAsync({ classification: form.classification, title: form.title, description: form.description, askingPrice: Number(form.askingPrice), city: form.city, province: form.province, intendedUse: form.intendedUse || undefined, parcel: { kind: form.parcelKind, identifier: form.parcelReference, identifierHash: await sha256(form.parcelReference), extentM2: Number(form.extentM2), provinceId: Number(form.provinceId), cityId: Number(form.cityId), geometryConfidence: 'approximate' } });
      setListingId(result.listingId); toast.success('Land draft saved. Continue with facts and authority.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save Land draft.'); }
  };
  const uploadEvidence = async () => {
    if (!listingId || !file) return;
    try {
      const target = await requestUpload.mutateAsync({ listingId, fileName: file.name, contentType: file.type });
      const response = await fetch(target.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!response.ok) throw new Error('Private document upload failed.');
      await registerEvidence.mutateAsync({ listingId, evidenceType, uploadToken: target.uploadToken });
      workspace.refetch(); setFile(null); toast.success('Private evidence attached. It is visible only to permitted custodians and reviewers.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to upload private evidence.'); }
  };
  const addFact = async () => {
    if (!listingId || !fact.value.trim()) return;
    await addClaims.mutateAsync({ listingId, claims: [{ code: fact.code, valueState: 'asserted', value: fact.value }] }); workspace.refetch(); setFact(current => ({ ...current, value: '' }));
  };
  const requestSubmission = async () => { if (!listingId) return; try { await submit.mutateAsync({ listingId }); workspace.refetch(); toast.success('Submitted to the Land review team.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Submission is not ready.'); } };
  const readiness = workspace.data?.readiness;
  const changes = workspace.data?.reviewEvents?.filter((event: any) => event.eventType === 'changes_requested') ?? [];

  return <AgentAppShell><main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
    <div><p className="text-sm font-medium text-emerald-700">Plots & Land · private workspace</p><h1 className="text-3xl font-semibold text-slate-950">Create a Land listing</h1><p className="mt-1 text-slate-600">Land facts are seller declarations until independently checked. Private documents are never marketing media.</p></div>
    {!listingId ? <Card><CardHeader><CardTitle>What are you listing?</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div><Label>Land type</Label><Select value={form.classification} onValueChange={classification => setForm({ ...form, classification: classification as LandClassification })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label>Asking price</Label><Input type="number" value={form.askingPrice} onChange={e => setForm({ ...form, askingPrice: e.target.value })} /></div><div className="md:col-span-2"><Label>Listing title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Serviced stand in…" /></div><div className="md:col-span-2"><Label>Describe the opportunity</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div><div><Label>Province</Label><Select value={form.provinceId} onValueChange={provinceId => { const province = (provincesQuery.data || []).find((item: any) => item.id === Number(provinceId)); setForm({ ...form, provinceId, province: province?.name || '', cityId: '', city: '' }); }}><SelectTrigger><SelectValue placeholder="Choose province" /></SelectTrigger><SelectContent>{(provincesQuery.data || []).map((item: any) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>City</Label><Select value={form.cityId} onValueChange={cityId => { const city = (citiesQuery.data || []).find((item: any) => item.id === Number(cityId)); setForm({ ...form, cityId, city: city?.name || '' }); }} disabled={!form.provinceId}><SelectTrigger><SelectValue placeholder="Choose city" /></SelectTrigger><SelectContent>{(citiesQuery.data || []).map((item: any) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Parcel reference</Label><Input value={form.parcelReference} onChange={e => setForm({ ...form, parcelReference: e.target.value })} placeholder="Erf 123" /></div><div><Label>Site extent (m²)</Label><Input type="number" value={form.extentM2} onChange={e => setForm({ ...form, extentM2: e.target.value })} /></div><div className="md:col-span-2"><Label>Intended use</Label><Input value={form.intendedUse} onChange={e => setForm({ ...form, intendedUse: e.target.value })} placeholder="Residential development" /></div><div className="md:col-span-2"><Button onClick={createDraft} disabled={create.isPending || !form.provinceId || !form.cityId}>Save Land draft</Button></div></CardContent></Card> : <>
      <Card><CardHeader><CardTitle>Readiness</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-600">{readiness?.submissionReady ? 'Ready to submit for Land review.' : 'Complete the items below before submission.'}</p><ul className="mt-3 list-disc pl-5 text-sm text-slate-700">{[...(readiness?.blockers?.draft ?? []), ...(readiness?.blockers?.submission ?? [])].map((item: string) => <li key={item}>{item.replace(/_/g, ' ')}</li>)}</ul></CardContent></Card>
      {changes.length > 0 && <Card className="border-amber-300"><CardHeader><CardTitle>Changes requested</CardTitle></CardHeader><CardContent>{changes.map((event: any) => <p key={event.id} className="text-sm text-slate-700">{event.comment}</p>)}</CardContent></Card>}
      <Card><CardHeader><CardTitle>What do you know about the land?</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3"><Select value={fact.code} onValueChange={code => setFact({ ...fact, code })}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent>{['access','road_frontage','water','electricity','sanitation','zoning_land_use','restrictions_servitudes','development_context'].map(code => <SelectItem key={code} value={code}>{code.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select><Input className="max-w-md" value={fact.value} onChange={e => setFact({ ...fact, value: e.target.value })} placeholder="Seller-declared detail" /><Button variant="outline" onClick={addFact}>Save fact</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Authority to market</CardTitle></CardHeader><CardContent className="flex gap-3"><Button onClick={() => authority.mutateAsync({ listingId, actorType: 'agent', authorityType: 'sole_mandate' }).then(() => workspace.refetch())}>Declare agent mandate</Button><p className="self-center text-sm text-slate-600">Attach the mandate below before submitting.</p></CardContent></Card>
      <Card><CardHeader><CardTitle>Private supporting evidence</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-slate-600">PDF, JPEG, PNG or WebP. Documents stay private to permitted custodians and Land reviewers.</p><div className="flex flex-wrap gap-3"><Select value={evidenceType} onValueChange={value => setEvidenceType(value as any)}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mandate">Authority / mandate</SelectItem><SelectItem value="title_registry">Title or parcel document</SelectItem><SelectItem value="parcel_survey">Parcel / survey document</SelectItem><SelectItem value="planning">Planning / zoning evidence</SelectItem><SelectItem value="other">Other supporting document</SelectItem></SelectContent></Select><Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} /><Button onClick={uploadEvidence} disabled={!file}>Upload privately</Button></div></CardContent></Card>
      <div className="flex gap-3"><Button onClick={requestSubmission}>Submit for Land review</Button><Button variant="outline" onClick={() => setLocation('/agent/listings')}>Back to listings</Button></div>
    </>}
  </main></AgentAppShell>;
}
