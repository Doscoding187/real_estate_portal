import { useEffect, useMemo, useState } from 'react';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ContactRound, Mail, Phone, Plus, Search, UserRound } from 'lucide-react';
import { toast } from 'sonner';

type Visibility = 'private' | 'agency_shared';

type ContactFormState = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  visibility: Visibility;
};

type ContactRow = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
};

const EMPTY_FORM: ContactFormState = {
  fullName: '',
  email: '',
  phone: '',
  company: '',
  notes: '',
  visibility: 'private',
};

const EMPTY_CONTACTS: ContactRow[] = [];

function formFromContact(contact: ContactRow): ContactFormState {
  return {
    fullName: contact.fullName,
    email: contact.email || '',
    phone: contact.phone || '',
    company: contact.company || '',
    notes: contact.notes || '',
    visibility: contact.visibility,
  };
}

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return 'Recently updated';
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  if (Number.isNaN(parsed.getTime())) return 'Recently updated';
  return `Updated ${parsed.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

function visibilityLabel(visibility: Visibility) {
  return visibility === 'agency_shared' ? 'Agency shared' : 'Private';
}

function ContactForm({
  initialValues,
  canShareWithAgency,
  isPending,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initialValues: ContactFormState;
  canShareWithAgency: boolean;
  isPending: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: ContactFormState) => void;
}) {
  const [values, setValues] = useState(initialValues);

  useEffect(() => setValues(initialValues), [initialValues]);

  const update = (field: keyof ContactFormState, value: string) => {
    setValues(current => ({ ...current, [field]: value }));
  };

  return (
    <form
      className="space-y-4"
      onSubmit={event => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="contact-name">
          Full name <span className="text-rose-500">*</span>
        </label>
        <Input
          id="contact-name"
          value={values.fullName}
          onChange={event => update('fullName', event.target.value)}
          placeholder="e.g. Thandi Mokoena"
          required
          maxLength={200}
          autoFocus
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            className="mb-1.5 block text-xs font-semibold text-slate-700"
            htmlFor="contact-email"
          >
            Email
          </label>
          <Input
            id="contact-email"
            type="email"
            value={values.email}
            onChange={event => update('email', event.target.value)}
            placeholder="name@example.com"
            maxLength={320}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-semibold text-slate-700"
            htmlFor="contact-phone"
          >
            Phone
          </label>
          <Input
            id="contact-phone"
            value={values.phone}
            onChange={event => update('phone', event.target.value)}
            placeholder="+27 …"
            maxLength={50}
          />
        </div>
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-semibold text-slate-700"
          htmlFor="contact-company"
        >
          Company or organisation
        </label>
        <Input
          id="contact-company"
          value={values.company}
          onChange={event => update('company', event.target.value)}
          placeholder="Optional"
          maxLength={200}
        />
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-semibold text-slate-700"
          htmlFor="contact-visibility"
        >
          Visibility
        </label>
        <select
          id="contact-visibility"
          value={values.visibility}
          onChange={event => update('visibility', event.target.value as Visibility)}
          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[color:color-mix(in_oklab,var(--primary)_18%,transparent)]"
        >
          <option value="private">Private to me</option>
          {canShareWithAgency ? <option value="agency_shared">Shared with my agency</option> : null}
        </select>
        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
          {canShareWithAgency
            ? 'Private contacts stay in your workspace. Agency-shared contacts are visible to your permitted team scope.'
            : 'This contact is private to your independent workspace.'}
        </p>
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-semibold text-slate-700"
          htmlFor="contact-notes"
        >
          Notes
        </label>
        <Textarea
          id="contact-notes"
          value={values.notes}
          onChange={event => update('notes', event.target.value)}
          placeholder="Useful context for your relationship"
          maxLength={2000}
          rows={4}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !values.fullName.trim()}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function AgentContacts() {
  const [search, setSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [formValues, setFormValues] = useState<ContactFormState>(EMPTY_FORM);

  const listQuery = trpc.contacts.list.useQuery(
    { query: search.trim() || undefined, limit: 60 },
    { retry: false, refetchOnWindowFocus: false },
  );
  const detailQuery = trpc.contacts.getById.useQuery(
    { contactId: selectedContactId as number },
    { enabled: selectedContactId !== null, retry: false, refetchOnWindowFocus: false },
  );
  const utils = trpc.useUtils();
  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: result => {
      toast.success('Contact created');
      setFormMode(null);
      setSelectedContactId(result.contactId);
      void utils.contacts.list.invalidate();
      void utils.contacts.getById.invalidate({ contactId: result.contactId });
    },
    onError: error => toast.error(error.message || 'Unable to create contact'),
  });
  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success('Contact updated');
      setFormMode(null);
      void utils.contacts.list.invalidate();
      if (selectedContactId !== null) {
        void utils.contacts.getById.invalidate({ contactId: selectedContactId });
      }
    },
    onError: error => toast.error(error.message || 'Unable to update contact'),
  });

  const contacts = (listQuery.data?.contacts ?? EMPTY_CONTACTS) as ContactRow[];
  const selectedContact = detailQuery.data as ContactRow | undefined;
  const canShareWithAgency = Boolean(listQuery.data?.scope.canShareWithAgency);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const selectedInList = useMemo(
    () => contacts.find(contact => contact.id === selectedContactId) || null,
    [contacts, selectedContactId],
  );

  const beginCreate = () => {
    setSelectedContactId(null);
    setFormValues(EMPTY_FORM);
    setFormMode('create');
  };

  const beginEdit = () => {
    if (!selectedContact) return;
    setFormValues(formFromContact(selectedContact));
    setFormMode('edit');
  };

  const submitForm = (values: ContactFormState) => {
    const input = {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      company: values.company,
      notes: values.notes,
      visibility: values.visibility,
    } as const;

    if (formMode === 'edit' && selectedContactId !== null) {
      updateMutation.mutate({ ...input, contactId: selectedContactId });
    } else {
      createMutation.mutate(input);
    }
  };

  return (
    <AgentAppShell>
      <main className={agentPageStyles.container}>
        <header className={agentPageStyles.header}>
          <div className={agentPageStyles.headingBlock}>
            <div className="flex items-center gap-2 text-[var(--primary)]">
              <ContactRound className="h-5 w-5" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                Agent Workplace
              </span>
            </div>
            <h1 className={agentPageStyles.title}>Contacts</h1>
            <p className={agentPageStyles.subtitle}>
              Keep one trusted, curated record for the people and relationships you work with.
            </p>
          </div>
          <Button className={agentPageStyles.primaryButton} onClick={beginCreate}>
            <Plus className="h-4 w-4" />
            Add contact
          </Button>
        </header>

        <section className={agentPageStyles.controls} aria-label="Find contacts">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Search contacts"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by name, email, phone or company"
              className="h-10 pl-9"
            />
          </div>
        </section>

        {listQuery.isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-[15px] border border-slate-200 bg-white text-sm text-slate-500">
            Loading your Contacts…
          </div>
        ) : listQuery.isError ? (
          <Card className="border-rose-200 bg-rose-50/60 shadow-none">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <h2 className="font-semibold text-rose-950">Contacts are unavailable right now</h2>
              <p className="text-sm leading-6 text-rose-900">
                We could not load your permitted Contacts. Your data has not been replaced with a
                blank state.
              </p>
              <Button variant="outline" onClick={() => void listQuery.refetch()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : contacts.length === 0 && !search.trim() && formMode !== 'create' ? (
          <Card className={cn(agentPageStyles.mutedPanel, 'border-dashed')}>
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-[var(--primary)]">
                <UserRound className="h-7 w-7" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-slate-950">
                Your Contacts space is ready
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                Add the people you maintain relationships with. Contacts stay under your permitted
                ownership and visibility scope.
              </p>
              <Button className="mt-5" onClick={beginCreate}>
                <Plus className="h-4 w-4" />
                Add your first contact
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(440px,1.2fr)]">
            <Card className={agentPageStyles.panel}>
              <CardHeader className="border-b border-slate-100 px-5 py-4">
                <CardTitle className="text-base">Your permitted Contacts</CardTitle>
                <p className="text-xs text-slate-500">
                  {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
                  {search.trim() ? ` matching “${search.trim()}”` : ''}
                </p>
              </CardHeader>
              <CardContent className="p-2">
                {contacts.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-slate-500">
                    No Contacts match that search.
                  </div>
                ) : (
                  <div className="space-y-1" role="list" aria-label="Contacts list">
                    {contacts.map(contact => (
                      <button
                        key={contact.id}
                        type="button"
                        role="listitem"
                        onClick={() => {
                          setSelectedContactId(contact.id);
                          setFormMode(null);
                        }}
                        className={cn(
                          'w-full rounded-xl px-3 py-3 text-left transition hover:bg-slate-50',
                          selectedContactId === contact.id && 'bg-sky-50 ring-1 ring-sky-100',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {contact.fullName}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {contact.company ||
                                contact.email ||
                                contact.phone ||
                                'No details added'}
                            </p>
                          </div>
                          <Badge
                            variant={contact.visibility === 'agency_shared' ? 'info' : 'secondary'}
                          >
                            {visibilityLabel(contact.visibility)}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-5">
              {formMode === 'create' ? (
                <Card className={agentPageStyles.panel}>
                  <CardHeader className="border-b border-slate-100 px-6 py-5">
                    <CardTitle className="text-lg">Add a contact</CardTitle>
                    <p className="text-sm text-slate-500">
                      Capture only the relationship details you need to maintain.
                    </p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ContactForm
                      initialValues={formValues}
                      canShareWithAgency={canShareWithAgency}
                      isPending={isSaving}
                      submitLabel="Create contact"
                      onCancel={() => setFormMode(null)}
                      onSubmit={submitForm}
                    />
                  </CardContent>
                </Card>
              ) : detailQuery.isLoading ? (
                <div className="flex min-h-[300px] items-center justify-center rounded-[15px] border border-slate-200 bg-white text-sm text-slate-500">
                  Loading contact…
                </div>
              ) : detailQuery.isError ? (
                <Card className="border-rose-200 bg-rose-50/60 shadow-none">
                  <CardContent className="p-6 text-sm text-rose-900">
                    This Contact is no longer available in your permitted scope.
                  </CardContent>
                </Card>
              ) : selectedContact ? (
                <Card className={agentPageStyles.panel}>
                  <CardHeader className="border-b border-slate-100 px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl">{selectedContact.fullName}</CardTitle>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatUpdatedAt(selectedContact.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            selectedContact.visibility === 'agency_shared' ? 'info' : 'secondary'
                          }
                        >
                          {visibilityLabel(selectedContact.visibility)}
                        </Badge>
                        {selectedContact.canEdit ? (
                          <Button variant="outline" size="sm" onClick={beginEdit}>
                            Edit
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedContact.email ? (
                        <a
                          className="flex min-w-0 items-center gap-2 text-sm text-slate-700 hover:text-[var(--primary)]"
                          href={`mailto:${selectedContact.email}`}
                        >
                          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate">{selectedContact.email}</span>
                        </a>
                      ) : null}
                      {selectedContact.phone ? (
                        <a
                          className="flex min-w-0 items-center gap-2 text-sm text-slate-700 hover:text-[var(--primary)]"
                          href={`tel:${selectedContact.phone}`}
                        >
                          <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate">{selectedContact.phone}</span>
                        </a>
                      ) : null}
                    </div>
                    {selectedContact.company ? (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Company or organisation
                        </p>
                        <p className="mt-1 text-sm text-slate-800">{selectedContact.company}</p>
                      </div>
                    ) : null}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Notes
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {selectedContact.notes || 'No notes added yet.'}
                      </p>
                    </div>
                    {!selectedContact.canEdit ? (
                      <p className="border-t border-slate-100 pt-4 text-xs text-slate-500">
                        This Contact is visible to you but maintained by its owner or an authorised
                        manager.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : selectedInList ? (
                <div className="flex min-h-[300px] items-center justify-center rounded-[15px] border border-slate-200 bg-white text-sm text-slate-500">
                  Select this Contact to view its details.
                </div>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center rounded-[15px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
                  Select a Contact to view and maintain its curated details.
                </div>
              )}

              {formMode === 'edit' && selectedContact ? (
                <Card className={agentPageStyles.panel}>
                  <CardHeader className="border-b border-slate-100 px-6 py-5">
                    <CardTitle className="text-lg">Maintain contact</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ContactForm
                      initialValues={formValues}
                      canShareWithAgency={canShareWithAgency}
                      isPending={isSaving}
                      submitLabel="Save changes"
                      onCancel={() => setFormMode(null)}
                      onSubmit={submitForm}
                    />
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </AgentAppShell>
  );
}
