import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { applySeo } from '@/lib/seo';
import { ProNavigation } from '@/components/services/ProNavigation';
import { useServiceProviderOnboardingStatus } from '@/hooks/useServiceProviderOnboardingStatus';
import { formatCategoryLabel } from '@/features/services/catalog';
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Clock3, Sparkles } from 'lucide-react';

const NEXT_STATUSES: Record<string, string[]> = {
  new: ['accepted', 'expired', 'lost'],
  accepted: ['quoted', 'won', 'lost', 'expired'],
  quoted: ['won', 'lost', 'expired'],
  won: [],
  lost: [],
  expired: [],
};

function readableStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, value => value.toUpperCase());
}

export default function ProDashboardPage() {
  useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const { status, isLoading: statusLoading } = useServiceProviderOnboardingStatus();
  const [responseNotes, setResponseNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    applySeo({
      title: 'Provider Workspace | Property Listify Services',
      description:
        'Review service requests, update response status, and manage your provider profile.',
      canonicalPath: '/service/dashboard',
      noindex: true,
    });
  }, []);

  useEffect(() => {
    if (statusLoading) return;
    if (!status?.hasProviderIdentity && window.location.pathname !== '/service/profile') {
      setLocation('/service/profile');
    }
  }, [setLocation, status?.hasProviderIdentity, statusLoading]);

  const dashboardQuery = trpc.servicesEngine.myProviderDashboard.useQuery(
    { days: 30 },
    { enabled: Boolean(status?.dashboardUnlocked) },
  );
  const leadsQuery = trpc.servicesEngine.myProviderLeads.useQuery(
    { limit: 50 },
    { enabled: Boolean(status?.dashboardUnlocked) },
  );
  const updateLead = trpc.servicesEngine.updateMyLeadStatus.useMutation({
    onSuccess: async () => {
      toast.success('Request status updated');
      await leadsQuery.refetch();
      await dashboardQuery.refetch();
    },
    onError: error => toast.error(error.message || 'Failed to update request'),
  });
  const dashboard = dashboardQuery.data;
  const leads = leadsQuery.data || [];
  const activeLeadCount = useMemo(
    () => leads.filter(lead => ['new', 'accepted', 'quoted'].includes(String(lead.status))).length,
    [leads],
  );

  if (statusLoading) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-8 md:px-6">
        <div className="mx-auto max-w-7xl text-sm text-slate-500">
          Preparing your provider workspace...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,61,145,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(201,139,43,0.16),_transparent_22%),linear-gradient(180deg,_#f9f6ef_0%,_#eef4ff_56%,_#f7f4ec_100%)]" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
          <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Property Listify Services
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Provider workspace
                </span>
              </div>
              <div className="space-y-4">
                <h1 className="font-serif text-4xl leading-tight text-slate-950 md:text-6xl">
                  Requests and profile visibility.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  Respond to people who contacted your business, keep request status current, and
                  manage the profile people see in the directory.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Requests
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {dashboard?.totalLeads || 0}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Active
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{activeLeadCount}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Directory state
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {status?.provider?.isPublished ? 'Published' : 'Under review'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-[#10294f] p-6 text-white shadow-[0_24px_90px_-40px_rgba(16,41,79,0.8)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Workspace rules
              </p>
              <div className="mt-4 space-y-3">
                {[
                  'Only requests assigned to your provider identity appear in this inbox.',
                  'Requester contact details come from the Property Listify account authority.',
                  'Your public profile remains hidden until the directory review is complete.',
                ].map(item => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <ProNavigation />

          {!status?.fullFeaturesUnlocked && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-lg">Complete your provider profile</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2 text-sm text-amber-900">
                  <p>
                    Add your public profile, services, and listed coverage before requesting
                    directory review.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {status?.profileConfigured ? 'Profile saved' : 'Profile needed'}
                    </Badge>
                    <Badge variant="outline">
                      {status?.servicesConfigured ? 'Services added' : 'Services needed'}
                    </Badge>
                    <Badge variant="outline">
                      {status?.locationsConfigured ? 'Coverage added' : 'Coverage needed'}
                    </Badge>
                  </div>
                </div>
                <Button
                  className="bg-[#0f3d91] hover:bg-[#0a2e6e]"
                  onClick={() => setLocation('/service/profile')}
                >
                  Finish setup
                </Button>
              </CardContent>
            </Card>
          )}

          {status?.fullFeaturesUnlocked && !status?.provider?.isPublished && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="flex flex-col gap-2 p-5 text-sm text-blue-900 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">Your profile is ready for directory review.</p>
                  <p className="mt-1">
                    It will appear publicly after the platform review is complete.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setLocation('/service/profile')}>
                  Review profile
                </Button>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-3 md:grid-cols-3">
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Requests received</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {dashboard?.totalLeads || 0}
              </CardContent>
            </Card>
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active requests</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {dashboard?.activePipeline || 0}
              </CardContent>
            </Card>
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Won rate</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {dashboard?.conversionRate || 0}%
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle>Request inbox</CardTitle>
                <Button variant="outline" onClick={() => leadsQuery.refetch()}>
                  Refresh inbox
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {leadsQuery.isLoading && (
                  <div className="text-sm text-slate-500">Loading requests...</div>
                )}
                {leadsQuery.error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    We could not load your requests. Please try again.
                  </div>
                )}
                {!leadsQuery.isLoading &&
                  !leadsQuery.error &&
                  leads.map((lead: any) => {
                    const nextStatuses = NEXT_STATUSES[String(lead.status)] || [];
                    return (
                      <article
                        key={lead.id}
                        className="rounded-[1rem] border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">
                              Request #{lead.id} · {formatCategoryLabel(lead.serviceCategory)}
                              {lead.serviceCode ? ` · ${lead.serviceCode}` : ''}
                            </p>
                            <p className="text-xs text-slate-600">
                              {lead.requesterName || 'Registered Property Listify user'}
                              {lead.requesterEmail ? ` · ${lead.requesterEmail}` : ''}
                              {lead.requesterPhone ? ` · ${lead.requesterPhone}` : ''}
                            </p>
                            <p className="text-xs text-slate-500">
                              {[lead.geoSuburb, lead.geoCity, lead.geoProvince]
                                .filter(Boolean)
                                .join(', ') || 'No location supplied'}
                            </p>
                          </div>
                          <Badge variant="outline">{readableStatus(lead.status)}</Badge>
                        </div>
                        {lead.notes && (
                          <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                            {lead.notes}
                          </p>
                        )}
                        {(lead.propertyId || lead.listingId || lead.developmentId) && (
                          <p className="mt-2 text-xs text-slate-500">
                            Property context:{' '}
                            {lead.propertyId
                              ? `property #${lead.propertyId}`
                              : lead.listingId
                                ? `listing #${lead.listingId}`
                                : `development #${lead.developmentId}`}
                          </p>
                        )}
                        {nextStatuses.length > 0 && (
                          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                            <Textarea
                              value={responseNotes[lead.id] || ''}
                              onChange={event =>
                                setResponseNotes(previous => ({
                                  ...previous,
                                  [lead.id]: event.target.value,
                                }))
                              }
                              placeholder="Add a short response note for this request"
                              rows={2}
                              className="resize-none"
                            />
                            <div className="flex flex-wrap gap-2">
                              {nextStatuses.map(nextStatus => (
                                <Button
                                  key={nextStatus}
                                  size="sm"
                                  variant={
                                    nextStatus === 'accepted' || nextStatus === 'quoted'
                                      ? 'default'
                                      : 'outline'
                                  }
                                  disabled={updateLead.isPending}
                                  onClick={() =>
                                    updateLead.mutate({
                                      leadId: Number(lead.id),
                                      status: nextStatus as any,
                                      note:
                                        responseNotes[lead.id] ||
                                        `Marked ${readableStatus(nextStatus)} from provider workspace`,
                                    })
                                  }
                                >
                                  Mark {readableStatus(nextStatus)}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          Received {String(lead.createdAt).slice(0, 10)}
                        </p>
                      </article>
                    );
                  })}
                {!leadsQuery.isLoading && !leadsQuery.error && leads.length === 0 && (
                  <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm leading-6 text-slate-600">
                    No requests yet. Once your profile is published, consumer requests assigned to
                    your provider identity will appear here.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="rounded-[1.5rem] border border-[#0f3d91]/10 bg-white/90 p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <BriefcaseBusiness className="mt-0.5 h-5 w-5 text-[#0f3d91]" />
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Keep your directory profile current
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Update your services and listed coverage whenever your availability changes.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setLocation('/service/profile')}>
                Manage profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
