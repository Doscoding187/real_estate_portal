import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type ContactRecord = {
  id: number;
  phaseId: number | null;
  roleTitle: string;
  displayName: string;
  organizationName: string | null;
  email: string | null;
  phone: string | null;
  responsibility: string | null;
  visibleToPartners: boolean;
  isActive: boolean;
};

type ContactDraft = Omit<ContactRecord, 'id'> & { id: number | null; reason: string };

function newContactDraft(): ContactDraft {
  return {
    id: null,
    phaseId: null,
    roleTitle: '',
    displayName: '',
    organizationName: '',
    email: '',
    phone: '',
    responsibility: '',
    visibleToPartners: false,
    isActive: true,
    reason: '',
  };
}

export default function DevelopmentTeamContacts({ developmentId }: { developmentId: number }) {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<ContactDraft>(newContactDraft);
  const query = trpc.developer.getDevelopmentTeamContacts.useQuery(
    { developmentId },
    { retry: false, refetchOnWindowFocus: false },
  );
  const saveMutation = trpc.developer.saveDevelopmentTeamContact.useMutation({
    onSuccess: async () => {
      toast.success('Development contact saved.');
      setDialogOpen(false);
      setDraft(newContactDraft());
      await utils.developer.getDevelopmentTeamContacts.invalidate({ developmentId });
    },
    onError: error => toast.error(error.message || 'Could not save this contact.'),
  });

  const phaseLabels = useMemo(
    () => new Map<number, string>((query.data?.phases || []).map(phase => [Number(phase.id), `Phase ${phase.phaseNumber}: ${phase.name}`])),
    [query.data?.phases],
  );

  const editContact = (contact?: ContactRecord) => {
    setDraft(contact
      ? { ...contact, reason: '' }
      : newContactDraft());
    setDialogOpen(true);
  };

  const saveContact = () => {
    if (draft.reason.trim().length < 10) {
      toast.error('Explain why this contact is being added or changed.');
      return;
    }
    saveMutation.mutate({
      developmentId,
      contactId: draft.id,
      phaseId: draft.phaseId,
      roleTitle: draft.roleTitle.trim(),
      displayName: draft.displayName.trim(),
      organizationName: draft.organizationName?.trim() || null,
      email: draft.email?.trim() || null,
      phone: draft.phone?.trim() || null,
      responsibility: draft.responsibility?.trim() || null,
      visibleToPartners: draft.visibleToPartners,
      isActive: draft.isActive,
      reason: draft.reason.trim(),
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">People and responsibilities</h2>
            <p className="mt-1 text-sm text-slate-600">Show the team who owns each role and who to contact for this development or phase.</p>
          </div>
          {query.data?.canManage ? <Button onClick={() => editContact()}>Add contact</Button> : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {query.isLoading ? <p className="text-sm text-slate-600">Loading contacts…</p> : null}
          {query.error ? <p className="text-sm text-rose-700">Contacts could not be loaded. Refresh the development page and try again.</p> : null}
          {!query.isLoading && !query.error && query.data?.contacts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5">
              <p className="font-medium text-slate-900">No development contacts added yet</p>
              <p className="mt-1 text-sm text-slate-600">Add a site manager, sales contact, or escalation owner. Choose whether approved partners can see their contact details.</p>
            </div>
          ) : null}
          {query.data?.contacts.map(contact => (
            <article key={contact.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-950">{contact.roleTitle}: {contact.displayName}</h3>
                    <Badge className={contact.isActive ? 'border border-emerald-200 bg-emerald-50 text-emerald-800' : 'border border-slate-200 bg-slate-50 text-slate-600'}>{contact.isActive ? 'Active' : 'Archived'}</Badge>
                    <Badge className={contact.visibleToPartners ? 'border border-blue-200 bg-blue-50 text-blue-800' : 'border border-slate-200 bg-slate-50 text-slate-600'}>{contact.visibleToPartners ? 'Shared with partners' : 'Internal only'}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{contact.phaseId ? phaseLabels.get(Number(contact.phaseId)) || 'Phase contact' : 'All phases'}{contact.organizationName ? ` · ${contact.organizationName}` : ''}</p>
                  {contact.responsibility ? <p className="text-sm text-slate-700">{contact.responsibility}</p> : null}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {contact.phone ? <a href={`tel:${contact.phone}`} className="font-medium text-blue-700 hover:underline">{contact.phone}</a> : null}
                    {contact.email ? <a href={`mailto:${contact.email}`} className="font-medium text-blue-700 hover:underline">{contact.email}</a> : null}
                  </div>
                </div>
                {query.data?.canManage ? <Button variant="outline" size="sm" onClick={() => editContact(contact)}>Edit</Button> : null}
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Edit responsibility contact' : 'Add a responsibility contact'}</DialogTitle>
            <DialogDescription>Use a role people recognize, such as Site Manager, Sales Administrator, or Bond Consultant. You can assign it to one phase or the whole development.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1 text-sm font-medium">Role<input value={draft.roleTitle} onChange={event => setDraft(current => ({ ...current, roleTitle: event.target.value }))} maxLength={100} placeholder="Site Manager" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
            <label className="block space-y-1 text-sm font-medium">Name<input value={draft.displayName} onChange={event => setDraft(current => ({ ...current, displayName: event.target.value }))} maxLength={255} placeholder="Person responsible" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
            <label className="block space-y-1 text-sm font-medium">Development or phase<select value={draft.phaseId === null ? '' : String(draft.phaseId)} onChange={event => setDraft(current => ({ ...current, phaseId: event.target.value ? Number(event.target.value) : null }))} className="w-full rounded-md border border-input bg-white px-3 py-2 font-normal"><option value="">All phases</option>{query.data?.phases.map(phase => <option key={phase.id} value={phase.id}>Phase {phase.phaseNumber}: {phase.name}</option>)}</select></label>
            <label className="block space-y-1 text-sm font-medium">Organization<input value={draft.organizationName || ''} onChange={event => setDraft(current => ({ ...current, organizationName: event.target.value }))} maxLength={255} placeholder="Optional" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm font-medium">Phone<input value={draft.phone || ''} onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))} maxLength={50} placeholder="At least one contact method" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
              <label className="block space-y-1 text-sm font-medium">Email<input type="email" value={draft.email || ''} onChange={event => setDraft(current => ({ ...current, email: event.target.value }))} maxLength={320} className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
            </div>
            <label className="block space-y-1 text-sm font-medium">What should people contact them about?<Textarea value={draft.responsibility || ''} onChange={event => setDraft(current => ({ ...current, responsibility: event.target.value }))} maxLength={1000} rows={2} placeholder="For example: site access, current availability, or bond support" /></label>
            <label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={draft.visibleToPartners} onChange={event => setDraft(current => ({ ...current, visibleToPartners: event.target.checked }))} className="mt-1" /><span><span className="font-medium">Share with approved partners</span><span className="block text-slate-600">Only active partner opportunities can see this contact. Planned phase contacts stay hidden until the phase is selling.</span></span></label>
            {draft.id ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isActive} onChange={event => setDraft(current => ({ ...current, isActive: event.target.checked }))} /><span>Contact is active</span></label> : null}
            <label className="block space-y-1 text-sm font-medium">Reason for this change<Textarea value={draft.reason} onChange={event => setDraft(current => ({ ...current, reason: event.target.value }))} minLength={10} maxLength={500} rows={2} placeholder="For example: site manager changed for phase 2" /></label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={saveMutation.isPending} onClick={saveContact}>{saveMutation.isPending ? 'Saving…' : 'Save contact'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
