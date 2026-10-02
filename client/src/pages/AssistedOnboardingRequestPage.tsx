import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

import { HomeLayout } from '@/layouts/HomeLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { applySeo } from '@/lib/seo';
import { trpc } from '@/lib/trpc';

type AssistedRequestArea =
  | 'agent'
  | 'agency_operations'
  | 'developer_operations'
  | 'other';

type AssistedRequestForm = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  currentRole: string;
  requestedArea: AssistedRequestArea;
  message: string;
};

const AREA_OPTIONS: Array<{ value: AssistedRequestArea; label: string }> = [
  { value: 'agent', label: 'Agent account or profile access' },
  { value: 'agency_operations', label: 'Agency workspace or team access' },
  { value: 'developer_operations', label: 'Developer organisation or team access' },
  { value: 'other', label: 'Other onboarding or platform question' },
];

const TOPIC_LABELS: Record<string, string> = {
  'account-access': 'Account or access support',
  'agency-workspace': 'Agency workspace support',
  'team-access': 'Controlled team-access request',
  'listing-preparation': 'Listing preparation support',
  'onboarding-help': 'Onboarding assistance',
};

function initialRequestContext(): { requestedArea: AssistedRequestArea; topic: string | null } {
  if (typeof window === 'undefined') return { requestedArea: 'other', topic: null };

  const query = new URLSearchParams(window.location.search);
  const requestedArea = query.get('area');
  const topic = query.get('topic');

  if (AREA_OPTIONS.some(option => option.value === requestedArea)) {
    return { requestedArea: requestedArea as AssistedRequestArea, topic };
  }

  return { requestedArea: 'other', topic };
}

function makeInitialForm(context: { requestedArea: AssistedRequestArea }): AssistedRequestForm {
  return {
    fullName: '',
    email: '',
    phone: '',
    company: '',
    currentRole: '',
    requestedArea: context.requestedArea,
    message: '',
  };
}

function requestAreaLabel(area: AssistedRequestArea): string {
  return AREA_OPTIONS.find(option => option.value === area)?.label ?? 'Other onboarding question';
}

/**
 * A bounded, persisted handoff for controlled onboarding. It intentionally
 * reuses the existing platform-team registration queue: it creates neither a
 * membership nor a commercial entitlement, and it never promises a response
 * time or external support delivery that has not been operationally proven.
 */
