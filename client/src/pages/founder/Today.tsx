import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Target,
  CheckCircle2,
  CalendarCheck,
  Sparkles,
  Activity,
  X,
  ExternalLink,
  User,
} from 'lucide-react';

/* ────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────── */

function formatWaiting(hours: number): string {
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TYPE_CONFIG = {
  escalation: { label: 'Escalation', color: 'bg-rose-100 text-rose-700' },
  decision: { label: 'Decision', color: 'bg-amber-100 text-amber-700' },
  opportunity: { label: 'Opportunity', color: 'bg-emerald-100 text-emerald-700' },
  awareness: { label: 'Awareness', color: 'bg-slate-100 text-slate-600' },
} as const;

const URGENCY_DOT: Record<string, string> = {
  critical: 'bg-rose-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-slate-400',
};

type SelectedItem = { id: number; type: string; source: string; urgency: string } | null;

type DetailType = 'developer_lead' | 'agent_approval' | 'listing_approval' | 'development_approval';

function toDetailType(item: NonNullable<SelectedItem>): DetailType | null {
  if (item.source === 'leads') return 'developer_lead';
  if (item.source === 'admin' && item.id === -1) return 'agent_approval';
  if (item.source === 'admin' && item.id === -2) return 'listing_approval';
  if (item.source === 'admin' && item.id === -3) return 'development_approval';
  return null;
}

function operationalRouteLabel(route: string): string {
  if (route.includes('agent-approvals')) return 'Open Agent Approvals';
  if (route.includes('listing-approvals')) return 'Open Listing Approvals';
  if (route.includes('development-approvals')) return 'Open Development Approvals';
  return 'Open operational record';
}

/* ────────────────────────────────────────────────
   Today
   ──────────────────────────────────────────────── */

export default function Today() {
  const { data: attentionData, isLoading: attentionLoading } =
    trpc.founder.getAttentionCandidates.useQuery();
  const { data: metrics, isLoading: metricsLoading } =
    trpc.founder.getDashboardMetrics.useQuery();

  const items = attentionData?.items ?? [];
  const topPriorities = items.slice(0, 3);

  const [selected, setSelected] = useState<SelectedItem>(null);

  // Close panel if selected item disappears on refresh
  useEffect(() => {
    if (selected && items.length > 0 && !items.some(i => i.id === selected.id && i.source === selected.source)) {
      setSelected(null);
    }
  }, [items, selected]);

  // Escape key closes panel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setSelected(null);
  }, []);
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Today</h1>
        <p className="text-slate-500 text-sm mt-1">
          What is the best use of your time today?
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase">Pending Approvals</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {metricsLoading ? '—' : (metrics?.pendingApprovals.agents ?? 0) + (metrics?.pendingApprovals.listings ?? 0) + (metrics?.pendingApprovals.developments ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase">Attention Items</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {attentionLoading ? '—' : items.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase">Active Agents</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {metricsLoading ? '—' : metrics?.cockpit.activeAgents ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase">Active Listings</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {metricsLoading ? '—' : metrics?.cockpit.activeListings ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content: priorities + right column */}
      <div className="flex gap-6 items-start">
        {/* Priorities — main area */}
        <div className={`flex-1 min-w-0 ${selected ? 'lg:max-w-[60%]' : ''}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Today's Priorities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attentionLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-slate-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-48" />
                        <div className="h-3 bg-slate-200 rounded w-64" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : topPriorities.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No urgent priorities right now</p>
                  <p className="text-xs text-slate-400 mt-1">
                    This will populate as attention candidates appear
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topPriorities.map((item, idx) => {
                    const isSelected = selected?.id === item.id && selected?.source === item.source;
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        onClick={() => setSelected(isSelected ? null : { id: item.id, type: item.type, source: item.source, urgency: item.urgency })}
                        className={`flex items-start gap-4 p-3 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-blue-200 bg-blue-50/80'
                            : 'border-slate-100 hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Rank */}
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-blue-700">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Badges */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG]?.color ?? 'bg-slate-100 text-slate-600'}`}>
                              {TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG]?.label ?? item.type}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                              <span className={`w-1.5 h-1.5 rounded-full ${URGENCY_DOT[item.urgency] ?? 'bg-slate-400'}`} />
                              {item.urgency}
                            </span>
                          </div>
                          {/* Title */}
                          <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                          {/* Summary */}
                          <p className="text-xs text-slate-500 mt-0.5">{item.summary}</p>
                          {/* Why it matters */}
                          {item.whyItMatters && (
                            <p className="text-xs text-slate-600 mt-1 italic">{item.whyItMatters}</p>
                          )}
                          {/* Meta row */}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px]">
                              {item.workstream}
                            </Badge>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.waitingHours > 0
                                ? item.waitingHours < 24
                                  ? `${item.waitingHours}h waiting`
                                  : `${Math.floor(item.waitingHours / 24)}d waiting`
                                : 'pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — detail panel or future placeholders */}
        <div className="hidden lg:block w-[40%] flex-shrink-0">
          {selected ? (
            <PriorityDetailPanel
              selected={selected}
              onClose={() => setSelected(null)}
            />
          ) : (
            <FutureCapabilities />
          )}
        </div>
      </div>

      {/* Mobile detail overlay */}
      {selected && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white overflow-y-auto">
          <PriorityDetailPanel
            selected={selected}
            onClose={() => setSelected(null)}
            isMobile
          />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Future Capabilities (compact placeholders)
   ──────────────────────────────────────────────── */

function FutureCapabilities() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <CalendarCheck className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs text-slate-500">Active Projects — Not available</span>
      </div>
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs text-slate-500">AI Today Brief — Not connected</span>
      </div>
      <div className="flex items-center gap-2 px-1">
        <Activity className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs text-slate-500">Focus Balance — Not connected</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Priority Detail Panel
   ──────────────────────────────────────────────── */

function PriorityDetailPanel({
  selected,
  onClose,
  isMobile = false,
}: {
  selected: NonNullable<SelectedItem>;
  onClose: () => void;
  isMobile?: boolean;
}) {
  const detailType = toDetailType(selected);
  const detailQuery = trpc.founder.getAttentionDetail.useQuery(
    { type: detailType!, id: selected.id },
    { enabled: detailType !== null },
  );

  const detail = detailQuery.data;
  const isLoading = detailQuery.isLoading;

  if (detailType === null) {
    return (
      <Card className={isMobile ? 'min-h-screen rounded-none' : 'sticky top-6'}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Detail unavailable</h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-sm text-slate-500">Cannot load detail for this attention item.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={isMobile ? 'min-h-screen rounded-none' : 'sticky top-6'}>
        <CardContent className="p-6 space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-slate-200 rounded w-32" />
            <div className="h-4 bg-slate-200 rounded w-48" />
            <div className="h-20 bg-slate-100 rounded" />
            <div className="h-16 bg-slate-100 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card className={isMobile ? 'min-h-screen rounded-none' : 'sticky top-6'}>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-slate-500">Detail unavailable</p>
          <button onClick={onClose} className="mt-3 text-xs text-blue-600 hover:underline">Close</button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isMobile ? 'min-h-screen rounded-none' : 'sticky top-6'}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_CONFIG[selected.type as keyof typeof TYPE_CONFIG]?.color ?? TYPE_CONFIG.escalation.color}`}>
                {TYPE_CONFIG[selected.type as keyof typeof TYPE_CONFIG]?.label ?? selected.type} · {selected.urgency}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {detail.kind === 'entity'
                ? `Developer lead: ${detail.lead.name}`
                : detail.type === 'agent_approval'
                  ? `${detail.summary.totalPending} agent registration${detail.summary.totalPending === 1 ? '' : 's'} pending approval`
                  : detail.type === 'listing_approval'
                    ? `${detail.summary.totalPending} listing${detail.summary.totalPending === 1 ? '' : 's'} pending review`
                    : `${detail.summary.totalPending} development${detail.summary.totalPending === 1 ? '' : 's'} awaiting approval`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* What happened */}
          <Section title="What happened">
            {detail.kind === 'entity' ? (
              <p className="text-xs text-slate-600 leading-relaxed">
                {detail.lead.name} submitted {/^[aeiou]/i.test(detail.lead.leadType?.replace('_', ' ') ?? '') ? 'an' : 'a'}{' '}
                {detail.lead.leadType?.replace('_', ' ') ?? 'inquiry'}
                {detail.development ? ` for ${detail.development.name}` : ''}.
                The lead is <strong>{detail.lead.status?.replace('_', ' ')}</strong>
                {detail.lead.waitingHours > 0
                  ? ` and has been waiting ${detail.lead.waitingHours} hour${detail.lead.waitingHours === 1 ? '' : 's'}.`
                  : '.'}
              </p>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                {detail.type === 'agent_approval'
                  ? `${detail.summary.totalPending} agent registration${detail.summary.totalPending > 1 ? 's are' : ' is'} awaiting platform approval.`
                  : detail.type === 'listing_approval'
                    ? `${detail.summary.totalPending} listing${detail.summary.totalPending > 1 ? 's are' : ' is'} awaiting verification.`
                    : `${detail.summary.totalPending} development submission${detail.summary.totalPending > 1 ? 's are' : ' is'} pending platform review.`}
              </p>
            )}
          </Section>

          {/* Why you're seeing this */}
          <Section title="Why you're seeing this">
            {detail.kind === 'entity' ? (
              <p className="text-xs text-slate-600 leading-relaxed">
                This developer lead has a qualification score of {detail.lead.qualificationScore}/100
                and is in the platform attention queue as a new inquiry requiring response.
              </p>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                {detail.type === 'agent_approval'
                  ? 'Agent registrations are currently pending in the platform review queue.'
                  : detail.type === 'listing_approval'
                    ? 'Property listings are pending verification in the approval queue.'
                    : 'Developer submissions are pending review in the platform approval queue.'}
              </p>
            )}
          </Section>

          {/* Context */}
          <Section title="Context">
            {detail.kind === 'entity' ? (
              <div className="space-y-1.5 text-xs text-slate-600">
                <ContextRow label="Status" value={detail.lead.status?.replace('_', ' ')} />
                <ContextRow label="Lead type" value={detail.lead.leadType?.replace('_', ' ')} />
                {detail.lead.source && <ContextRow label="Source" value={detail.lead.source} />}
                <ContextRow label="Qualification" value={`${detail.lead.qualificationScore}/100`} />
                {detail.lead.qualificationStatus && (
                  <ContextRow label="Qualification status" value={detail.lead.qualificationStatus.replace('_', ' ')} />
                )}
                <ContextRow label="Created" value={formatTimestamp(detail.lead.createdAt)} />
                <ContextRow label="Waiting" value={formatWaiting(detail.lead.waitingHours)} />
                {detail.lead.firstRespondedAt && (
                  <ContextRow label="First response" value={formatTimestamp(detail.lead.firstRespondedAt)} />
                )}
                {detail.development && (
                  <ContextRow label="Development" value={`${detail.development.name} — ${detail.development.city}`} />
                )}
              </div>
            ) : (
              <div className="space-y-1.5 text-xs text-slate-600">
                <ContextRow label="Total pending" value={String(detail.summary.totalPending)} />
                {detail.summary.oldestWaitingSince && (
                  <ContextRow label="Oldest submission" value={formatTimestamp(detail.summary.oldestWaitingSince)} />
                )}
                {detail.summary.oldestWaitingHours !== null && (
                  <ContextRow label="Longest wait" value={formatWaiting(detail.summary.oldestWaitingHours)} />
                )}
              </div>
            )}
          </Section>

          {/* Preview (aggregate only) */}
          {detail.kind === 'aggregate' && detail.preview && detail.preview.length > 0 && (
            <Section title="Oldest pending">
              <div className="space-y-2">
                {detail.preview.map((item: any) => (
                  <div key={item.id} className="p-2 rounded bg-slate-50 text-xs">
                    <p className="font-medium text-slate-800 truncate">
                      {item.name || item.title}
                    </p>
                    <p className="text-slate-500 truncate">
                      {item.city && `${item.city} · `}
                      {formatWaiting(item.waitingHours)}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {detail.kind === 'aggregate' && detail.previewUnavailable && (
            <Section title="Oldest pending">
              <p className="text-xs text-slate-400 italic">Preview unavailable</p>
            </Section>
          )}

          {/* Ownership */}
          <Section title="Operational ownership">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>{detail.ownership.ownerLabel}</span>
            </div>
          </Section>

          {/* Suggested next action */}
          <Section title="Suggested next action">
            <p className="text-xs text-slate-600">{detail.suggestedAction}</p>
          </Section>

          {/* Action button */}
          {detail.operationalRoute && (
            <a
              href={detail.operationalRoute}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {operationalRouteLabel(detail.operationalRoute)}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{title}</h4>
      {children}
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}
