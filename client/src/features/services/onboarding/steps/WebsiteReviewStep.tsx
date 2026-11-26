import { useState } from 'react';
import { CheckCircle2, FileCheck2, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/features/services/catalog';
import { trpc } from '@/lib/trpc';
import { primaryServiceCategoryFromState } from '../useOnboardingReducer';
import type { OnboardingState } from '../useOnboardingReducer';

type WebsiteReviewStepProps = {
  state: OnboardingState;
  onBack: () => void;
};

export function WebsiteReviewStep({ state, onBack }: WebsiteReviewStepProps) {
  const utils = trpc.useUtils();
  const profile = trpc.servicesEngine.myProviderProfile.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const status = trpc.servicesEngine.myOnboardingStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const [error, setError] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectCategory, setProjectCategory] = useState<ServiceCategory>(
    primaryServiceCategoryFromState(state) || 'home_improvement',
  );
  const [projectImageUrl, setProjectImageUrl] = useState('');
  const [credentialTitle, setCredentialTitle] = useState('');
  const [credentialType, setCredentialType] = useState('registration');
  const [issuingBody, setIssuingBody] = useState('');
  const [uploading, setUploading] = useState(false);

  const saveProject = trpc.servicesEngine.saveProviderProject.useMutation({
    onSuccess: async () => {
      setProjectTitle('');
      setProjectDescription('');
      setProjectImageUrl('');
      await utils.servicesEngine.myProviderProfile.invalidate();
    },
    onError: mutationError => setError(mutationError.message || 'The project could not be saved.'),
  });
  const deleteProject = trpc.servicesEngine.deleteProviderProject.useMutation({
    onSuccess: async () => {
      await utils.servicesEngine.myProviderProfile.invalidate();
    },
    onError: mutationError => setError(mutationError.message || 'The project could not be removed.'),
  });
  const requestCredential = trpc.servicesEngine.requestProviderCredentialUpload.useMutation();
  const addCredential = trpc.servicesEngine.addProviderCredential.useMutation({
    onSuccess: async () => {
      setCredentialTitle('');
      setIssuingBody('');
      await utils.servicesEngine.myProviderProfile.invalidate();
    },
    onError: mutationError => setError(mutationError.message || 'The credential could not be submitted.'),
  });
  const presignProjectImage = trpc.upload.presign.useMutation();
  const submit = trpc.servicesEngine.submitProviderWebsite.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.servicesEngine.myProviderProfile.invalidate(),
        utils.servicesEngine.myOnboardingStatus.invalidate(),
      ]);
    },
    onError: mutationError => setError(mutationError.message || 'Your website could not be submitted.'),
  });

  const readiness = status.data?.readiness;
  const currentProjects = profile.data?.projects || [];
  const currentCredentials = profile.data?.credentials || [];
  const busy =
    saveProject.isPending ||
    deleteProject.isPending ||
    addCredential.isPending ||
    submit.isPending ||
    uploading;

  async function uploadProjectImage(file?: File) {
    setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setError('Project photos must be JPG, PNG, WebP or AVIF images.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Project photos must be 10 MB or smaller.');
      return;
    }
    setUploading(true);
    try {
      const reservation = await presignProjectImage.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });
      const response = await fetch(new URL(reservation.url, window.location.origin), {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error('The project photo upload did not complete.');
      setProjectImageUrl(reservation.publicUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The project photo could not be uploaded.');
    } finally {
      setUploading(false);
    }
  }

  async function uploadCredential(file?: File) {
    setError('');
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Credentials must be PDF, JPG, PNG or WebP files.');
      return;
    }
    if (file.size < 1 || file.size > 25 * 1024 * 1024) {
      setError('Choose a credential file up to 25 MB.');
      return;
    }
    if (!credentialTitle.trim()) {
      setError('Add a credential title before selecting the document.');
      return;
    }
    setUploading(true);
    try {
      const reservation = await requestCredential.mutateAsync({
        fileName: file.name,
        contentType: file.type,
      });
      const response = await fetch(new URL(reservation.uploadUrl, window.location.origin), {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error('The private credential upload did not complete.');
      await addCredential.mutateAsync({
        uploadToken: reservation.uploadToken,
        credentialType,
        title: credentialTitle.trim(),
        issuingBody: issuingBody.trim() || undefined,
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The credential could not be uploaded.');
    } finally {
      setUploading(false);
    }
  }

  function handleSaveProject() {
    setError('');
    if (projectTitle.trim().length < 3) {
      setError('Project titles must be at least 3 characters.');
      return;
    }
    saveProject.mutate({
      title: projectTitle.trim(),
      description: projectDescription.trim() || undefined,
      category: projectCategory,
      coverImageUrl: projectImageUrl || undefined,
    });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Your business website</p>
        <h2 className="text-2xl font-semibold text-slate-950">Preview it, then send it for review</h2>
        <p className="text-sm leading-6 text-slate-600">
          The same website design is used for this private preview and your public site after approval. Projects and credentials can strengthen it, but they are optional for initial review.
        </p>
      </header>

      {profile.data?.submissionStatus === 'changes_requested' && profile.data.reviewNote && (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">The reviewer requested a change</p>
          <p className="mt-1 whitespace-pre-line">{profile.data.reviewNote}</p>
        </div>
      )}
      {profile.data?.submissionStatus === 'rejected' && (
        <div role="status" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">This application was declined</p>
          <p className="mt-1">{profile.data.reviewNote || 'Contact Services support if you need help.'}</p>
        </div>
      )}

      <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Initial website design</p>
        <h3 className="mt-1 text-base font-semibold text-slate-950">Professional Business</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          One responsive Property Listify design, populated from your business profile, services and coverage.
        </p>
      </section>

      <details className="rounded-2xl border bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">Add projects to your website <span className="font-normal text-slate-500">(optional)</span></summary>
        <div className="mt-4 space-y-4">
          <p className="text-xs leading-5 text-slate-600">Project details and photos stay out of the public website until a reviewer approves them.</p>
          {currentProjects.map(project => (
            <article key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{project.title}</p>
                <p className="text-xs text-slate-500">{project.moderationStatus.replace(/_/g, ' ')}</p>
              </div>
              {project.moderationStatus !== 'published' && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => deleteProject.mutate({ projectId: project.id })}><Trash2 className="mr-1 h-3.5 w-3.5" />Remove</Button>}
            </article>
          ))}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="projectTitle">Project name</Label><Input id="projectTitle" value={projectTitle} maxLength={180} onChange={event => setProjectTitle(event.target.value)} placeholder="e.g. North-facing bathroom renovation" disabled={busy} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="projectDescription">What did you do?</Label><Textarea id="projectDescription" value={projectDescription} maxLength={4000} onChange={event => setProjectDescription(event.target.value)} rows={3} disabled={busy} /></div>
            <div className="space-y-1.5"><Label htmlFor="projectCategory">Service category</Label><select id="projectCategory" value={projectCategory} onChange={event => setProjectCategory(event.target.value as ServiceCategory)} className="w-full rounded-md border bg-white px-3 py-2 text-sm" disabled={busy}>{SERVICE_CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="projectImage">Project photo</Label><Input id="projectImage" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={event => void uploadProjectImage(event.target.files?.[0])} />{projectImageUrl && <img src={projectImageUrl} alt="Selected project" className="mt-2 h-20 w-full rounded object-cover" />}</div>
          </div>
          <Button type="button" variant="outline" disabled={busy || profile.data?.submissionStatus === 'rejected' || projectTitle.trim().length < 3} onClick={handleSaveProject}>{saveProject.isPending ? 'Saving project…' : 'Save project for review'}</Button>
        </div>
      </details>

      <details className="rounded-2xl border bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">Submit credentials for review <span className="font-normal text-slate-500">(optional where relevant)</span></summary>
        <div className="mt-4 space-y-4">
          <p className="text-xs leading-5 text-slate-600">Documents are stored privately and only authorized reviewers can open them. Uploading a document does not verify a credential or show a verification badge.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="credentialTitle">Credential title</Label><Input id="credentialTitle" value={credentialTitle} onChange={event => setCredentialTitle(event.target.value)} placeholder="e.g. Electrical contractor registration" disabled={busy} /></div>
            <div className="space-y-1.5"><Label htmlFor="credentialType">Credential type</Label><select id="credentialType" value={credentialType} onChange={event => setCredentialType(event.target.value)} className="w-full rounded-md border bg-white px-3 py-2 text-sm" disabled={busy}><option value="registration">Professional registration</option><option value="qualification">Qualification</option><option value="licence">Licence</option><option value="insurance">Insurance</option><option value="accreditation">Accreditation</option><option value="other">Other</option></select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="issuingBody">Issuing organization</Label><Input id="issuingBody" value={issuingBody} onChange={event => setIssuingBody(event.target.value)} disabled={busy} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="credentialFile">Document</Label><Input id="credentialFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy || !credentialTitle.trim()} onChange={event => void uploadCredential(event.target.files?.[0])} /></div>
          </div>
          {currentCredentials.map(credential => <p key={credential.id} className="flex items-center gap-2 text-xs text-slate-600"><FileCheck2 className="h-4 w-4 text-emerald-700" />{credential.title}: {credential.status}</p>)}
        </div>
      </details>

      <section aria-labelledby="readiness-heading" className="rounded-2xl border bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div><h3 id="readiness-heading" className="font-semibold text-slate-900">Publication readiness</h3><p className="mt-1 text-sm text-slate-600">Complete persisted essentials to submit. Enrichment above stays optional.</p></div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${readiness?.readyForSubmission ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{readiness?.completionPercent ?? 0}%</span>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {(readiness?.items || []).map(item => <li key={item.id} className="flex items-start gap-2 text-sm"><CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${item.complete ? 'text-emerald-700' : 'text-slate-300'}`} /><span className={item.complete ? 'text-slate-800' : 'text-slate-500'}>{item.label}</span></li>)}
        </ul>
        {!readiness?.readyForSubmission && <p className="mt-3 text-sm text-amber-900">Still needed: {readiness?.blockers.join('; ') || 'Save your profile details to calculate readiness.'}</p>}
      </section>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {submit.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{submit.error.message}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack} disabled={busy}>Back</Button>
        <Button onClick={() => submit.mutate()} disabled={busy || profile.data?.submissionStatus === 'rejected' || !readiness?.readyForSubmission || profile.isLoading || Boolean(profile.error)}>
          {submit.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : 'Submit website for review'}
        </Button>
      </div>
      <p className="text-center text-xs leading-5 text-slate-500">Your website stays private until an authorized reviewer approves publication. Submitting does not start a subscription or charge a fee.</p>
    </div>
  );
}
