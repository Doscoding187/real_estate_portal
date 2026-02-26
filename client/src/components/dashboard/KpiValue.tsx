import { cn } from '@/lib/utils';

export type KpiStatus = 'real' | 'coming_soon' | 'unavailable';

interface KpiValueProps {
  value?: number | string | null;
  status: KpiStatus;
  hint?: string;
  className?: string;
  emptyLabel?: string;
  comingSoonLabel?: string;
}

export function KpiValue({
  value,
  status,
  hint,
  className,
  emptyLabel = '--',
  comingSoonLabel = 'Coming soon',
}: KpiValueProps) {
  if (status === 'coming_soon') {
    return (
      <span className={cn(className, 'text-muted-foreground')} title={hint}>
        {comingSoonLabel}
      </span>
    );
  }

  if (status === 'real' && value !== null && value !== undefined && String(value).trim() !== '') {
    return (
      <span className={className} title={hint}>
        {value}
      </span>
    );
  }

  return (
    <span className={cn(className, 'text-muted-foreground')} title={hint}>
      {emptyLabel}
    </span>
  );
}
