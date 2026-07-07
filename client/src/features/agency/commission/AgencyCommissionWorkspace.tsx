import { CircleDollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { EmptyPanel, SectionTitle } from '../workspace/WorkspacePrimitives';
import type { CommissionStats, Tone, WorkspaceContentProps } from '../workspace/types';
import { compactCurrency, percent, toneClasses } from '../workspace/utils';

export function AgencyCommissionWorkspace(props: WorkspaceContentProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <CommissionSummary commission={props.commission} />
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <SectionTitle icon={CircleDollarSign} title="Monthly Commission Detail" eyebrow="Six-month history" />
        </CardHeader>
        <CardContent className="space-y-3">
          {props.commission.monthlyBreakdown.map(month => (
            <div key={month.month}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">{month.month}</span>
                <span className="text-slate-500">{compactCurrency(month.earnings)}</span>
              </div>
              <Progress
                value={percent(month.earnings, Math.max(...props.commission.monthlyBreakdown.map(item => item.earnings), 1))}
                indicatorClassName="bg-emerald-600"
              />
            </div>
          ))}
          {!props.commission.monthlyBreakdown.length ? (
            <EmptyPanel icon={CircleDollarSign} title="No commission records" text="Commission entries will populate after transactions are tracked." />
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export function CommissionSummary({ commission }: { commission: CommissionStats }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle icon={CircleDollarSign} title="Commission Forecast" eyebrow="Commercial pipeline" />
      </CardHeader>
      <CardContent className="grid gap-3">
        {[
          { label: 'Total', value: commission.totalEarnings, tone: 'slate' as Tone },
          { label: 'Paid', value: commission.paidCommissions, tone: 'emerald' as Tone },
          { label: 'Pending', value: commission.pendingCommissions, tone: 'amber' as Tone },
        ].map(item => (
          <div key={item.label} className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className={cn('mt-2 text-xl font-semibold', toneClasses(item.tone).text)}>
              {compactCurrency(item.value)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
