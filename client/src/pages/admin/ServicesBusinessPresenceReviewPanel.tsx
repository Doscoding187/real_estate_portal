import { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

export default function ServicesBusinessPresenceReviewPanel() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<'projects' | 'credentials'>('projects');
  const projects = trpc.servicesEngine.listProviderProjectReviewQueue.useQuery();
  const credentials = trpc.servicesEngine.listProviderCredentialReviewQueue.useQuery();
  const reviewProject = trpc.servicesEngine.reviewProviderProject.useMutation({
    onSuccess: () => void utils.servicesEngine.listProviderProjectReviewQueue.invalidate(),
    onError: error => toast.error(error.message),
  });
  const reviewCredential = trpc.servicesEngine.reviewProviderCredential.useMutation({
    onSuccess: () => void utils.servicesEngine.listProviderCredentialReviewQueue.invalidate(),
    onError: error => toast.error(error.message),
  });

  async function openCredential(credentialId: number) {
    try {
      const result = await utils.servicesEngine.accessProviderCredential.fetch({ credentialId });
      window.open(result.deliveryUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Credential document is unavailable.');
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Website content and credentials</h2>
        <p className="mt-1 text-sm text-slate-600">
          Portfolio projects and submitted credential documents stay private until the relevant reviewer approves them.
        </p>
      </div>
      <div className="flex gap-2 border-b pb-3">
        <button
          type="button"
          aria-pressed={tab === 'projects'}
          onClick={() => setTab('projects')}
          className={tab === 'projects' ? 'rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white' : 'rounded border px-3 py-1.5 text-sm'}
        >
          Projects ({projects.data?.length || 0})
        </button>
        <button
          type="button"
          aria-pressed={tab === 'credentials'}
          onClick={() => setTab('credentials')}
          className={tab === 'credentials' ? 'rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white' : 'rounded border px-3 py-1.5 text-sm'}
        >
          Credentials ({credentials.data?.length || 0})
        </button>
      </div>

      {tab === 'projects' && (
        <div className="space-y-3">
          {projects.isLoading && <p className="rounded border bg-white p-4 text-sm">Loading projects…</p>}
          {projects.error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">{projects.error.message}</p>}
          {!projects.isLoading && !projects.error && (projects.data?.length || 0) === 0 && (
            <p className="rounded border bg-white p-4 text-sm text-slate-600">No portfolio projects are awaiting review.</p>
          )}
          {projects.data?.map(project => (
            <article key={project.id} className="grid gap-4 rounded border bg-white p-4 sm:grid-cols-[180px_1fr]">
              {project.coverImageUrl ? (
                <img src={project.coverImageUrl} alt="" className="aspect-[4/3] w-full rounded object-cover" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded bg-slate-100 text-xs text-slate-500">No project image</div>
              )}
              <div>
                <p className="text-xs text-slate-500">{project.companyName} · {project.category.replace(/_/g, ' ')}</p>
                <h3 className="mt-1 font-semibold">{project.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{project.description || 'No description supplied.'}</p>
                <div className="mt-4 flex gap-2">
                  <button type="button" disabled={reviewProject.isPending} onClick={() => reviewProject.mutate({ projectId: project.id, decision: 'publish' })} className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve project</button>
                  <button type="button" disabled={reviewProject.isPending} onClick={() => reviewProject.mutate({ projectId: project.id, decision: 'reject' })} className="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50">Reject</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'credentials' && (
        <div className="space-y-3">
          {credentials.isLoading && <p className="rounded border bg-white p-4 text-sm">Loading credentials…</p>}
          {credentials.error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">{credentials.error.message}</p>}
          {!credentials.isLoading && !credentials.error && (credentials.data?.length || 0) === 0 && (
            <p className="rounded border bg-white p-4 text-sm text-slate-600">No provider credentials are awaiting review.</p>
          )}
          {credentials.data?.map(credential => (
            <article key={credential.id} className="flex flex-wrap items-center justify-between gap-3 rounded border bg-white p-4">
              <div>
                <p className="text-xs text-slate-500">{credential.companyName} · {credential.credentialType.replace(/_/g, ' ')}</p>
                <h3 className="mt-1 font-semibold">{credential.title}</h3>
                <p className="text-sm text-slate-600">{credential.issuingBody || 'Issuing body not supplied'} · {credential.originalFileName}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void openCredential(credential.id)} className="rounded border px-3 py-2 text-sm font-semibold">Open privately</button>
                <button type="button" disabled={reviewCredential.isPending} onClick={() => reviewCredential.mutate({ credentialId: credential.id, decision: 'verified' })} className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Verify</button>
                <button type="button" disabled={reviewCredential.isPending} onClick={() => reviewCredential.mutate({ credentialId: credential.id, decision: 'rejected' })} className="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50">Reject</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
