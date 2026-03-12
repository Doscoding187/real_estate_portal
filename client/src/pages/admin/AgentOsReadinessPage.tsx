import React from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, XCircle, Gauge, Users } from 'lucide-react';

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

const AgentOsReadinessPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.admin.getAgentOsReadinessReport.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const readiness = data?.readiness;
  const metrics = data?.metrics || [];

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/analytics')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Agent OS Readiness
            </h1>
            <p className="text-slate-500">
              Phase 2 gating based on actual Agent OS activation and weekly usage.
            </p>
          </div>
        </div>
        <Badge
          className={
            readiness?.readyForPhase2
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }
        >
          {readiness?.readyForPhase2 ? 'Ready For Phase 2' : 'Not Ready For Phase 2'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Users className="h-5 w-5 text-blue-600" />
              Agent Cohort
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{data?.cohort.totalAgents || 0}</div>
            <p className="text-sm text-slate-500 mt-1">Total agent profiles in current cohort</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Gauge className="h-5 w-5 text-blue-600" />
              Gate Pass Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {readiness?.passedMetrics || 0}/{readiness?.totalMetrics || 0}
            </div>
            <p className="text-sm text-slate-500 mt-1">Thresholds currently satisfied</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Gauge className="h-5 w-5 text-blue-600" />
              Weekly Window
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {data?.cohort.weeklyWindowDays || 7}d
            </div>
            <p className="text-sm text-slate-500 mt-1">Active usage measurement period</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800">Gate Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric: any) => (
              <div
                key={metric.key}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{metric.label}</p>
                    {metric.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {metric.count} agents reached this state
                  </p>
                </div>

                <div className="min-w-[220px] text-right">
                  <div className="text-lg font-bold text-slate-900">
                    {formatPercent(metric.rate)}
                  </div>
                  <div className="text-sm text-slate-500">
                    Target: {formatPercent(metric.threshold)}
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={metric.passed ? 'h-full bg-green-500' : 'h-full bg-amber-500'}
                      style={{
                        width: `${Math.min(metric.rate / metric.threshold, 1.2) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800">Interpretation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>
            This report is the operational gate for Growth Layer work. If the cohort is not
            publishing profiles, getting listings live, receiving leads, working CRM, and booking
            showings at target rates, more breadth will compound instability rather than growth.
          </p>
          <p>
            The right response to failed gates is to fix the corresponding workflow, not to add
            adjacent features.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentOsReadinessPage;
