import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Home,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ErrorPanel, MetricCard, SectionTitle } from '../workspace/WorkspacePrimitives';
import {
  AttentionPanel,
  ListingHealthPanel,
  PerformanceMiniPanel,
  PipelineSnapshot,
  TeamSnapshot,
  TodayPanel,
} from '../workspace/WorkspacePanels';
import type { WorkspaceContentProps } from '../workspace/types';
import { compactCurrency, numberLabel } from '../workspace/utils';

export function AgencyOverviewPage({
  stats,
  leadSignals,
  listingHealth,
  attentionItems,
  agendaItems,
  conversion,
  commission,
  leaderboard,
  performance,
  onNavigate,
  isLoading,
  hasError,
}: WorkspaceContentProps) {
  if (hasError.stats || hasError.recentLeads) return <ErrorPanel />;
  const latestPerformance = performance[performance.length - 1];
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          title="New leads"
          value={numberLabel(stats.recentLeads)}
          detail={`${numberLabel(stats.totalLeads)} total captured`}
          icon={MessageSquare}
          tone="teal"
        />
        <MetricCard
          title="Response queue"
          value={numberLabel(leadSignals.newLeadCount + leadSignals.contactedFollowUpCount)}
          detail={`${numberLabel(leadSignals.unassignedCount)} unassigned`}
          icon={Clock3}
          tone={leadSignals.unassignedCount ? 'amber' : 'emerald'}
        />
        <MetricCard
          title="Active listings"
          value={numberLabel(stats.activeListings)}
          detail={`${numberLabel(stats.totalListings)} total inventory`}
          icon={Home}
          tone="sky"
        />
        <MetricCard
          title="Pending review"
          value={numberLabel(stats.pendingListings)}
          detail="Listing readiness queue"
          icon={ClipboardCheck}
          tone={stats.pendingListings ? 'amber' : 'emerald'}
        />
        <MetricCard
          title="Viewings"
          value={numberLabel(leadSignals.viewingCount)}
          detail="Viewing-stage prospects"
          icon={CalendarDays}
          tone={leadSignals.viewingCount ? 'amber' : 'slate'}
        />
        <MetricCard
          title="Commission"
          value={compactCurrency(commission.pendingCommissions)}
          detail={`${compactCurrency(commission.totalEarnings)} tracked`}
          icon={CircleDollarSign}
          tone="emerald"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.75fr)]">
        <AttentionPanel
          items={attentionItems.slice(0, 4)}
          onNavigate={onNavigate}
          isLoading={isLoading.recentLeads || isLoading.stats}
        />
        <TodayPanel items={agendaItems} onNavigate={onNavigate} />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <PipelineSnapshot
          conversion={conversion}
          leadsTotal={Math.max(conversion.total, stats.totalLeads, 1)}
          onNavigate={onNavigate}
        />
        <ListingHealthPanel listingHealth={listingHealth} onNavigate={onNavigate} compact />
        <TeamSnapshot leaderboard={leaderboard} onNavigate={onNavigate} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PerformanceMiniPanel data={performance} latest={latestPerformance} />
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <SectionTitle icon={Sparkles} title="Growth Opportunity" eyebrow="Next best move" />
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-600">
              {stats.activeListings
                ? `${Math.round((stats.recentLeads / Math.max(stats.activeListings, 1)) * 10) / 10} recent leads per active listing. Review source quality and visibility in Growth.`
                : 'No active stock is available for public demand capture yet.'}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => onNavigate('growth')}>
              Open growth
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
