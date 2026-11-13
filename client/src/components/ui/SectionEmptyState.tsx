import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'wouter';

type SectionEmptyStateAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

interface SectionEmptyStateProps {
  /** Optional card title. The caller owns the section heading and its level. */
  title?: string;
  /** Heading level for the optional card title. Pass the level that follows the section heading. */
  titleAs?: 'h3' | 'h4' | 'h5';
  /** One short, honest line. No numbers and no invented content. */
  message: ReactNode;
  action?: SectionEmptyStateAction;
  icon?: LucideIcon;
  className?: string;
}

const ACTION_CLASS =
  'inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#2774AE] px-4 py-2 text-sm font-bold text-white hover:bg-[#1e5d8c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700';

/**
 * A designed placeholder for a homepage section that has nothing to show yet.
 * Sections keep their heading and rhythm instead of disappearing.
 */
export function SectionEmptyState({
  title,
  titleAs: Title = 'h3',
  message,
  action,
  icon: Icon,
  className = '',
}: SectionEmptyStateProps) {
  return (
    <div
      data-testid="section-empty-state"
      className={`flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 ${className}`.trim()}
    >
      <div className="flex max-w-3xl items-start gap-4">
        {Icon ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2774AE]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
        <div>
          {title ? <Title className="text-base font-bold text-slate-900">{title}</Title> : null}
          <p className={`${title ? 'mt-1 ' : ''}text-sm leading-6 text-slate-600`}>{message}</p>
        </div>
      </div>
      {action ? (
        action.href !== undefined ? (
          <Link href={action.href} className={`${ACTION_CLASS} shrink-0`}>
            {action.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={`${ACTION_CLASS} shrink-0`}>
            {action.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        )
      ) : null}
    </div>
  );
}
