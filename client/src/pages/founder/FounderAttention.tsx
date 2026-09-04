import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, ExternalLink, Inbox } from 'lucide-react';

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

function formatWaiting(hours: number): string {
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FounderAttention() {
  const { data, isLoading } = trpc.founder.getAttentionCandidates.useQuery();
  const items = data?.items ?? [];

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

      {/* Priority Queue */}
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

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex items-start gap-4 p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors"
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

                    {/* Source link */}
                    {item.sourceReference && (
                      <a
                        href={item.sourceReference}
                        className="mt-1 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View in source system"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
