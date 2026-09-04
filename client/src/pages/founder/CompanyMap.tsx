import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Map, ArrowRight, Server, Database, Megaphone, CreditCard, Settings } from 'lucide-react';

const STATUS_STYLE = {
  healthy: { label: 'Healthy', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  attention: { label: 'Attention', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  at_risk: { label: 'At Risk', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  not_connected: { label: 'Not yet connected', dot: 'bg-slate-300', text: 'text-slate-500', bg: 'bg-slate-50' },
} as const;

const FOUNDATION_ICONS = {
  technology: Server,
  data: Database,
  marketing: Megaphone,
  payments: CreditCard,
  operations: Settings,
} as const;

export default function CompanyMap() {
  const { data, isLoading } = trpc.founder.getCompanyMapData.useQuery();
  const nodes = data?.nodes ?? [];
  const foundations = data?.foundations;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Map</h1>
        <p className="text-slate-500 text-sm mt-1">
          Visual view of the business ecosystem — where is the company structurally strong or
          blocked?
        </p>
        <p className="text-xs text-slate-400 mt-1 italic">
          Health scores and flow indicators are not yet available. This shows real ecosystem counts.
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

      {/* Ecosystem Nodes */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Ecosystem
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {nodes.map(node => {
              const statusStyle = STATUS_STYLE[node.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.attention;

              return (
                <Card key={node.id} className="hover:border-slate-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-900">{node.label}</h3>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                        <span className={`text-[10px] font-medium ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-slate-900">{node.active}</span>
                        <span className="text-xs text-slate-400">active</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{node.total} total</span>
                        {node.growth > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 font-medium">+{node.growth} new</span>
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

      {/* Connections — Visual placeholder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-500 uppercase">
            Value Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 py-6 text-slate-400">
            <span className="text-sm">Agents</span>
            <ArrowRight className="h-4 w-4" />
            <span className="text-sm">Listings</span>
            <ArrowRight className="h-4 w-4" />
            <span className="text-sm">Leads</span>
            <ArrowRight className="h-4 w-4" />
            <span className="text-sm">Revenue</span>
          </div>
          <p className="text-center text-xs text-slate-400 italic">
            Flow mapping — not yet connected
          </p>
        </CardContent>
      </Card>

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
                const statusStyle =
                  STATUS_STYLE[foundation.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.not_connected;

                return (
                  <Card key={key}>
                    <CardContent className="p-3 text-center">
                      <Icon className="h-5 w-5 text-slate-500 mx-auto mb-1.5" />
                      <p className="text-xs font-medium text-slate-700 mb-1">{foundation.label}</p>
                      <div className="flex items-center justify-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        <span className={`text-[10px] font-medium ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                      </div>
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
