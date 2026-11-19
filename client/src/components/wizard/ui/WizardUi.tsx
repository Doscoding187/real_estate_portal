import React from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { wizardTokens as t } from './wizardTokens';

/** A form section: 28px apart, light divider, label gap 12px. */
export function WizardSection({
  label,
  hint,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(t.section, className)}>
      {label ? <span className={t.sectionLabel}>{label}</span> : null}
      {children}
      {hint ? <div className={t.hint}>{hint}</div> : null}
    </div>
  );
}

/** Large selectable card: filled icon tile and a corner tick when selected. */
export function OptionCard({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(t.optionCard, selected && t.optionCardOn, disabled && 'opacity-50')}
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute right-2.5 top-2.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-blue-700 text-white"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
      <span className="flex items-start gap-3.5">
        <span className={cn(t.iconTile, selected && t.iconTileOn)}>
          <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="flex flex-col gap-1 pr-5">
          <b className="text-[15px] text-slate-900">{title}</b>
          {description ? (
            <span className="text-[13px] leading-snug text-slate-600">{description}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

/** Small toggle chip with an optional icon. `tone="highlight"` is the warm orange accent. */
export function ChipButton({
  icon: Icon,
  label,
  selected,
  onClick,
  tone = 'default',
}: {
  icon?: LucideIcon;
  label: string;
  selected: boolean;
  onClick: () => void;
  tone?: 'default' | 'highlight';
}) {
  const highlight = tone === 'highlight';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        t.chip,
        highlight ? (selected ? t.highlightChipOn : t.highlightChip) : selected && t.chipOn,
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            'h-[18px] w-[18px] flex-none',
            highlight ? 'text-current' : selected ? 'text-blue-900' : 'text-blue-700',
          )}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      ) : null}
      {label}
    </button>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className={t.progressTrack}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div className={t.progressFill} style={{ width: `${value}%` }} />
    </div>
  );
}
