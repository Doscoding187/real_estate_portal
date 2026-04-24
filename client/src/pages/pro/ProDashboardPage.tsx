import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { applySeo } from '@/lib/seo';
import { ProNavigation } from '@/components/services/ProNavigation';
import { useServiceProviderOnboardingStatus } from '@/hooks/useServiceProviderOnboardingStatus';
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Sparkles } from 'lucide-react';

const STATUS_OPTIONS = ['new', 'accepted', 'quoted', 'won', 'lost', 'expired'] as const;

export default function ProDashboardPage() {
  useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const { status, isLoading: statusLoading } = useServiceProviderOnboardingStatus();

  useEffect(() => {
    applySeo({
      title: 'Provider Dashboard | Services Pro',
      description: 'Manage service leads, track pipeline, and monitor provider performance.',
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
      toast.success('Lead updated');
      await leadsQuery.refetch();
      await dashboardQuery.refetch();
    },
    onError: error => toast.error(error.message || 'Failed to update lead'),
  });

  const dashboard = dashboardQuery.data;
  const leads = leadsQuery.data || [];

  if (statusLoading) {
    return (
      <main className="min-h-screen bg-[#f7f4ec]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
          <p className="text-sm text-slate-500">Preparing your partner workspace...</p>
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
                  Service Listify Pro
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Provider dashboard
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="font-serif text-4xl leading-tight text-slate-950 md:text-6xl">
                  Lead inbox and performance for your provider workspace.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  Track new leads, monitor pipeline movement, and keep setup progress visible so you
                  know what still blocks stronger marketplace exposure.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Total leads
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{dashboard?.totalLeads || 0}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Active pipeline
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{dashboard?.activePipeline || 0}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Conversion rate
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{dashboard?.conversionRate || 0}%</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-[#10294f] p-6 text-white shadow-[0_24px_90px_-40px_rgba(16,41,79,0.8)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Workspace focus
              </p>
              <div className="mt-4 space-y-3">
                {[
                  'Complete setup first so the marketplace has enough profile context to rank you accurately.',
                  'Use lead status updates consistently so your pipeline metrics stay useful.',
                  'Return to profile setup whenever services or coverage areas need refinement.',
                ].map(item => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80">
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
                <CardTitle className="text-lg">Complete your partner setup</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1 text-sm text-amber-900">
                  <p>
                    Finish your public profile, add your services, and define your coverage areas to
                    unlock the full partner workspace.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {status?.profileConfigured ? 'Profile saved' : 'Profile needed'}
                    </Badge>
                    <Badge variant="outline">
                      {status?.servicesConfigured ? 'Services added' : 'Services needed'}
                    </Badge>
                    <Badge variant="outline">
                      {status?.locationsConfigured ? 'Locations added' : 'Locations needed'}
                    </Badge>
                  </div>
                </div>
                <Button className="bg-[#0f3d91] hover:bg-[#0a2e6e]" onClick={() => setLocation('/service/profile')}>
                  Finish setup
                </Button>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-3 md:grid-cols-4">
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total leads</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{dashboard?.totalLeads || 0}</CardContent>
            </Card>
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active pipeline</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {dashboard?.activePipeline || 0}
              </CardContent>
            </Card>
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Conversion rate</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {dashboard?.conversionRate || 0}%
              </CardContent>
            </Card>
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pending moderation</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {dashboard?.pendingModeration || 0}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle>Recent leads</CardTitle>
                <Button variant="outline" onClick={() => leadsQuery.refetch()}>
                  Refresh inbox
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {leads.map((lead: any) => (
                  <article key={lead.id} className="rounded-[1rem] border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900">
                          Lead #{lead.id} · {lead.serviceCategory}
                        </p>
                        <p className="text-xs text-slate-600">
                          {lead.sourceSurface} · {lead.intentStage}
                        </p>
                        <p className="text-xs text-slate-500">
                          {[lead.geoSuburb, lead.geoCity, lead.geoProvince]
                            .filter(Boolean)
                            .join(', ') || 'No location'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{lead.status}</Badge>
                        <select
                          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                          value={lead.status}
                          onChange={event =>
                            updateLead.mutate({
                              leadId: Number(lead.id),
                              status: event.target.value as any,
                              note: `Updated from provider dashboard`,
                            })
                          }
                        >
                          {STATUS_OPTIONS.map(status => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </article>
                ))}
                {leads.length === 0 && (
                  <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-600">
                    No provider leads yet. Complete your profile to attract matches.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
