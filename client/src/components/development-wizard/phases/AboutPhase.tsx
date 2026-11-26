import React from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { cn } from '@/lib/utils';
import { AUCTION_TYPE_OPTIONS } from '@/types/wizardTypes';
import {
  DESCRIPTION_MIN_LENGTH,
  OWNERSHIP_OPTIONS,
  SALES_STATUS_OPTIONS,
  TAGLINE_MAX_LENGTH,
  fromMonthInput,
  salesChoiceOf,
  salesChoicePatch,
  toMonthInput,
  type SalesChoice,
} from '@/lib/wizardBasicsAbout';
import { iconForSalesChoice } from '../../wizard/wizardIcons';
import { ChipButton, OptionCard } from '../../wizard/ui/WizardUi';
import { wizardTokens as t } from '../../wizard/ui/wizardTokens';

const TEXTAREA_CLASS = cn(t.input, 'min-h-[120px] resize-y py-2.5 leading-relaxed');

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-xs text-red-700">
      {message}
    </p>
  );
}

/**
 * About the development: Identity & Market and the old Marketing Summary in
 * one step. See wizardBasicsAbout.ts for where every answer is stored.
 */
export function AboutPhase() {
  const {
    getWizardData,
    setIdentity,
    saveWorkflowStepData,
    ensureResidentialWorkflow,
    stepErrors,
    currentStepId,
  } = useDevelopmentWizard();

  const data = getWizardData() as Record<string, any>;

  const errors = (currentStepId && stepErrors?.[currentStepId]) || [];
  const errorFor = (field: string): string | undefined =>
    errors.find((e: any) => e?.field === field)?.message;

  /** Identity & market answers (name, status, dates, ownership, phase). */
  const writeIdentity = (patch: Record<string, any>) => {
    ensureResidentialWorkflow();
    setIdentity(patch as any);
    saveWorkflowStepData('identity_market', patch);
  };

  /** Marketing answers (tagline, description). Highlights are chosen in the Amenities step. */
  const writeMarketing = (patch: Record<string, any>) => {
    ensureResidentialWorkflow();
    const { highlights, ...rest } = patch;
    const marketing: Record<string, any> = { ...rest };
    if (highlights !== undefined) marketing.keySellingPoints = highlights;
    setIdentity({
      ...(rest.description !== undefined ? { description: rest.description } : {}),
      ...(highlights !== undefined ? { highlights } : {}),
    } as any);
    saveWorkflowStepData('marketing_summary', marketing);
  };

  const name: string = data.name ?? '';
  const phaseLabel: string = data.phaseLabel ?? '';
  const tagline: string = data.subtitle ?? '';
  const description: string = data.description ?? '';
  const choice = salesChoiceOf(data);
  const phased = data.handoverDuringConstruction === true;
  const ownership: string = Array.isArray(data.ownershipTypes) ? (data.ownershipTypes[0] ?? '') : '';
  const isAuction = data.transactionType === 'auction';

  const pickStatus = (next: SalesChoice) => {
    const { status, salesStage } = salesChoicePatch(next);
    // Dates that no longer apply to the new status are cleared, so a date the
    // publisher cannot see any more is never published.
    writeIdentity({
      status,
      salesStage,
      launchDate: next === 'launching' ? (data.launchDate ?? null) : null,
      completionDate: next === 'off_plan' ? (data.completionDate ?? null) : null,
      expectedFirstHandoverDate:
        next === 'off_plan' && phased ? (data.expectedFirstHandoverDate ?? null) : null,
      handoverDuringConstruction: next === 'off_plan' ? phased : false,
    });
  };

  const setPhased = (value: boolean) =>
    writeIdentity({
      handoverDuringConstruction: value,
      expectedFirstHandoverDate: value ? (data.expectedFirstHandoverDate ?? null) : null,
    });

  return (
    <div className={cn(t.card, 'flex flex-col gap-5')}>
      <p className="text-sm text-slate-600">
        Everything here appears on the card and the development page.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="about-name" className={t.sectionLabel}>
            Development name
          </label>
          <input
            id="about-name"
            className={t.input}
            value={name}
            onChange={e => writeIdentity({ name: e.target.value })}
            aria-invalid={Boolean(errorFor('name'))}
          />
          <div className={t.hint}>Shown on cards, the development page and Google.</div>
          <FieldError message={errorFor('name')} />
        </div>
        <div>
          <label htmlFor="about-phase" className={t.sectionLabel}>
            Phase (optional)
          </label>
          <input
            id="about-phase"
            className={t.input}
            placeholder="e.g. Phase 2"
            value={phaseLabel}
            maxLength={60}
            onChange={e =>
              writeIdentity({
                phaseLabel: e.target.value,
                nature: e.target.value.trim() ? 'phase' : 'new',
              })
            }
          />
          <div className={t.hint}>Shown as a badge. Leave empty for a brand-new development.</div>
        </div>
      </div>

      <div>
        <label htmlFor="about-tagline" className={t.sectionLabel}>
          Tagline
        </label>
        <input
          id="about-tagline"
          className={t.input}
          value={tagline}
          maxLength={TAGLINE_MAX_LENGTH}
          onChange={e => {
            writeMarketing({ tagline: e.target.value });
            // One tagline: keep the identity copy in step so the two never differ.
            writeIdentity({ subtitle: e.target.value });
          }}
        />
        <div className={t.hint} data-testid="tagline-counter">
          Shown under the name. {tagline.length} of {TAGLINE_MAX_LENGTH} characters.
        </div>
      </div>

      <div>
        <span className={t.sectionLabel}>Sales status</span>
        <div role="radiogroup" aria-label="Sales status" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {SALES_STATUS_OPTIONS.map(option => (
            <OptionCard
              key={option.value}
              icon={iconForSalesChoice(option.value)}
              title={option.label}
              description={option.description}
              selected={choice === option.value}
              onClick={() => pickStatus(option.value)}
            />
          ))}
        </div>
        <FieldError message={errorFor('status')} />
      </div>

      {choice === 'launching' && (
        <div className="max-w-[280px]">
          <label htmlFor="about-launch" className={t.sectionLabel}>
            Launching (month)
          </label>
          <input
            id="about-launch"
            type="month"
            className={t.input}
            placeholder="YYYY-MM"
            value={toMonthInput(data.launchDate)}
            onChange={e => writeIdentity({ launchDate: fromMonthInput(e.target.value) })}
          />
          <div className={t.hint}>Shown as “Launching [month]”.</div>
        </div>
      )}

      {choice === 'off_plan' && (
        <div className="flex flex-col gap-3.5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={phased}
              onChange={e => setPhased(e.target.checked)}
            />
            Homes are handed over in phases
          </label>
          {phased ? (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="about-first-handover" className={t.sectionLabel}>
                  First homes handed over from
                </label>
                <input
                  id="about-first-handover"
                  type="month"
                  className={t.input}
                  placeholder="YYYY-MM"
                  value={toMonthInput(data.expectedFirstHandoverDate)}
                  onChange={e =>
                    writeIdentity({ expectedFirstHandoverDate: fromMonthInput(e.target.value) })
                  }
                />
                <FieldError message={errorFor('expectedFirstHandoverDate')} />
              </div>
              <div>
                <label htmlFor="about-final-completion" className={t.sectionLabel}>
                  Final completion
                </label>
                <input
                  id="about-final-completion"
                  type="month"
                  className={t.input}
                  placeholder="YYYY-MM"
                  value={toMonthInput(data.completionDate)}
                  onChange={e => writeIdentity({ completionDate: fromMonthInput(e.target.value) })}
                />
              </div>
            </div>
          ) : (
            <div className="max-w-[280px]">
              <label htmlFor="about-completion" className={t.sectionLabel}>
                Expected completion
              </label>
              <input
                id="about-completion"
                type="month"
                className={t.input}
                placeholder="YYYY-MM"
                value={toMonthInput(data.completionDate)}
                onChange={e => writeIdentity({ completionDate: fromMonthInput(e.target.value) })}
              />
            </div>
          )}
          <div className={t.hint}>
            Mark individual house types “Ready now” in the House types step when some homes are
            already finished.
          </div>
        </div>
      )}

      {isAuction && (
        <div className="max-w-[320px]">
          <label htmlFor="about-auction-type" className={t.sectionLabel}>
            Auction type
          </label>
          <select
            id="about-auction-type"
            className={t.input}
            value={data.auctionType ?? ''}
            onChange={e => writeIdentity({ auctionType: e.target.value || undefined })}
          >
            <option value="">Select auction type</option>
            {AUCTION_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <span className={t.sectionLabel}>Ownership</span>
        <div role="radiogroup" aria-label="Ownership" className="flex flex-wrap gap-2">
          {OWNERSHIP_OPTIONS.map(option => (
            <ChipButton
              key={option.value}
              label={option.label}
              selected={ownership === option.value}
              onClick={() => writeIdentity({ ownershipTypes: [option.value] })}
            />
          ))}
        </div>
        <div className={t.hint}>
          {ownership === 'varies'
            ? 'Ownership is then asked for each house type.'
            : 'Asked once for the whole development.'}
        </div>
        <FieldError message={errorFor('ownershipTypes')} />
      </div>

      <div>
        <label htmlFor="about-description" className={t.sectionLabel}>
          Description
        </label>
        <textarea
          id="about-description"
          className={TEXTAREA_CLASS}
          value={description}
          onChange={e => writeMarketing({ description: e.target.value })}
          aria-invalid={Boolean(errorFor('description'))}
        />
        <div
          className={cn(
            t.hint,
            description.trim().length < DESCRIPTION_MIN_LENGTH && 'text-amber-700',
          )}
          data-testid="description-counter"
        >
          {description.trim().length < DESCRIPTION_MIN_LENGTH
            ? `At least ${DESCRIPTION_MIN_LENGTH} characters (${description.trim().length} so far).`
            : `${description.trim().length} characters.`}
        </div>
        <FieldError message={errorFor('description')} />
      </div>
    </div>
  );
}
