import { useId, type ReactNode } from 'react';

import { AlertCircle, FileQuestion, Inbox, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type StateProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Generic page loading presentation. Mutation-pending remains caller-owned. */
function LoadingState({ title, description, className }: Omit<StateProps, 'action'>) {
  return (
    <section
      data-slot="loading-state"
      aria-busy="true"
      aria-label={title}
      className={cn('flex min-h-48 items-center justify-center', className)}
    >
      <LoadingSpinner label={title} />
      {description ? <p className="sr-only">{description}</p> : null}
    </section>
  );
}

function ErrorState({
  title,
  description,
  action,
  className,
  onRetry,
  retryLabel = 'Try again',
}: StateProps & { onRetry?: () => void; retryLabel?: string }) {
  return (
    <section
      data-slot="error-state"
      role="alert"
      aria-live="assertive"
      className={cn('mx-auto w-full max-w-2xl', className)}
    >
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col gap-[var(--space-md)] p-6 sm:flex-row sm:items-start">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
            {onRetry || action ? (
              <div className="mt-[var(--space-md)] flex flex-wrap gap-[var(--space-sm)]">
                {onRetry ? (
                  <Button type="button" variant="outline" onClick={onRetry}>
                    <RotateCcw className="size-4" aria-hidden="true" />
                    {retryLabel}
                  </Button>
                ) : null}
                {action}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function EmptyState({ title, description, action, className }: StateProps) {
  const titleId = `empty-state-${useId()}-title`;

  return (
    <section data-slot="empty-state" aria-labelledby={titleId} className={className}>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox aria-hidden="true" />
          </EmptyMedia>
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </EmptyHeader>
        {action ? <EmptyContent>{action}</EmptyContent> : null}
      </Empty>
    </section>
  );
}

function NotFoundState({ title, description, action, className }: StateProps) {
  const titleId = `not-found-state-${useId()}-title`;

  return (
    <section
      data-slot="not-found-state"
      aria-labelledby={titleId}
      className={cn('w-full max-w-lg', className)}
    >
      <Card>
        <CardContent className="p-8 text-center">
          <FileQuestion className="mx-auto size-12 text-muted-foreground" aria-hidden="true" />
          <h1 id={titleId} className="mt-[var(--space-md)] text-fluid-h1 font-semibold">
            {title}
          </h1>
          {description ? (
            <p className="mt-[var(--space-sm)] text-muted-foreground">{description}</p>
          ) : null}
          {action ? <div className="mt-[var(--space-lg)] flex justify-center">{action}</div> : null}
        </CardContent>
      </Card>
    </section>
  );
}

export { EmptyState, ErrorState, LoadingState, NotFoundState };
