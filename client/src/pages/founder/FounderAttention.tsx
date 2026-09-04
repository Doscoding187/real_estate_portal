import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Inbox,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  User,
} from 'lucide-react';

const TYPE_CONFIG = {
  decision: { label: 'Decision', color: 'bg-red-100 text-red-700' },
  opportunity: { label: 'Opportunity', color: 'bg-emerald-100 text-emerald-700' },
  escalation: { label: 'Escalation', color: 'bg-amber-100 text-amber-700' },
  awareness: { label: 'Awareness', color: 'bg-blue-100 text-blue-700' },
} as const;

const URGENCY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-500' },
  high: { label: 'High', color: 'bg-amber-500' },
  medium: { label: 'Medium', color: 'bg-blue-500' },
  low: { label: 'Low', color: 'bg-slate-400' },
} as const;

const DETAIL_STATUS_ICONS: Record<string, React.ElementType> = {
  operational: CheckCircle2,
  degraded: AlertCircle,
  unavailable: XCircle,
};

function formatWaiting(hours: number): string {
  if (hours < 1) return 'Just now';
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

export default function FounderAttention() {
  const { data, isLoading } = trpc.founder.getAttentionCandidates.useQuery();
  const items = data?.items ?? [];

  const [selected, setSelected] = useState<SelectedItem>(null);

  // Close panel if selected item disappears on refresh
  useEffect(() => {
    if (selected && items.length > 0 && !items.some(i => i.id === selected.id && i.type === selected.type)) {
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

  const decisions = items.filter(i => i.type === 'decision');
  const opportunities = items.filter(i => i.type === 'opportunity');
  const escalations = items.filter(i => i.type === 'escalation');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Founder Attention</h1>
        <p className="text-slate-500 text-sm mt-1">
          Attention candidates — items that may require your judgment or awareness.
        </p>
        <p className="text-xs text-slate-400 mt-1 italic">
          These are derived from existing platform signals. No automated attention engine is
          operating yet.
        </p>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-4 gap-3">
        {(['critical', 'high', 'medium', 'low'] as const).map(urgency => {
          const count = items.filter(i => i.urgency === urgency).length;
          return (
            <Card key={urgency}>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${URGENCY_CONFIG[urgency].color}`} />
                  <span className="text-xs font-medium text-slate-500 uppercase">
                    {URGENCY_CONFIG[urgency].label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main content: list + detail panel */}
      <div className="flex gap-6 items-start">
        {/* Priority Queue */}
        <div className={`flex-1 min-w-0 ${selected ? 'lg:max-w-[60%]' : ''}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Priority Queue ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                      <div className="w-2 h-2 bg-slate-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-48" />
                        <div className="h-3 bg-slate-200 rounded w-64" />
                      </div>
                      <div className="h-5 bg-slate-200 rounded w-16" />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No attention items</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Nothing currently requires your attention
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const typeCfg = TYPE_CONFIG[item.type];
                    const urgencyCfg = URGENCY_CONFIG[item.urgency];
                    const isSelected = selected?.id === item.id && selected?.type === item.type;

                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        onClick={() => setSelected({ id: item.id, type: item.type, source: item.source, urgency: item.urgency })}
                        className={`flex items-start gap-4 p-3 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-blue-200 bg-blue-50/80'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Urgency dot */}
                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${urgencyCfg.color}`} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-slate-900 truncate">
                              {item.title}
                            </h3>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeCfg.color}`}>
                              {typeCfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1">{item.summary}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                            <span>{item.workstream}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{formatWaiting(item.waitingHours)}</span>
                          </div>
                        </div>

                        {/* Chevron */}
                        <ChevronRight className={`mt-1 h-4 w-4 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-slate-300'}`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="hidden lg:block w-[40%] flex-shrink-0">
            <DetailPanel
              selected={selected}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      {/* Mobile detail overlay */}
      {selected && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white overflow-y-auto">
          <DetailPanel
            selected={selected}
            onClose={() => setSelected(null)}
            isMobile
          />
        </div>
      )}

      {/* Classification sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ClassificationSection
          title="Decisions Required"
          items={decisions}
          emptyText="No decisions pending"
        />
        <ClassificationSection
          title="Opportunities"
          items={opportunities}
          emptyText="No opportunities detected"
        />
        <ClassificationSection
          title="Escalations"
          items={escalations}
          emptyText="No escalations"
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Detail Panel
   ──────────────────────────────────────────────── */

function DetailPanel({
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
              {detail.kind === 'entity' && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_CONFIG.escalation.color}`}>
                  {TYPE_CONFIG.escalation.label} · {URGENCY_CONFIG[selected.urgency]?.label ?? selected.urgency}
                </span>
              )}
              {detail.kind === 'aggregate' && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_CONFIG.escalation.color}`}>
                  {TYPE_CONFIG.escalation.label} · {URGENCY_CONFIG[selected.urgency]?.label ?? selected.urgency}
                </span>
              )}
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

function ClassificationSection({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{ id: number; title: string; summary: string; urgency: string; workstream: string }>;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-slate-500 uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="p-2 rounded-lg bg-slate-50">
                <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                <p className="text-xs text-slate-500 truncate">{item.summary}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
