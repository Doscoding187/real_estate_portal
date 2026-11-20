import React from 'react';
import { Building2, Key, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptionCard, WizardSection } from './ui/WizardUi';
import { wizardTokens as t } from './ui/wizardTokens';

export type StartTransaction = 'for_sale' | 'for_rent';

/** Auction, Commercial, Mixed-use and Land are hidden until they are ready. */
const TRANSACTIONS = [
  {
    value: 'for_sale' as const,
    label: 'For sale',
    description: 'Sell homes to buyers.',
    icon: Tag,
  },
  {
    value: 'for_rent' as const,
    label: 'To rent',
    description: 'Let homes to tenants.',
    icon: Key,
  },
];

/**
 * The unnumbered start screen: two questions before "Step 1 of 8".
 * One development has ONE transaction.
 */
export function StartScreen({
  transaction,
  onTransaction,
  onStart,
  warning,
  startLabel = 'Start',
}: {
  transaction: StartTransaction | null;
  onTransaction: (value: StartTransaction) => void;
  onStart: () => void;
  /** Shown when changing the answers could invalidate what was already entered. */
  warning?: string | null;
  startLabel?: string;
}) {
  return (
    <div className={cn(t.card, 'flex flex-col gap-6')}>
      <p className="text-sm text-slate-600">Two quick questions, then we guide you step by step.</p>

      <WizardSection label="What are you listing?">
        <div role="radiogroup" aria-label="What are you listing?" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TRANSACTIONS.map(option => (
            <OptionCard
              key={option.value}
              stacked
              icon={option.icon}
              title={option.label}
              description={option.description}
              selected={transaction === option.value}
              onClick={() => onTransaction(option.value)}
            />
          ))}
        </div>
      </WizardSection>

      <WizardSection label="What kind of property?">
        <div role="radiogroup" aria-label="What kind of property?" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OptionCard
            stacked
            icon={Building2}
            title="Residential"
            description="Houses, townhouses and apartments."
            selected
            onClick={() => undefined}
          />
        </div>
      </WizardSection>

      {warning && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {warning}
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={onStart}
          disabled={!transaction}
          className={cn(t.button, t.buttonPrimary)}
        >
          {startLabel}
        </button>
      </div>
    </div>
  );
}
