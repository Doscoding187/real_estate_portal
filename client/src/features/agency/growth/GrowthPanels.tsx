import { Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 as BarChartIcon, Compass as CompassIcon, Target as TargetIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { EmptyPanel, SectionTitle } from '../workspace/WorkspacePrimitives';
import type { WorkspaceContentProps } from '../workspace/types';
import { numberLabel, percent } from '../workspace/utils';

export function AgencyGrowthWorkspace(props: WorkspaceContentProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
      <SourcePerformancePanel data={props.sourceEfficiencyData} />
      <DemandHeatmapPanel data={props.suburbHeatmapData} maxViews={props.maxSuburbViews} />
    </section>
  );
}

export function SourcePerformancePanel({
  data,
}: {
  data: WorkspaceContentProps['sourceEfficiencyData'];
}) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle icon={BarChartIcon} title="Source Mix" eyebrow="Leads by source" />
      </CardHeader>
      <CardContent>
        {data.length ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="source" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis yAxisId="leads" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="leads" dataKey="leads" name="Leads" fill="#0f766e" radius={[8, 8, 2, 2]} maxBarSize={44} />
                <Bar yAxisId="leads" dataKey="hot" name="Hot leads" fill="#f59e0b" radius={[8, 8, 2, 2]} maxBarSize={24} />
                <Bar yAxisId="leads" dataKey="converted" name="Won leads" fill="#0f172a" radius={[8, 8, 2, 2]} maxBarSize={18} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyPanel icon={TargetIcon} title="No source data yet" text="Lead source activity will appear once enquiries are captured." />
        )}
      </CardContent>
    </Card>
  );
}

export function DemandHeatmapPanel({
  data,
  maxViews,
}: {
  data: WorkspaceContentProps['suburbHeatmapData'];
  maxViews: number;
}) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle icon={CompassIcon} title="Demand Heatmap" eyebrow="Property views by area" />
      </CardHeader>
      <CardContent>
        {data.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.map(item => {
              const intensity = Math.max(0.12, Math.min(0.92, item.views / maxViews));
              return (
                <div
                  key={item.suburb}
                  className="rounded-lg border border-slate-200 p-4"
                  style={{
                    background: `linear-gradient(135deg, rgba(15, 118, 110, ${intensity}) 0%, rgba(255,255,255,0.96) 72%)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{item.suburb}</p>
                      <p className="mt-1 text-sm text-slate-600">{numberLabel(item.leads)} enquiries</p>
                    </div>
                    <Badge className="border-white/70 bg-white/80 text-slate-800">{numberLabel(item.views)}</Badge>
                  </div>
                  <Progress value={percent(item.views, maxViews)} className="mt-4 bg-white/55" indicatorClassName="bg-slate-950" />
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyPanel icon={CompassIcon} title="No demand geography yet" text="Listing views and enquiries will populate area demand once inventory receives traffic." />
        )}
      </CardContent>
    </Card>
  );
}
