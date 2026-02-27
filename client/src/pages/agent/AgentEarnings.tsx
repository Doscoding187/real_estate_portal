import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { AgentSidebar } from '@/components/agent/AgentSidebar';
import { AgentTopNav } from '@/components/agent/AgentTopNav';
import { CommissionTracker } from '@/components/agent/CommissionTracker';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Menu, Wallet, Clock, AlertCircle } from 'lucide-react';
import { KpiValue } from '@/components/dashboard/KpiValue';

function formatCurrencyFromCents(amountInCents: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format((amountInCents || 0) / 100);
}

export default function AgentEarnings() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  const queryEnabled = isAuthenticated && user?.role === 'agent';

  const commissionsQuery = trpc.agent.getMyCommissions.useQuery(
    { status: undefined },
    { enabled: queryEnabled },
  );

  const leadsQuery = trpc.agent.getMyLeads.useQuery(
    { status: 'all', limit: 25 },
    { enabled: queryEnabled },
  );

  if (!loading && !isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (!loading && user?.role !== 'agent') {
    setLocation('/dashboard');
    return null;
  }

  const commissions = commissionsQuery.data || [];
  const leads = leadsQuery.data || [];

  const commissionSummary = useMemo(() => {
    const paid = commissions
      .filter(commission => commission.status === 'paid')
      .reduce((sum, commission) => sum + (commission.amount || 0), 0);

    const pending = commissions
      .filter(commission => commission.status === 'pending')
      .reduce((sum, commission) => sum + (commission.amount || 0), 0);

    const approved = commissions
      .filter(commission => commission.status === 'approved')
      .reduce((sum, commission) => sum + (commission.amount || 0), 0);

    return {
      paid,
      pending,
      approved,
    };
  }, [commissions]);

  const leadsNeedingFollowUp = useMemo(
    () =>
      leads.filter(lead =>
        ['new', 'contacted', 'qualified', 'viewing_scheduled', 'offer_sent'].includes(
          String(lead.status),
        ),
      ).length,
    [leads],
  );

  const newLeadsCount = useMemo(
    () => leads.filter(lead => String(lead.status) === 'new').length,
    [leads],
  );

  const recentLeads = useMemo(() => leads.slice(0, 5), [leads]);

  const hasCommissionData = !commissionsQuery.isLoading && !commissionsQuery.error;
  const hasLeadData = !leadsQuery.isLoading && !leadsQuery.error;

  return (
    <div className="flex min-h-screen bg-[#F4F7FA]">
      <AgentSidebar />

      <Sheet>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <AgentSidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1 lg:pl-64">
        <AgentTopNav />

        <main className="p-6 max-w-[1600px] mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
              <p className="text-gray-500 mt-1">
                Commission totals are real-time. Wallet and payout automation are not yet available.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card className="shadow-soft border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-500 mb-1">Paid Commissions</p>
                <KpiValue
                  value={hasCommissionData ? formatCurrencyFromCents(commissionSummary.paid) : null}
                  status={hasCommissionData ? 'real' : 'unavailable'}
                  className="text-2xl font-bold text-gray-900"
                />
              </CardContent>
            </Card>

            <Card className="shadow-soft border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-500 mb-1">Pending Commissions</p>
                <KpiValue
                  value={
                    hasCommissionData ? formatCurrencyFromCents(commissionSummary.pending) : null
                  }
                  status={hasCommissionData ? 'real' : 'unavailable'}
                  className="text-2xl font-bold text-gray-900"
                />
              </CardContent>
            </Card>

            <Card className="shadow-soft border-l-4 border-l-amber-500">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-500 mb-1">Approved Commissions</p>
                <KpiValue
                  value={
                    hasCommissionData ? formatCurrencyFromCents(commissionSummary.approved) : null
                  }
                  status={hasCommissionData ? 'real' : 'unavailable'}
                  className="text-2xl font-bold text-gray-900"
                />
              </CardContent>
            </Card>

            <Card className="shadow-soft border-l-4 border-l-slate-400">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-500 mb-1">Wallet Balance</p>
                <KpiValue
                  status="coming_soon"
                  className="text-2xl font-bold text-gray-900"
                  hint="Wallet ledger and withdrawal flow are not wired yet."
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Lead Follow-up Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      New Leads
                    </div>
                    <KpiValue
                      value={hasLeadData ? newLeadsCount : null}
                      status={hasLeadData ? 'real' : 'unavailable'}
                      className="text-xl font-bold text-gray-900"
                    />
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Clock className="h-4 w-4" />
                      Needs Follow-up
                    </div>
                    <KpiValue
                      value={hasLeadData ? leadsNeedingFollowUp : null}
                      status={hasLeadData ? 'real' : 'unavailable'}
                      className="text-xl font-bold text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Recent Leads</p>
                  {hasLeadData && recentLeads.length > 0 ? (
                    <div className="space-y-2">
                      {recentLeads.map(lead => (
                        <div
                          key={lead.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="font-medium text-sm text-gray-900">{lead.name}</p>
                            <p className="text-xs text-gray-500">{lead.email}</p>
                          </div>
                          <Badge variant="secondary">{lead.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : hasLeadData ? (
                    <p className="text-sm text-gray-500">No leads yet.</p>
                  ) : (
                    <p className="text-sm text-gray-500">Lead data unavailable.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-slate-600" />
                  Payout Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-600">
                  Bank payout scheduling and wallet withdrawal actions are not enabled in pilot.
                </p>
                <div className="rounded-lg border border-dashed p-3 text-sm text-gray-500">
                  <KpiValue status="coming_soon" className="font-semibold" />
                </div>
              </CardContent>
            </Card>
          </div>

          <CommissionTracker />

          {commissionsQuery.error && (
            <p className="text-sm text-red-600">Unable to load commissions: {commissionsQuery.error.message}</p>
          )}
          {leadsQuery.error && (
            <p className="text-sm text-red-600">Unable to load leads: {leadsQuery.error.message}</p>
          )}
        </main>
      </div>
    </div>
  );
}
