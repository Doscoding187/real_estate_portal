import React from 'react';
import { useLocation } from 'wouter';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clapperboard,
  ImageOff,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 pt-6">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = ['#2563eb', '#0f766e', '#9333ea', '#f97316', '#e11d48', '#64748b'];

const DiscoveryOpsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { data, isLoading, error, refetch } = trpc.admin.getDiscoveryOpsReport.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-20 pt-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/analytics')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Discovery Ops</h1>
            <p className="text-slate-500">Operational visibility for discovery content and engagement.</p>
          </div>
        </div>

        <Card className="border-red-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <div>
              <p className="text-lg font-semibold text-slate-950">Could not load discovery ops</p>
              <p className="mt-1 text-sm text-slate-500">
                Retry the report or return to the wider analytics dashboard.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => void refetch()}>Retry report</Button>
              <Button variant="outline" onClick={() => setLocation('/admin/analytics')}>
                Back to analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-20 pt-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/analytics')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Discovery Ops</h1>
            <p className="text-slate-500">Operational visibility for discovery content and engagement.</p>
          </div>
        </div>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-slate-400" />
            <div>
              <p className="text-lg font-semibold text-slate-950">No discovery ops data yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Publish discovery content or wait for engagement events to start populating this report.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = data.summary;
  const inventoryByContentType = data.inventoryByContentType;
  const inventoryByCreatorType = data.inventoryByCreatorType;
  const engagementByAction7d = data.engagementByAction7d;
  const publishingTrend14d = data.publishingTrend14d;
  const health = data.health;
  const healthAlerts = data.healthAlerts;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20 pt-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/analytics')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Discovery Ops</h1>
            <p className="text-slate-500">
              Monitor discovery inventory health, engagement flow, and publishing momentum.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
          Super admin
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Clapperboard className="h-5 w-5" />}
          label="Active discovery content"
          value={summary?.activeContent ?? 0}
          hint={`${summary?.videosReady ?? 0} items have video media`}
        />
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Active creators"
          value={summary?.activeCreators ?? 0}
          hint={`${summary?.featuredContent ?? 0} featured items live`}
        />
        <MetricCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Events last 7 days"
          value={summary?.engagementEvents7d ?? 0}
          hint={`Completion ${formatPercent(summary?.completionRate7d ?? 0)}`}
        />
        <MetricCard
          icon={<Share2 className="h-5 w-5" />}
          label="Save / share rate"
          value={`${formatPercent(summary?.saveRate7d ?? 0)} / ${formatPercent(summary?.shareRate7d ?? 0)}`}
          hint="Rates are measured against 7-day views"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Inventory By Content Type</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryByContentType}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                  {inventoryByContentType.map((entry, index) => (
                    <Cell key={entry.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Engagement Actions Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementByAction7d} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" width={110} dataKey="label" />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 8, 8, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Publishing Trend Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={publishingTrend14d}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f766e" radius={[8, 8, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Content Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Missing thumbnails</span>
                <span className="text-xl font-semibold text-slate-950">{health?.missingThumbnail ?? 0}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Missing videos</span>
                <span className="text-xl font-semibold text-slate-950">{health?.missingVideo ?? 0}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Missing titles</span>
                <span className="text-xl font-semibold text-slate-950">{health?.missingTitle ?? 0}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700">Featured without media</span>
                <span className="text-xl font-semibold text-amber-900">{health?.featuredWithoutMedia ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Discovery Health Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthAlerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-5 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <span>No active discovery content is currently flagged for missing core metadata.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {healthAlerts.map(alert => (
                <div
                  key={alert.contentId}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{alert.title}</p>
                      <Badge variant="outline">{alert.contentType}</Badge>
                      <Badge variant="outline">{alert.creatorType}</Badge>
                      {alert.isFeatured ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Featured</Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {alert.issues.map(issue => (
                        <Badge key={issue} variant="secondary" className="bg-red-50 text-red-700">
                          {issue === 'Missing thumbnail' ? <ImageOff className="mr-1 h-3.5 w-3.5" /> : null}
                          {issue === 'Featured without media' ? <Sparkles className="mr-1 h-3.5 w-3.5" /> : null}
                          {issue}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : 'Unknown publish date'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Inventory By Creator Type</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {inventoryByCreatorType.map(item => (
            <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm capitalize text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{item.count}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default DiscoveryOpsPage;
