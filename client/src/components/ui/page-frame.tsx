import type { ComponentProps, ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PageFrameProps = ComponentProps<'main'> & {
  children: ReactNode;
  contained?: boolean;
  contentClassName?: string;
};

/**
 * Shared structural contract for new engine and journey pages.
 *
 * It owns a single focusable primary-content target for the global skip link.
 * Callers retain all route, query, mutation, permission, and business state.
 */
function PageFrame({
  children,
  contained = true,
  className,
  contentClassName,
  ...props
}: PageFrameProps) {
  const content = contained ? (
    <div
      data-slot="page-frame-content"
      className={cn(
        'mx-auto w-full max-w-[var(--content-rail-width)] px-[var(--content-padding-mobile)] py-[var(--space-xl)] lg:px-[var(--content-padding-desktop)]',
        contentClassName,
      )}
    >
      {children}
    </div>
  ) : (
    children
  );

  return (
    <main
      {...props}
      id="main-content"
      tabIndex={-1}
      data-slot="page-frame"
      className={cn('min-w-0 outline-none', className)}
    >
      {content}
    </main>
  );
}

type PageHeaderProps = ComponentProps<'header'> & {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 'h1' | 'h2';
};

/** A composable title block; action elements remain caller-owned. */
function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  headingLevel = 'h1',
  className,
  ...props
}: PageHeaderProps) {
  const Heading = headingLevel as ElementType;

  return (
    <header
      data-slot="page-header"
      className={cn(
        'flex flex-col gap-[var(--space-md)] sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-[var(--space-sm)]">
        {breadcrumbs ? <nav aria-label="Breadcrumb">{breadcrumbs}</nav> : null}
        <Heading
          data-slot="page-header-title"
          className="text-fluid-h1 font-semibold tracking-tight"
        >
          {title}
        </Heading>
        {description ? (
          <p data-slot="page-header-description" className="max-w-3xl text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <PageActions>{actions}</PageActions> : null}
    </header>
  );
}

function PageActions({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-actions"
      data-testid="page-actions"
      className={cn(
        'flex w-full flex-col gap-[var(--space-sm)] sm:w-auto sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
      {...props}
    />
  );
}

export { PageActions, PageFrame, PageHeader };
