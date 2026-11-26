import { useEffect, useState } from 'react';
import { ArrowUpRight, FileCheck2, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/features/services/catalog';
import { toProviderSlug } from '../../../../../shared/serviceDirectorySlugs';
import { trpc } from '@/lib/trpc';
import { ProviderBusinessSitePreview } from './ProviderBusinessSitePreview';

export function ProviderBusinessPresenceWorkspace() {
  const utils = trpc.useUtils();
  const profile = trpc.servicesEngine.myProviderProfile.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const [projectId, setProjectId] = useState<number | undefined>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('home_improvement');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [credentialTitle, setCredentialTitle] = useState('');
  const [credentialType, setCredentialType] = useState('registration');
  const [issuingBody, setIssuingBody] = useState('');
  const [brandImageUrl, setBrandImageUrl] = useState('');
  const [businessYears, setBusinessYears] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [socialLinks, setSocialLinks] = useState({ facebook: '', instagram: '', linkedin: '' });
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const saveProfile = trpc.servicesEngine.upsertProviderProfile.useMutation({
    onSuccess: async () => {
      setMessage('Business website details saved.');
      await utils.servicesEngine.myProviderProfile.invalidate();
    },
    onError: error => setMessage(error.message),
  });
  const saveProject = trpc.servicesEngine.saveProviderProject.useMutation({
    onSuccess: async () => {
      setProjectId(undefined);
      setTitle('');
      setDescription('');
      setCoverImageUrl('');
      setMessage('Project saved and sent for content review.');
      await utils.servicesEngine.myProviderProfile.invalidate();
    },
    onError: error => setMessage(error.message),
  });
  const deleteProject = trpc.servicesEngine.deleteProviderProject.useMutation({
    onSuccess: async () => {
      setMessage('Project removed.');
      await utils.servicesEngine.myProviderProfile.invalidate();
    },
    onError: error => setMessage(error.message),
  });
  const presignImage = trpc.upload.presign.useMutation();
  const requestCredential = trpc.servicesEngine.requestProviderCredentialUpload.useMutation();
  const saveCredential = trpc.servicesEngine.addProviderCredential.useMutation({
    onSuccess: async () => {
      setCredentialTitle('');
      setIssuingBody('');
      setMessage('Credential uploaded privately for review.');
      await utils.servicesEngine.myProviderProfile.invalidate();
    },
    onError: error => setMessage(error.message),
  });

  const data = profile.data;
  const busy = saveProfile.isPending || saveProject.isPending || deleteProject.isPending || saveCredential.isPending || uploading;

  useEffect(() => {
    if (!data) return;
    setBrandImageUrl(data.logoUrl || '');
    setBusinessYears(data.businessYearsInOperation == null ? '' : String(data.businessYearsInOperation));
    setOperatingHours(data.operatingHours || '');
    setSocialLinks({
      facebook: data.socialLinks?.facebook || '',
      instagram: data.socialLinks?.instagram || '',
      linkedin: data.socialLinks?.linkedin || '',
    });
  }, [data]);

  async function uploadProjectImage(file?: File) {
    setMessage('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage('Use a JPG, PNG, WebP or AVIF image up to 10 MB.');
      return;
    }
    setUploading(true);
    try {
      const reservation = await presignImage.mutateAsync({ filename: file.name, contentType: file.type });
      const result = await fetch(new URL(reservation.url, window.location.origin), {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!result.ok) throw new Error('The project image upload did not complete.');
      setCoverImageUrl(reservation.publicUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The project image could not be uploaded.');
    } finally {
      setUploading(false);
    }
  }

  async function uploadBrandImage(file?: File) {
    setMessage('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage('Use a JPG, PNG, WebP or AVIF image up to 10 MB.');
      return;
    }
    setUploading(true);
    try {
      const reservation = await presignImage.mutateAsync({ filename: file.name, contentType: file.type });
      const result = await fetch(new URL(reservation.url, window.location.origin), {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!result.ok) throw new Error('The business image upload did not complete.');
      setBrandImageUrl(reservation.publicUrl);
      saveProfile.mutate({ logoUrl: reservation.publicUrl });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The business image could not be uploaded.');
    } finally {
      setUploading(false);
    }
  }

  async function uploadCredential(file?: File) {
    setMessage('');
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 25 * 1024 * 1024) {
      setMessage('Use a PDF, JPG, PNG or WebP file up to 25 MB.');
      return;
    }
    if (!credentialTitle.trim()) {
      setMessage('Enter a credential title before choosing the file.');
      return;
    }
    setUploading(true);
    try {
      const reservation = await requestCredential.mutateAsync({ fileName: file.name, contentType: file.type, byteSize: file.size });
      const result = await fetch(new URL(reservation.uploadUrl, window.location.origin), {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!result.ok) throw new Error('The private credential upload did not complete.');
      await saveCredential.mutateAsync({
        uploadToken: reservation.uploadToken,
        credentialType,
        title: credentialTitle.trim(),
        issuingBody: issuingBody.trim() || undefined,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The credential could not be uploaded.');
    } finally {
      setUploading(false);
    }
  }

  if (profile.isLoading) return <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">Loading your business website…</div>;
  if (profile.error || !data) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Your business website could not be loaded. Refresh before editing.</div>;

  const publicPath = `/services/provider/${encodeURIComponent(toProviderSlug(data.companyName, data.providerId))}`;

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Your business presence</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Manage your Property Listify website</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your profile remains the source for your hosted business site, services and coverage. Add approved work and reviewed credentials as your business grows.</p>
        </div>
        {data.isPublished && <Link href={publicPath} target="_blank" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">View public website <ArrowUpRight className="h-4 w-4" /></Link>}
      </header>

      <div className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Current website design</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">Professional Business</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">Your profile, services and coverage populate one responsive Property Listify template.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void utils.servicesEngine.myProviderProfile.refetch()} disabled={busy}>Refresh preview</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="space-y-1.5">
          <Label htmlFor="workspace-business-image">Business logo or brand image</Label>
          <Input id="workspace-business-image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={event => void uploadBrandImage(event.target.files?.[0])} />
          <span className="block text-xs text-slate-500">Use a brand image only. Do not upload identity or credential documents here.</span>
        </label>
        {brandImageUrl && <img src={brandImageUrl} alt="Current business brand" className="h-16 w-16 rounded-lg border object-cover" />}
      </div>
      <ProviderBusinessSitePreview profile={data} selectedTemplate={data.websiteTemplate} />

      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">Business details and social links</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5"><Label htmlFor="workspace-years">Years in operation</Label><Input id="workspace-years" type="number" min={0} max={150} value={businessYears} onChange={event => setBusinessYears(event.target.value)} disabled={busy} /></label>
          <label className="space-y-1.5"><Label htmlFor="workspace-hours">Operating hours</Label><Input id="workspace-hours" maxLength={500} value={operatingHours} onChange={event => setOperatingHours(event.target.value)} disabled={busy} /></label>
          {(['facebook', 'instagram', 'linkedin'] as const).map(network => <label key={network} className="space-y-1.5"><Label htmlFor={`workspace-social-${network}`}>{network[0]?.toUpperCase()}{network.slice(1)} URL</Label><Input id={`workspace-social-${network}`} type="url" value={socialLinks[network]} onChange={event => setSocialLinks(current => ({ ...current, [network]: event.target.value }))} disabled={busy} /></label>)}
          <div className="sm:col-span-2"><Button type="button" disabled={busy || (businessYears.trim() !== '' && (!Number.isInteger(Number(businessYears)) || Number(businessYears) < 0 || Number(businessYears) > 150))} onClick={() => saveProfile.mutate({ businessYearsInOperation: businessYears.trim() ? Number(businessYears) : null, operatingHours: operatingHours.trim() || null, socialLinks: { facebook: socialLinks.facebook.trim() || null, instagram: socialLinks.instagram.trim() || null, linkedin: socialLinks.linkedin.trim() || null } })}>{saveProfile.isPending ? 'Saving…' : 'Save website details'}</Button></div>
        </div>
      </details>

      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">Projects and portfolio</summary>
        <div className="mt-4 space-y-4">
          <p className="text-xs leading-5 text-slate-600">New or edited project content is reviewed before it appears on your public website.</p>
          {(data.projects || []).map(project => (
            <article key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div><p className="text-sm font-semibold text-slate-900">{project.title}</p><p className="text-xs text-slate-500">{project.moderationStatus.replace(/_/g, ' ')}</p></div>
              <div className="flex gap-2">
                {project.moderationStatus !== 'published' && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => { setProjectId(project.id); setTitle(project.title); setDescription(project.description || ''); setCategory(project.category); setCoverImageUrl(project.coverImageUrl || ''); }} >Edit</Button>}
                {project.moderationStatus !== 'published' && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => deleteProject.mutate({ projectId: project.id })}><Trash2 className="mr-1 h-3.5 w-3.5" />Remove</Button>}
              </div>
            </article>
          ))}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2"><Label htmlFor="workspace-project-title">Project name</Label><Input id="workspace-project-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={180} disabled={busy} /></label>
            <label className="space-y-1.5 sm:col-span-2"><Label htmlFor="workspace-project-description">Project details</Label><Textarea id="workspace-project-description" value={description} onChange={event => setDescription(event.target.value)} maxLength={4000} rows={3} disabled={busy} /></label>
            <label className="space-y-1.5"><Label htmlFor="workspace-project-category">Category</Label><select id="workspace-project-category" value={category} onChange={event => setCategory(event.target.value as ServiceCategory)} className="w-full rounded-md border bg-white px-3 py-2 text-sm" disabled={busy}>{SERVICE_CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="space-y-1.5"><Label htmlFor="workspace-project-image">Cover photo</Label><Input id="workspace-project-image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={event => void uploadProjectImage(event.target.files?.[0])} /></label>
          </div>
          {coverImageUrl && <img src={coverImageUrl} alt="Selected project cover" className="h-32 w-full rounded-lg object-cover" />}
          <div className="flex flex-wrap gap-2"><Button type="button" disabled={busy || title.trim().length < 3} onClick={() => saveProject.mutate({ projectId, title: title.trim(), description: description.trim() || undefined, category, coverImageUrl: coverImageUrl || undefined })}>{saveProject.isPending ? 'Saving…' : projectId ? 'Save project changes for review' : 'Add project for review'}</Button>{projectId && <Button type="button" variant="outline" disabled={busy} onClick={() => { setProjectId(undefined); setTitle(''); setDescription(''); setCoverImageUrl(''); }}>Cancel edit</Button>}</div>
        </div>
      </details>

      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">Credentials</summary>
        <div className="mt-4 space-y-4">
          <p className="text-xs leading-5 text-slate-600">Documents are private to you and authorized reviewers. A badge appears only after independent review.</p>
          {(data.credentials || []).map(credential => <p key={credential.id} className="flex items-center gap-2 text-sm"><FileCheck2 className="h-4 w-4 text-emerald-700" />{credential.title} · {credential.status}</p>)}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5"><Label htmlFor="workspace-credential-title">Credential title</Label><Input id="workspace-credential-title" value={credentialTitle} onChange={event => setCredentialTitle(event.target.value)} disabled={busy} /></label>
            <label className="space-y-1.5"><Label htmlFor="workspace-credential-type">Type</Label><select id="workspace-credential-type" value={credentialType} onChange={event => setCredentialType(event.target.value)} className="w-full rounded-md border bg-white px-3 py-2 text-sm" disabled={busy}><option value="registration">Professional registration</option><option value="qualification">Qualification</option><option value="licence">Licence</option><option value="insurance">Insurance</option><option value="accreditation">Accreditation</option><option value="other">Other</option></select></label>
            <label className="space-y-1.5 sm:col-span-2"><Label htmlFor="workspace-credential-issuer">Issuing organization</Label><Input id="workspace-credential-issuer" value={issuingBody} onChange={event => setIssuingBody(event.target.value)} disabled={busy} /></label>
            <label className="space-y-1.5 sm:col-span-2"><Label htmlFor="workspace-credential-file">Document</Label><Input id="workspace-credential-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy || !credentialTitle.trim()} onChange={event => void uploadCredential(event.target.files?.[0])} /></label>
          </div>
        </div>
      </details>
      {message && <p role="status" className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">{uploading ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}{message}</p>}
    </section>
  );
}