export default function AssistedOnboardingRequestPage() {
  const context = useMemo(() => initialRequestContext(), []);
  const [form, setForm] = useState<AssistedRequestForm>(() => makeInitialForm(context));
  const [requestId, setRequestId] = useState<number | null>(null);

  useEffect(() => {
    applySeo({
      title: 'Assisted onboarding request | Property Listify',
      description:
        'Request controlled onboarding assistance for your Property Listify account, workspace, or team access.',
      canonicalPath: '/contact',
    });
  }, []);

  const submitRequest = trpc.distribution.submitTeamRegistration.useMutation({
    onSuccess: result => {
      setRequestId(Number(result.registrationId));
    },
  });

  const topicLabel = context.topic ? (TOPIC_LABELS[context.topic] ?? context.topic) : null;
  const messageValid = form.message.trim().length >= 10;
  const canSubmit =
    form.fullName.trim().length >= 2 && form.email.trim().length > 0 && messageValid;

  const update = <Key extends keyof AssistedRequestForm>(key: Key, value: AssistedRequestForm[Key]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const submit = () => {
    if (!canSubmit || submitRequest.isPending) return;

    const notes = [
      '[assisted_onboarding_request]',
      `Request area: ${requestAreaLabel(form.requestedArea)}`,
      topicLabel ? `Requested topic: ${topicLabel}` : null,
      `Message: ${form.message.trim()}`,
      'Source: public assisted onboarding page',
    ]
      .filter(Boolean)
      .join('\n');

    submitRequest.mutate({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      company: form.company.trim() || undefined,
      currentRole: form.currentRole.trim() || undefined,
      requestedArea: form.requestedArea,
      notes,
    });
  };

  return (
    <HomeLayout>
      <main className="min-h-[calc(100vh-12rem)] bg-slate-50 pb-16 pt-28">
        <div className="container max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            {requestId ? (
              <div className="space-y-6 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Request received
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    Your assisted onboarding request is in the review queue
                  </h1>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
                    Reference #{requestId}. This request is stored for authorized Property Listify
                    review. It does not create a membership, change account permissions, activate
                    publishing, or start any payment process.
                  </p>
                </div>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/">
                    <Button>Return to Property Listify</Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline">Sign in</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form
                onSubmit={event => {
                  event.preventDefault();
                  submit();
                }}
              >
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Controlled onboarding
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    Request assisted onboarding support
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Use this form if you need help completing your Property Listify account,
                    professional presence, private listing preparation, or controlled team access.
                    Commercial activation and marketplace publication remain unavailable through
                    this request.
                  </p>
                </div>

                <div className="mt-7 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                    <p>
                      Provide only the contact and onboarding context needed to review your
                      request. Do not include passwords, payment-card or banking details, identity
                      documents, or another person&apos;s lead information. This is not an emergency,
                      payment, or legal-notice channel.
                    </p>
                  </div>
                </div>

                {topicLabel ? (
                  <p className="mt-5 text-sm text-slate-600">
                    Request context: <span className="font-medium text-slate-900">{topicLabel}</span>
                  </p>
                ) : null}

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-800" htmlFor="assisted-name">
                    Full name
                    <Input
                      id="assisted-name"
                      autoComplete="name"
                      value={form.fullName}
                      onChange={event => update('fullName', event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-800" htmlFor="assisted-email">
                    Email address
                    <Input
                      id="assisted-email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={event => update('email', event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-800" htmlFor="assisted-phone">
                    Phone or WhatsApp <span className="font-normal text-slate-500">(optional)</span>
                    <Input
                      id="assisted-phone"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={event => update('phone', event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-800" htmlFor="assisted-company">
                    Organisation <span className="font-normal text-slate-500">(optional)</span>
                    <Input
                      id="assisted-company"
                      autoComplete="organization"
                      value={form.company}
                      onChange={event => update('company', event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-800" htmlFor="assisted-role">
                    Your role <span className="font-normal text-slate-500">(optional)</span>
                    <Input
                      id="assisted-role"
                      value={form.currentRole}
                      onChange={event => update('currentRole', event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-800" htmlFor="assisted-area">
                    What do you need help with?
                    <select
                      id="assisted-area"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={form.requestedArea}
                      onChange={event => update('requestedArea', event.target.value as AssistedRequestArea)}
                    >
                      {AREA_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="mt-5 block space-y-2 text-sm font-medium text-slate-800" htmlFor="assisted-message">
                  What do you need to resolve?
                  <Textarea
                    id="assisted-message"
                    aria-describedby="assisted-message-help"
                    rows={6}
                    maxLength={1500}
                    value={form.message}
                    onChange={event => update('message', event.target.value)}
                    placeholder="Describe the onboarding or access issue without sensitive information."
                  />
                  <span id="assisted-message-help" className="block text-xs font-normal text-slate-500">
                    Please use at least 10 characters so the review queue has enough context.
                  </span>
                </label>

                {submitRequest.error ? (
                  <p role="alert" className="mt-4 text-sm text-red-700">
                    {submitRequest.error.message || 'We could not store your request. Please try again.'}
                  </p>
                ) : null}

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-lg text-xs leading-5 text-slate-500">
                    A final launch privacy notice and terms remain required before public rollout.
                    This controlled request does not change the current pre-payment onboarding or
                    commercial-entitlement policy.
                  </p>
                  <Button type="submit" disabled={!canSubmit || submitRequest.isPending}>
                    {submitRequest.isPending ? 'Saving request…' : 'Send assisted request'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </HomeLayout>
  );
}
