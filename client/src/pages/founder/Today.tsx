import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarCheck,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Sparkles,
} from 'lucide-react';

export default function Today() {
  const { data: attentionData, isLoading: attentionLoading } =
    trpc.founder.getAttentionCandidates.useQuery();
  const { data: metrics, isLoading: metricsLoading } =
    trpc.founder.getDashboardMetrics.useQuery();

  const items = attentionData?.items ?? [];
  const topPriorities = items.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Today</h1>
        <p className="text-slate-500 text-sm mt-1">
          What is the best use of your time today?
        </p>
      </div>

      {/* Strategic Context */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase">Pending Actions</p>
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
              {metricsLoading ? '—' : metrics?.platform.totalAgents ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase">Active Listings</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {metricsLoading ? '—' : metrics?.platform.activeListings ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Priorities */}
        <Card className="lg:col-span-2">
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
                {topPriorities.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex items-start gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-700">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{item.summary}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {item.workstream}
                        </Badge>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.waitingHours < 24
                            ? `${item.waitingHours}h waiting`
                            : `${Math.floor(item.waitingHours / 24)}d waiting`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Active Projects — Not connected */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-slate-400" />
                Active Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Not yet connected</p>
                <p className="text-[10px] text-slate-300 mt-1">
                  Project tracking infrastructure coming in a future phase
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Brief — Not connected */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                AI Today Brief
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <Sparkles className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">AI brief not connected</p>
                <p className="text-[10px] text-slate-300 mt-1">
                  Intelligence layer will be built in a future phase
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Build vs Growth Balance — Not connected */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Focus Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Balance tracking not connected</p>
                <p className="text-[10px] text-slate-300 mt-1">
                  Activity categorisation not yet available
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
