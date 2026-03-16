import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageShell — standard page container with consistent horizontal padding,
 * max-width, and vertical section rhythm.
 *
 * density="comfortable" (default) — consumer-facing pages
 *   px-6 md:px-8, space-y-8, max-w-7xl
 *
 * density="compact" — admin / data-heavy pages
 *   px-4 md:px-6, space-y-6, max-w-7xl
 */
interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: 'comfortable' | 'compact';
}

function PageShell({ className, density = 'comfortable', ...props }: PageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl',
        density === 'comfortable' ? 'px-6 md:px-8 py-8 space-y-8' : 'px-4 md:px-6 py-6 space-y-6',
        className,
      )}
      {...props}
    />
  );
}

/**
 * PageHeader — title row with optional right-side slot (CTA button etc.)
 */
interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function PageHeader({ title, description, action, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)} {...props}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export { PageShell, PageHeader };
export type { PageShellProps, PageHeaderProps };
