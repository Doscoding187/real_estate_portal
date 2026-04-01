import { useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { applySeo } from '@/lib/seo';
import { ProNavigation } from '@/components/services/ProNavigation';

const STATUS_OPTIONS = ['new', 'accepted', 'quoted', 'won', 'lost', 'expired'] as const;

export default function ProDashboardPage() {
  useAuth({ redirectOnUnauthenticated: true });

  useEffect(() => {
    applySeo({
      title: 'Provider Dashboard | Services Pro',
      description: 'Manage service leads, track pipeline, and monitor provider performance.',
      canonicalPath: '/pro/dashboard',
      noindex: true,
    });
  }, []);

  const dashboardQuery = trpc.servicesEngine.myProviderDashboard.useQuery({ days: 30 });
  const leadsQuery = trpc.servicesEngine.myProviderLeads.useQuery({ limit: 50 });
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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Provider Dashboard
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Lead inbox and performance
        </h1>
      </header>
      <ProNavigation />

      <section className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total leads</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard?.totalLeads || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active pipeline</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {dashboard?.activePipeline || 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conversion rate</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {dashboard?.conversionRate || 0}%
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending moderation</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {dashboard?.pendingModeration || 0}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leads.map((lead: any) => (
              <article key={lead.id} className="rounded-lg border p-4">
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
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm"
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
              <p className="text-sm text-slate-600">
                No provider leads yet. Complete your profile to attract matches.
              </p>
            )}
            <div className="pt-2">
              <Button variant="outline" onClick={() => leadsQuery.refetch()}>
                Refresh inbox
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
