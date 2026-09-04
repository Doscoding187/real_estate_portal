import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, Server, Database, Megaphone, CreditCard, Settings, X, ExternalLink } from 'lucide-react';

const FOUNDATION_ICONS = {
  technology: Server,
  data: Database,
  marketing: Megaphone,
  payments: CreditCard,
  operations: Settings,
} as const;

type NodeId = 'agents' | 'agencies' | 'developers' | 'buyers' | 'shared_living';

const NODE_LABELS: Record<NodeId, string> = {
  agents: 'Agents',
  agencies: 'Agencies',
  developers: 'Developers',
  buyers: 'Buyers',
  shared_living: 'Shared Living',
};

function getNodeScaleLabel(nodeId: NodeId): string {
  if (nodeId === 'agents') return 'approved';
  if (nodeId === 'agencies') return 'verified';
  if (nodeId === 'developers') return 'approved';
  if (nodeId === 'buyers') return 'registered';
  if (nodeId === 'shared_living') return 'published';
  return 'active';
}

function getNodeScaleValue(node: any): number {
  if (node.id === 'agents') return node.approved ?? 0;
  if (node.id === 'agencies') return node.verified ?? 0;
  if (node.id === 'developers') return node.approved ?? 0;
  if (node.id === 'buyers') return node.registered ?? 0;
  if (node.id === 'shared_living') return node.published ?? 0;
  return 0;
}

/** Map raw detail value keys to founder-readable labels */
function getDetailValueLabel(key: string): string {
  const labels: Record<string, string> = {
    approved: 'Approved',
    verified: 'Verified',
    registered: 'Registered',
    published: 'Published',
    total: 'Total',
    agentsCount: 'Agents',
    listingsCount: 'Listings',
    leadsCount: 'Leads',
    commissionsPendingCount: 'Pending commissions',
    commissionsPaidTotal: 'Paid commission value',
    spacesCount: 'Spaces',
    availableSpacesCount: 'Available spaces',
    savedSearchesCount: 'Saved searches',
    favoritesCount: 'Favourites',
    recentlyViewedCount: 'Recently viewed',
  };
  return labels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

export default function CompanyMap() {
  const { data, isLoading } = trpc.founder.getCompanyMapData.useQuery();
  const nodes = data?.nodes ?? [];
  const foundations = data?.foundations;

  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);

  const detailQuery = trpc.founder.getCompanyNodeDetail.useQuery(
    { nodeId: selectedNodeId! },
    { enabled: selectedNodeId !== null },
  );
  const detail = detailQuery.data;
  const detailLoading = detailQuery.isLoading;

  useEffect(() => {
    if (selectedNodeId && nodes.length > 0 && !nodes.some(n => n.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setSelectedNodeId(null);
  }, []);
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Map</h1>
        <p className="text-slate-500 text-sm mt-1">
          Structural view of the business ecosystem — where does the company have presence, scale, and movement?
        </p>
      </div>

      {/* Marketplace Core */}
      <div className="flex justify-center">
        <Card className="w-64 border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Map className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Property Listify</h3>
            <p className="text-xs text-slate-500">Marketplace Core</p>
          </CardContent>
        </Card>
      </div>

      {/* Ecosystem Nodes + Detail Panel */}
      <div className="flex gap-6 items-start">
        <div className={`flex-1 min-w-0 ${selectedNodeId ? 'lg:max-w-[60%]' : ''}`}>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Ecosystem
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-slate-200 rounded w-20" />
                      <div className="h-6 bg-slate-200 rounded w-12" />
                      <div className="h-3 bg-slate-200 rounded w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {nodes.map(node => {
                const isSelected = selectedNodeId === node.id;
                const scaleValue = getNodeScaleValue(node);
                const scaleLabel = getNodeScaleLabel(node.id);

                return (
                  <Card
                    key={node.id}
                    onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-200 bg-blue-50/80'
                        : 'hover:border-slate-300'
                    }`}
                  >
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-slate-900 mb-2">{node.label}</h3>

                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-slate-900">{scaleValue}</span>
                          <span className="text-xs text-slate-400">{scaleLabel}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{node.total} total</span>
                          {node.newInPeriod > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-600 font-medium">+{node.newInPeriod} new</span>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel — Desktop */}
        {selectedNodeId && (
          <div className="hidden lg:block w-[40%] flex-shrink-0">
            <NodeDetailPanel
              detail={detail}
              isLoading={detailLoading}
              onClose={() => setSelectedNodeId(null)}
            />
          </div>
        )}
      </div>

      {/* Detail Panel — Mobile */}
      {selectedNodeId && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white overflow-y-auto">
          <NodeDetailPanel
            detail={detail}
            isLoading={detailLoading}
            onClose={() => setSelectedNodeId(null)}
            isMobile
          />
        </div>
      )}

      {/* Ecosystem Foundations */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Ecosystem Foundations
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-16" />
                    <div className="h-3 bg-slate-200 rounded w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : foundations ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.entries(foundations) as Array<[string, { status: string; label: string }]>).map(
              ([key, foundation]) => {
                const Icon = FOUNDATION_ICONS[key as keyof typeof FOUNDATION_ICONS] ?? Server;

                return (
                  <Card key={key}>
                    <CardContent className="p-3 text-center">
                      <Icon className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-xs font-medium text-slate-600 mb-1">{foundation.label}</p>
                      <span className="text-[10px] text-slate-400">Signal not connected</span>
                    </CardContent>
                  </Card>
                );
              },
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">Foundation data unavailable</p>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Node Detail Panel
   ──────────────────────────────────────────────── */

function NodeDetailPanel({
  detail,
  isLoading,
  onClose,
  isMobile = false,
}: {
  detail: any;
  isLoading: boolean;
  onClose: () => void;
  isMobile?: boolean;
}) {
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
          <h3 className="text-sm font-semibold text-slate-900">
            {NODE_LABELS[detail.type as NodeId] ?? detail.type}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Empty state */}
          {detail.emptyState && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-amber-800">{detail.emptyState}</p>
            </div>
          )}

          {/* Scale */}
          <Section title="Scale">
            <div className="space-y-1.5 text-xs text-slate-600">
              {Object.entries(detail.scale).map(([key, value]) => (
                <ContextRow key={key} label={getDetailValueLabel(key)} value={String(value)} />
              ))}
            </div>
          </Section>

          {/* Movement */}
          <Section title="Movement">
            <div className="space-y-1.5 text-xs text-slate-600">
              <ContextRow label="New in last 30 days" value={String(detail.movement.newInPeriod)} />
            </div>
          </Section>

          {/* Value */}
          {detail.value && Object.keys(detail.value).length > 0 && (
            <Section title="Value">
              <div className="space-y-1.5 text-xs text-slate-600">
                {Object.entries(detail.value).map(([key, value]) => (
                  <ContextRow
                    key={key}
                    label={getDetailValueLabel(key)}
                    value={key === 'commissionsPaidTotal'
                      ? `R ${((value as number) / 100).toLocaleString()} (lifetime)`
                      : String(value)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Note */}
          {detail.note && (
            <Section title="Note">
              <p className="text-xs text-slate-500 italic">{detail.note}</p>
            </Section>
          )}

          {/* Action button */}
          {detail.operationalRoute && (
            <a
              href={detail.operationalRoute}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Open {NODE_LABELS[detail.type as NodeId] ?? detail.type} Admin
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
