import { useLocation } from 'wouter';
import { Building2, ExternalLink, Globe2, RefreshCw, ShieldCheck, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';

type ProfileRecord = Record<string, unknown>;

function readableValue(value: unknown, fallback = 'Not provided'): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function statusLabel(status: unknown): string {
  if (status === 'approved') return 'Approved';
  if (status === 'pending') return 'Under review';
  if (status === 'rejected') return 'Changes requested';
  return 'Not recorded';
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-900">{value}</dd>
    </div>
  );
}

/**
 * Developer identity is reviewed before it can represent an organisation on
 * public developments. This page intentionally shows the real identity and
 * change boundary instead of a local-only form with invented company data.
 */
export default function SettingsPanel() {
  const [, setLocation] = useLocation();
  const profileQuery = trpc.developer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (profileQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (profileQuery.error || !profileQuery.data) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-4 py-10 text-center">
          <Building2 className="mx-auto h-10 w-10 text-blue-600" />
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Unable to load organisation settings
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your organisation has not been changed. Retry when the connection is available.
            </p>
          </div>
          <Button variant="outline" onClick={() => profileQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const profile = profileQuery.data as ProfileRecord;
  const organisation = (profile.organisation ?? profile) as ProfileRecord;
  const membership = (profile.membership ?? {}) as ProfileRecord;
  const publisher = (profile.publisher ?? profile) as ProfileRecord;
  const organisationName = readableValue(
    organisation.name ?? profile.companyName ?? publisher.name ?? publisher.brandName,
    'Developer organisation',
  );
  const publisherSlug = readableValue(publisher.slug, '');
  const publisherVisible = Number(publisher.isVisible ?? 0) === 1;
  const location = [organisation.city, organisation.province].filter(Boolean).join(', ');
  const specializations = Array.isArray(organisation.specializations)
    ? organisation.specializations.filter((value: unknown) => typeof value === 'string').join(', ')
    : '';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Developer workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Organisation settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review the organisation identity that owns your developments and public publisher
            presence.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {statusLabel(organisation.status)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Organisation identity
          </CardTitle>
          <CardDescription>
            These are the details supplied during Developer onboarding and protected by the
            organisation review process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Organisation" value={organisationName} />
            <Field label="Status" value={statusLabel(organisation.status)} />
            <Field label="Category" value={readableValue(organisation.category)} />
            <Field label="Email" value={readableValue(organisation.email)} />
            <Field label="Phone" value={readableValue(organisation.phone)} />
            <Field label="Location" value={location || 'Not provided'} />
            <Field
              label="Website"
              value={readableValue(organisation.website ?? publisher.websiteUrl)}
            />
            <Field
              label="Established"
              value={
                organisation.establishedYear ? String(organisation.establishedYear) : 'Not provided'
              }
            />
            <Field label="Specialisations" value={specializations || 'Not provided'} />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-blue-600" />
              Public publisher presence
            </CardTitle>
            <CardDescription>
              This publisher identity is carried by approved developments and their enquiries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">
                {readableValue(publisher.name ?? publisher.brandName, organisationName)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {publisherVisible
                  ? 'This publisher is visible to the public.'
                  : 'This publisher is not yet visible to the public.'}
              </p>
            </div>
            {publisherVisible && publisherSlug && (
              <Button variant="outline" onClick={() => setLocation(`/developer/${publisherSlug}`)}>
                View public publisher page
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Team access
            </CardTitle>
            <CardDescription>
              Your current membership is shown below. Self-service invitations, role changes, and
              removals are not enabled in this MVP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Your role:</span>{' '}
                {readableValue(membership.role, 'Organisation member')}
              </p>
              <p className="mt-1">
                <span className="font-medium text-slate-900">Membership:</span>{' '}
                {readableValue(membership.status, 'Active')}
              </p>
            </div>
            <Button variant="outline" onClick={() => setLocation('/contact')}>
              Request controlled team access
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-200 bg-blue-50/60">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <div>
              <p className="font-medium text-slate-950">Identity changes stay review-protected</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                Correct a rejected application in onboarding. For an approved organisation, contact
                Property Listify so public ownership and lead custody remain coherent.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {organisation.status === 'rejected' && (
              <Button variant="outline" onClick={() => setLocation('/developer/setup')}>
                Correct application
              </Button>
            )}
            <Button onClick={() => setLocation('/developer/subscription')}>
              Billing and access
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
