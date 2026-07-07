import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, LineChart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { EmptyPanel, SectionTitle } from '../workspace/WorkspacePrimitives';
import type { WorkspaceContentProps } from '../workspace/types';

export function AgencyReportingWorkspace(props: WorkspaceContentProps) {
  const metricColor = { leads: '#0f766e', listings: '#0369a1', sales: '#16a34a' }[
    props.selectedMetric
  ];
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle
          icon={LineChart}
          title="Six-Month Performance"
          eyebrow="Historical reporting"
          action={
            <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
              {(['leads', 'listings', 'sales'] as const).map(metric => (
                <button
                  key={metric}
                  type="button"
                  onClick={() => props.setSelectedMetric(metric)}
                  className={cn(
                    'rounded px-3 py-1.5 text-sm font-medium capitalize text-slate-500',
                    props.selectedMetric === metric && 'bg-white text-slate-950 shadow-sm',
                  )}
                >
                  {metric}
                </button>
              ))}
            </div>
          }
        />
      </CardHeader>
      <CardContent>
        {props.performance.length ? (
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={props.performance}
                margin={{ top: 10, right: 18, left: -18, bottom: 0 }}
                onClick={(event: any) => {
                  if (event?.activeLabel) props.setSelectedReportMonth(event.activeLabel);
                }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey={props.selectedMetric} radius={[8, 8, 2, 2]} maxBarSize={54}>
                  {props.performance.map(item => (
                    <Cell
                      key={item.month}
                      fill={item.month === props.activeReportMonth ? metricColor : '#ccfbf1'}
                      stroke={metricColor}
                      strokeWidth={item.month === props.activeReportMonth ? 2 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyPanel icon={BarChart3} title="No reporting data yet" text="Historical charts will populate once activity is recorded." />
        )}
      </CardContent>
    </Card>
  );
}
