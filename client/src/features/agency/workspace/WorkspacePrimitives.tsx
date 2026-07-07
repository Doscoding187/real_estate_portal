import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Tone } from './types';
import { toneClasses } from './utils';

export function SectionTitle({
  icon: Icon,
  title,
  eyebrow,
  action,
}: {
  icon: LucideIcon;
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const classes = toneClasses(tone);
  return (
    <Card className="min-w-0 border-slate-200 bg-white shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', classes.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-sm leading-5 text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function EmptyPanel({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

export function ErrorPanel({ title = 'Workspace data could not be loaded' }: { title?: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{title}</span>
      </div>
    </div>
  );
}
