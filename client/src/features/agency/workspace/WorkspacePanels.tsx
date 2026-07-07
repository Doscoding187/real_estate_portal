import { ArrowRight, BarChart3, Bell, CalendarDays, Home, LineChart, Target, Users } from 'lucide-react';
import {
  Bar as RechartsBar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PIPELINE_STAGES } from './constants';
import { EmptyPanel, SectionTitle } from './WorkspacePrimitives';
import type {
  AgentLeaderboardRow,
  ConversionStats,
  PerformanceDatum,
  WorkspaceContentProps,
  WorkspaceId,
} from './types';
import { getInitials, numberLabel, percent, sourceLabel, toneClasses } from './utils';

export function AttentionPanel({
  items,
  onNavigate,
  isLoading,
}: {
  items: WorkspaceContentProps['attentionItems'];
  onNavigate: (workspace: WorkspaceId) => void;
  isLoading?: boolean;
}) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle icon={Bell} title="Attention Centre" eyebrow="Priority queue" />
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          items.map(item => {
            const Icon = item.icon;
            const classes = toneClasses(item.tone);
            return (
              <div
                key={item.title}
                className={cn(
                  'grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-center',
                  classes.border,
                  classes.soft,
                )}
              >
                <div className="flex min-w-0 gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white',
                      classes.text,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">{item.title}</h3>
                      <Badge variant="outline" className="border-white/80 bg-white text-slate-700">
                        {item.value}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-white bg-white"
                  onClick={() => onNavigate(item.route)}
                >
                  {item.action}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function TodayPanel({
  items,
  onNavigate,
}: {
  items: WorkspaceContentProps['agendaItems'];
  onNavigate: (workspace: WorkspaceId) => void;
}) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle icon={CalendarDays} title="Today and Upcoming" eyebrow="Operating rhythm" />
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map(item => {
          const classes = toneClasses(item.tone);
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onNavigate(item.route)}
              className="flex w-full gap-3 text-left"
            >
              <div className="flex w-16 shrink-0 justify-end pt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                {item.time}
              </div>
              <div className="relative flex-1 border-l border-slate-200 pb-4 pl-4 last:pb-0">
                <span
                  className={cn(
                    'absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full ring-4 ring-white',
                    classes.dot,
                  )}
                />
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function PipelineSnapshot({
  conversion,
  leadsTotal,
  onNavigate,
}: {
  conversion: ConversionStats;
  pipelineCounts?: Map<string, number>;
  leadsTotal: number;
  onNavigate: (workspace: WorkspaceId) => void;
}) {
  const statusRows = conversion.byStatus.length
    ? conversion.byStatus
    : PIPELINE_STAGES.map(stage => ({ status: stage.key, count: 0, percentage: 0 }));
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle
          icon={Target}
          title="Lead Pipeline"
          eyebrow={`${numberLabel(leadsTotal)} leads analysed`}
          action={
            <Button variant="outline" onClick={() => onNavigate('leads')}>
              Leads
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Conversion rate</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {conversion.conversionRate}%
              </p>
            </div>
            <Badge variant="outline" className="bg-white">
              {numberLabel(conversion.converted)} converted
            </Badge>
          </div>
          <Progress
            value={Math.min(100, conversion.conversionRate)}
            className="mt-3"
            indicatorClassName="bg-emerald-600"
          />
        </div>
        {statusRows.slice(0, 5).map(row => {
          const stage = PIPELINE_STAGES.find(item => item.key === row.status);
          const classes = toneClasses(stage?.tone || 'slate');
          return (
            <div key={row.status}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <span className={cn('h-2 w-2 rounded-full', classes.dot)} />
                  {stage?.label || sourceLabel(row.status)}
                </span>
                <span className="text-slate-500">{numberLabel(Number(row.count || 0))}</span>
              </div>
              <Progress
                value={percent(Number(row.count || 0), leadsTotal)}
                indicatorClassName={classes.progress}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function ListingHealthPanel({
  listingHealth,
  onNavigate,
  compact = false,
}: {
  listingHealth: WorkspaceContentProps['listingHealth'];
  onNavigate: (workspace: WorkspaceId) => void;
  compact?: boolean;
}) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle
          icon={Home}
          title="Listing Health"
          eyebrow="Inventory readiness"
          action={
            <Button variant="outline" onClick={() => onNavigate('listings')}>
              Listings
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
      </CardHeader>
      <CardContent className={cn('grid gap-3', compact ? 'grid-cols-2' : 'md:grid-cols-4')}>
        {listingHealth.map(item => {
          const classes = toneClasses(item.tone);
          return (
            <div key={item.label} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                <span className={cn('h-2 w-2 rounded-full', classes.dot)} />
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {numberLabel(item.value)}
              </p>
              <Progress
                value={Math.min(100, item.value * 20)}
                className="mt-3"
                indicatorClassName={classes.progress}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function TeamSnapshot({
  leaderboard,
  onNavigate,
}: {
  leaderboard: AgentLeaderboardRow[];
  onNavigate: (workspace: WorkspaceId) => void;
}) {
  const topAgent = leaderboard[0];
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle
          icon={Users}
          title="Team Activity"
          eyebrow="Commercial behaviour"
          action={
            <Button variant="outline" onClick={() => onNavigate('team')}>
              Team
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {topAgent ? (
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-teal-50 text-teal-700">
                  {getInitials(topAgent.agentName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">{topAgent.agentName}</p>
                <p className="text-sm text-slate-500">
                  {numberLabel(topAgent.leadsGenerated)} leads ·{' '}
                  {numberLabel(topAgent.propertiesSold)} sold
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">Conversion</span>
                <span className="font-semibold text-slate-950">{topAgent.conversionRate}%</span>
              </div>
              <Progress
                value={Math.min(100, topAgent.conversionRate)}
                indicatorClassName="bg-emerald-600"
              />
            </div>
          </div>
        ) : (
          <EmptyPanel
            icon={Users}
            title="No team activity yet"
            text="Agent performance appears once leads and listings are assigned."
          />
        )}
      </CardContent>
    </Card>
  );
}

export function PerformanceMiniPanel({
  data,
  latest,
}: {
  data: PerformanceDatum[];
  latest?: PerformanceDatum;
}) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle icon={LineChart} title="Agency Performance" eyebrow="Trend summary" />
      </CardHeader>
      <CardContent>
        {data.length ? (
          <div className="grid gap-4 md:grid-cols-[1fr_180px] md:items-center">
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <RechartsBar dataKey="leads" fill="#0f766e" radius={[6, 6, 2, 2]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">{latest?.month || 'Latest'}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {numberLabel(latest?.leads || 0)}
              </p>
              <p className="mt-1 text-sm text-slate-500">latest leads</p>
            </div>
          </div>
        ) : (
          <EmptyPanel
            icon={BarChart3}
            title="No performance data yet"
            text="Historical reporting appears once agency activity is recorded."
          />
        )}
      </CardContent>
    </Card>
  );
}
