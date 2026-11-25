import React from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { cn } from '@/lib/utils';
import {
  LEVY_OPTIONS,
  estimatedAmount,
  hasSavedRange,
  levyChoiceOf,
  levyLabelFor,
  levyPatch,
  parseMonthlyAmount,
  ratesPatch,
  type LevyChoice,
} from '@/lib/wizardLocationCostsAmenities';
import { ChipButton, WizardSection } from '../../wizard/ui/WizardUi';
import { wizardTokens as t } from '../../wizard/ui/wizardTokens';

const formatRand = (value: number) =>
  value > 0 ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '';

function AmountInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (amount: number) => void;
}) {
  return (
    <div className="relative max-w-[280px]">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
        R
      </span>
      <input
        id={id}
        inputMode="numeric"
        className={cn(t.input, 'pl-7')}
        placeholder="estimate"
        value={formatRand(value)}
        onChange={e => onChange(parseMonthlyAmount(e.target.value))}
      />
    </div>
  );
}

/**
 * Monthly costs: rates & taxes first (one estimated amount), then the levy if
 * there is one. Both are saved in the existing governance_finances step data
 * (see wizardLocationCostsAmenities.ts); other stored values (governance type
 * kinds, architectural guidelines, older from/to ranges) are never deleted.
 */
export function EstateProfilePhase() {
  const { stepData, saveWorkflowStepData, ensureResidentialWorkflow } = useDevelopmentWizard();
  const saved = (stepData?.governance_finances ?? {}) as Record<string, any>;

  const choice = levyChoiceOf(saved);
  const rates = estimatedAmount(saved.rightsAndTaxes);
  const levy = choice === 'none' ? 0 : estimatedAmount(saved.levyRange);

  const write = (patch: Record<string, unknown>) => {
    ensureResidentialWorkflow?.();
    saveWorkflowStepData('governance_finances', patch);
  };

  const pickLevy = (next: LevyChoice) => write(levyPatch(next, next === 'none' ? 0 : levy));

  return (
    <div className={cn(t.card, 'flex flex-col gap-7')}>
      <p className="text-sm text-slate-600">
        The two running costs every buyer asks about. Both are shown as estimates.
      </p>

      <WizardSection
        label={<label htmlFor="costs-rates">Rates & taxes (estimated, per month)</label>}
        hint="Shown as “Rates & taxes: approx. R… per month”. Use the developer’s estimate for a typical home."
      >
        <AmountInput
          id="costs-rates"
          value={rates}
          onChange={amount => write(ratesPatch(amount))}
        />
        {hasSavedRange(saved.rightsAndTaxes) ? (
          <p className={t.hint}>
            Saved earlier as a range (R{saved.rightsAndTaxes.min} to R{saved.rightsAndTaxes.max}).
            Entering an amount replaces it.
          </p>
        ) : null}
      </WizardSection>

      <WizardSection
        label="Levy (if applicable)"
        hint="HOA levy: home owners’ association in an estate or gated community. Body corporate levy: sectional title. Choose “No levy” if there is none."
      >
        <div role="group" aria-label="Levy" className="mb-3.5 flex flex-wrap gap-2">
          {LEVY_OPTIONS.map(option => (
            <ChipButton
              key={option.value}
              label={option.label}
              selected={choice === option.value}
              onClick={() => pickLevy(option.value)}
            />
          ))}
        </div>
        {choice === 'hoa' || choice === 'body_corporate' ? (
          <div>
            <label htmlFor="costs-levy" className={t.sectionLabel}>
              {levyLabelFor(choice)} (estimated, per month)
            </label>
            <AmountInput
              id="costs-levy"
              value={levy}
              onChange={amount => write(levyPatch(choice, amount))}
            />
            {hasSavedRange(saved.levyRange) ? (
              <p className={t.hint}>
                Saved earlier as a range (R{saved.levyRange.min} to R{saved.levyRange.max}).
                Entering an amount replaces it.
              </p>
            ) : null}
          </div>
        ) : null}
      </WizardSection>
    </div>
  );
}
