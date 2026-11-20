import React from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { cn } from '@/lib/utils';
import {
  DEFAULT_ESTATE_TYPE,
  ESTATE_TYPE_OPTIONS,
  SETTING_OPTIONS,
  communityTypesForSetting,
  type EstateType,
  type WizardSetting,
} from '@/lib/wizardBasicsAbout';
import { iconForEstateType, iconForSetting } from '../../wizard/wizardIcons';
import { OptionCard, WizardSection } from '../../wizard/ui/WizardUi';
import { wizardTokens as t } from '../../wizard/ui/wizardTokens';

/**
 * Basics: the setting (standalone, gated community, security estate) and, for
 * a security estate, which kind. Replaces Development Type, Freehold Category,
 * Property Sub-Type and Residential Estate (General).
 *
 * Saved as stepData.configuration.{setting, estateType}; the older community
 * types are derived from it (see communityTypesForSetting) so anything reading
 * them keeps working.
 */
export function BasicsPhase() {
  const {
    stepData,
    saveWorkflowStepData,
    setResidentialConfig,
    ensureResidentialWorkflow,
    stepErrors,
    currentStepId,
  } = useDevelopmentWizard();

  const config = stepData?.configuration ?? {};
  const setting: WizardSetting | null = config.setting ?? null;
  const estateType: EstateType = config.estateType ?? DEFAULT_ESTATE_TYPE;

  const errors = (currentStepId && stepErrors?.[currentStepId]) || [];
  const settingError = errors.find((e: any) => e?.field === 'setting')?.message;

  const save = (nextSetting: WizardSetting, nextEstateType: EstateType) => {
    ensureResidentialWorkflow();
    saveWorkflowStepData('configuration', {
      setting: nextSetting,
      estateType: nextSetting === 'estate' ? nextEstateType : undefined,
    });
    setResidentialConfig({
      freeholdCategory: null,
      communityTypes: communityTypesForSetting(nextSetting, nextEstateType),
    });
  };

  return (
    <div className={cn(t.card, 'flex flex-col gap-6')}>
      <p className="text-sm text-slate-600">
        Residential development. Pick the setting that best describes it; buyers filter on this.
      </p>

      <WizardSection label="What is the setting?">
        <div
          role="radiogroup"
          aria-label="Setting"
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {SETTING_OPTIONS.map(option => (
            <OptionCard
              key={option.value}
              stacked
              icon={iconForSetting(option.value)}
              title={option.label}
              description={option.description}
              selected={setting === option.value}
              onClick={() => save(option.value, estateType)}
            />
          ))}
        </div>
        {settingError && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {settingError}
          </p>
        )}
      </WizardSection>

      {setting === 'estate' && (
        <WizardSection
          label="What kind of security estate? (choose one)"
          hint="Buyers filter on this. Choose what the estate really is, not what it hopes to become."
        >
          <div
            role="radiogroup"
            aria-label="Kind of security estate"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {ESTATE_TYPE_OPTIONS.map(option => (
              <OptionCard
                key={option.value}
                icon={iconForEstateType(option.value)}
                title={option.label}
                description={option.description}
                selected={estateType === option.value}
                onClick={() => save('estate', option.value)}
              />
            ))}
          </div>
        </WizardSection>
      )}
    </div>
  );
}
