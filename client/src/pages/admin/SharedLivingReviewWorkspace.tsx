import { useState } from 'react';
import { ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { trpc } from '@/lib/trpc';

type ReviewTarget = { placeId: number; subjectType: 'residence' | 'space'; spaceId?: number };

function ErrorMessage({ children }: { children: string }) {
  return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{children}</p>;
}

export default function SharedLivingReviewWorkspace() {
  const utils = trpc.useUtils();
  const queue = trpc.sharedLiving.moderationQueue.useQuery();
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [reason, setReason] = useState('');
  const [evidenceError, setEvidenceError] = useState('');
  const details = trpc.sharedLiving.moderationDetail.useQuery(target || { placeId: 0, subjectType: 'residence' }, { enabled: Boolean(target) });
  const approveAuthority = trpc.sharedLiving.reviewAuthority.useMutation({ onSuccess: async () => { await utils.sharedLiving.moderationQueue.invalidate(); } });
  const approveListing = trpc.sharedLiving.moderateApprove.useMutation({ onSuccess: async () => { setTarget(null); setReason(''); await utils.sharedLiving.moderationQueue.invalidate(); } });
  const rejectListing = trpc.sharedLiving.moderateReject.useMutation({ onSuccess: async () => { setTarget(null); setReason(''); await utils.sharedLiving.moderationQueue.invalidate(); } });
  async function openEvidence(evidenceId: number) {
    try {
      const result = await utils.sharedLiving.authorityEvidenceUrl.fetch({ evidenceId });
      window.open(result.url, '_blank', 'noopener,noreferrer');
      setEvidenceError('');
    } catch (error) {
      setEvidenceError(error instanceof Error ? error.message : 'Evidence could not be opened.');
    }
  }

  const queueCount = (queue.data?.authorities.length || 0) + (queue.data?.listings.length || 0);
  return <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="rounded-3xl bg-gradient-to-r from-slate-950 to-emerald-950 p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-300">Operations · Shared Living</p><h1 className="mt-2 text-3xl font-bold">Listing review</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">Review residence authority separately from residence and accommodation-space content. Only approved subjects under an active mandate can appear publicly.</p><p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm"><ShieldCheck className="h-4 w-4" />{queueCount} item(s) awaiting review</p></header>
      {queue.error && <ErrorMessage>{queue.error.message}</ErrorMessage>}
      <div className="grid gap-7 lg:grid-cols-2">
        <section className="space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Advertising authority</h2><p className="text-sm text-slate-600">Verify the signed or equivalent mandate before allowing listing activity.</p></div><button type="button" aria-label="Refresh review queue" onClick={() => void queue.refetch()} className="rounded-lg border bg-white p-2"><RefreshCw className="h-4 w-4" /></button></div>
          {(queue.data?.authorities || []).map(authority => <article key={authority.authorityId} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{authority.residenceName}</h3><p className="mt-1 text-sm text-slate-600">Agent account #{authority.agentUserId} · residence #{authority.placeId}</p><p className="mt-1 text-sm text-slate-600">Grantor: {authority.grantor} ({authority.grantorRole})</p><p className="text-xs text-slate-500">{authority.effectiveAt} through {authority.expiresAt}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Pending</span></div>
            <div className="mt-4 space-y-2"><h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Evidence for independent review</h4>{authority.evidence.map(file => <button key={file.id} type="button" onClick={() => void openEvidence(file.id)} className="flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm hover:bg-slate-50"><span>{file.fileName} · {(file.byteSize / 1024 / 1024).toFixed(1)} MB</span><ExternalLink className="h-4 w-4" /></button>)}{!authority.evidence.length && <p className="text-sm text-red-700">No evidence attached; cannot approve.</p>}{evidenceError && <ErrorMessage>{evidenceError}</ErrorMessage>}</div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!authority.evidence.length || approveAuthority.isPending} onClick={() => approveAuthority.mutate({ authorityId: authority.authorityId, decision: 'approve' })} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve mandate</button><button type="button" disabled={approveAuthority.isPending} onClick={() => approveAuthority.mutate({ authorityId: authority.authorityId, decision: 'reject', reason: 'Evidence does not establish current residence-specific authority.' })} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-800">Reject mandate</button></div>{approveAuthority.error && <ErrorMessage>{approveAuthority.error.message}</ErrorMessage>}
          </article>)}
          {!queue.isLoading && !(queue.data?.authorities.length) && <p className="rounded-2xl border border-dashed bg-white p-6 text-sm text-slate-600">No authority requests awaiting review.</p>}
        </section>

        <section className="space-y-4"><div><h2 className="text-xl font-bold">Residence and space publication</h2><p className="text-sm text-slate-600">Review each parent residence and rentable space independently.</p></div>
          {(queue.data?.listings || []).map(row => <article key={`${row.subjectType}:${row.placeId}:${row.spaceId || ''}:${row.queueId}`} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{row.subjectType === 'space' ? row.spaceLabel : row.residenceName}</h3><p className="mt-1 text-sm text-slate-600">{row.subjectType === 'space' ? `Accommodation space · ${row.residenceName}` : 'Residence'} · {row.placeSlug}</p><p className="text-xs text-slate-500">Residence #{row.placeId}{row.spaceId ? ` · Space #${row.spaceId}` : ''}</p></div><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-900">Pending review</span></div><button type="button" onClick={() => { setTarget({ placeId: row.placeId, subjectType: row.subjectType, ...(row.spaceId ? { spaceId: row.spaceId } : {}) }); setReason(''); }} className="mt-4 rounded-lg border px-3 py-2 text-sm font-semibold">Review details</button></article>)}
          {!queue.isLoading && !(queue.data?.listings.length) && <p className="rounded-2xl border border-dashed bg-white p-6 text-sm text-slate-600">No residences or spaces awaiting publication review.</p>}
        </section>
      </div>

      {target && <section aria-label="Review details" className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-lg md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Review {target.subjectType}</p><h2 className="mt-1 text-2xl font-bold">{details.data?.space ? String(details.data.space.label) : details.data?.residence.residenceName}</h2></div><button type="button" onClick={() => setTarget(null)} className="rounded-lg border px-3 py-2 text-sm">Close</button></div>
        {details.isLoading && <p className="mt-4 text-sm text-slate-600">Loading submission details…</p>}{details.error && <ErrorMessage>{details.error.message}</ErrorMessage>}
        {details.data && <div className="mt-5 grid gap-5 md:grid-cols-2"><div className="space-y-2 rounded-2xl bg-slate-50 p-4"><h3 className="font-bold">Residence authority and location</h3><p className="text-sm"><strong>Public area:</strong> {details.data.residence.publicLocation || 'Unavailable'}</p><p className="text-sm"><strong>Private address:</strong> {details.data.residence.addressLinePrivate}</p><p className="text-sm"><strong>Responsible party:</strong> {details.data.residence.responsibleParty?.grantor || 'No current approved mandate'}</p><p className="text-sm"><strong>Party role:</strong> {details.data.residence.responsibleParty?.grantorRole || '—'}</p><p className="text-sm"><strong>Residence:</strong> {details.data.residence.residenceName} · {details.data.residence.placeKind}</p><p className="whitespace-pre-line text-sm">{details.data.residence.description || 'No residence description supplied.'}</p><div className="flex flex-wrap gap-2">{details.data.residence.media.map(image => image.url && <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline">{image.caption || 'Residence photo'} · {image.reviewStatus}</a>)}</div></div>
          {details.data.space ? <div className="space-y-2 rounded-2xl bg-slate-50 p-4"><h3 className="font-bold">Accommodation space</h3><p className="text-sm"><strong>Type:</strong> {String(details.data.space.accommodationType).replace(/_/g, ' ')}</p><p className="text-sm"><strong>Availability:</strong> {String(details.data.space.availabilityStatus)} · {details.data.space.occupancyCount ?? 'Occupancy not supplied'} places</p><p className="text-sm"><strong>Rent:</strong> {details.data.space.availability && !details.data.space.availability.rentUnknown ? `R ${Number(details.data.space.availability.rentAmountMinor) / 100} / month · ${String(details.data.space.availability.rentBasis).replace('_', ' ')}` : 'To be confirmed'}</p><p className="whitespace-pre-line text-sm">{String(details.data.space.description || 'No description supplied.')}</p><p className="text-sm"><strong>Utilities:</strong> {JSON.stringify(details.data.space.availability?.bills || {})}</p><div className="flex flex-wrap gap-2">{(details.data.space.media as Array<{id:number;url?:string|null;caption?:string|null;reviewStatus:string}>).map(image => image.url && <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline">{image.caption || 'Space photo'} · {image.reviewStatus}</a>)}</div></div> : <div className="rounded-2xl bg-slate-50 p-4"><h3 className="font-bold">Shared facilities</h3><p className="text-sm">{details.data.residence.facilities.join(', ') || 'No shared facilities supplied.'}</p></div>}</div>}
        <label className="mt-5 block text-sm font-medium">Review note <span className="font-normal text-slate-500">(required when rejecting)</span><textarea value={reason} onChange={event => setReason(event.target.value)} rows={2} maxLength={500} className="mt-1 w-full rounded-xl border p-3" /></label>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={!details.data || approveListing.isPending || rejectListing.isPending} onClick={() => approveListing.mutate(target)} className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">Approve {target.subjectType}</button><button type="button" disabled={!details.data || reason.trim().length < 3 || rejectListing.isPending || approveListing.isPending} onClick={() => rejectListing.mutate({ ...target, reason })} className="rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-800 disabled:opacity-50">Reject with note</button></div>{approveListing.error && <ErrorMessage>{approveListing.error.message}</ErrorMessage>}{rejectListing.error && <ErrorMessage>{rejectListing.error.message}</ErrorMessage>}
      </section>}
    </div>
  </main>;
}
