import { useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { AlertCircle, ArrowUpRight, BarChart3, RefreshCw, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc';

type TimeRange = '7d' | '30d' | '90d';

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

const stageLabels = [
  ['new', 'New'],
  ['contacted', 'Contacted'],
  ['qualified', 'Qualified'],
  ['viewing', 'Viewing stage'],
  ['offer', 'Offer sent'],
  ['dealInProgress', 'Deal in progress'],
  ['closedWon', 'Marked won'],
  ['closedLost', 'Closed lost'],
] as const;

export default function AnalyticsPanel() {
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const {
    data: home,
    isLoading,
    error,
    refetch,
  } = trpc.developer.getOperatingHome.useQuery(
    { range: timeRange },
    { refetchOnWindowFocus: false },
  );

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h1 className="text-xl font-semibold text-slate-900">Unable to load lead progress</h1>
          <p className="max-w-xl text-sm text-slate-600">{error.message}</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6" aria-label="Loading lead progress">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!home || home.developments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <BarChart3 className="h-10 w-10 text-blue-600" />
          <h1 className="text-xl font-semibold text-slate-900">Lead progress will appear here</h1>
          <p className="max-w-xl text-sm text-slate-600">
            Create a development and its captured enquiries will appear here as your team records
            progress in the CRM.
          </p>
          <Button onClick={() => setLocation('/developer/create-development')}>
            Create development
          </Button>
        </CardContent>
      </Card>
    );
  }

  const leads = home.portfolio.leads;
  const attentionCount = leads.slaWarningCount + leads.slaBreachCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Developer workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Lead progress</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            See how recent enquiries are progressing through the stages your team records.
          </p>
        </div>
        <Select value={timeRange} onValueChange={value => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-36" aria-label="Lead reporting period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Enquiries received"
          value={leads.capturedLeadCount}
          detail={`During the last ${timeRange.replace('d', ' days')}`}
          icon={<Users className="h-5 w-5" />}
        />
        <SummaryCard label="Open leads" value={leads.openLeadCount} detail="Across active stages" />
        <SummaryCard
          label="SLA attention"
          value={attentionCount}
          detail={`${leads.slaWarningCount} approaching · ${leads.slaBreachCount} overdue in this period`}
        />
        <SummaryCard
          label="Marked won"
          value={leads.stageCounts.closedWon}
          detail="Lead outcome recorded in the CRM"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current recorded stage</CardTitle>
          <CardDescription>
            These are the current CRM stages of enquiries received during the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.capturedLeadCount === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-600">
              No enquiries were captured during this period. Choose a longer period or open the lead
              manager to review existing enquiries.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stageLabels.map(([stage, label]) => (
                <div key={stage} className="rounded-lg border bg-white p-4">
                  <p className="text-sm text-slate-600">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">
                    {formatNumber(leads.stageCounts[stage])}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl text-sm text-slate-600">
              These figures describe CRM lead stages. “Marked won” is a recorded lead outcome; this
              view does not report signed contracts, completed sales or payments received.
            </p>
            <Button
              className="shrink-0"
              onClick={() => setLocation(`/developer/leads?range=${timeRange}`)}
            >
              Open lead manager <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lead progress by development</CardTitle>
          <CardDescription>
            Counts cover enquiries captured during the selected period. CRM stages show their
            current recorded state; “Marked won” is a lead outcome, not a completed property sale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="pb-3 pr-4 font-medium">
                    Development
                  </th>
                  <th scope="col" className="pb-3 px-3 font-medium">
                    Enquiries
                  </th>
                  <th scope="col" className="pb-3 px-3 font-medium">
                    Open leads
                  </th>
                  <th scope="col" className="pb-3 px-3 font-medium">
                    SLA attention
                  </th>
                  <th scope="col" className="pb-3 px-3 font-medium">
                    Marked won
                  </th>
                  <th scope="col" className="pb-3 pl-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {home.developments.map(development => {
                  const developmentLeads = development.leads;
                  const slaAttentionCount =
                    developmentLeads.slaWarningCount + developmentLeads.slaBreachCount;

                  return (
                    <tr key={development.identity.id} className="border-b last:border-0">
                      <th scope="row" className="py-3 pr-4 font-medium text-slate-950">
                        <span className="block">{development.identity.name}</span>
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {development.identity.location.city},{' '}
                          {development.identity.location.province}
                        </span>
                      </th>
                      <td className="px-3 py-3 tabular-nums">
                        {formatNumber(developmentLeads.capturedLeadCount)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {formatNumber(developmentLeads.openLeadCount)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        <span className="block">{formatNumber(slaAttentionCount)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatNumber(developmentLeads.slaBreachCount)} overdue
                        </span>
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {formatNumber(developmentLeads.stageCounts.closedWon)}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`View leads for ${development.identity.name}`}
                          onClick={() =>
                            setLocation(
                              `/developer/leads?developmentId=${development.identity.id}&range=${timeRange}`,
                            )
                          }
                        >
                          View leads <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{formatNumber(value)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        {icon ? <span className="text-blue-600">{icon}</span> : null}
      </CardContent>
    </Card>
  );
}
