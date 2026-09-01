import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Check, ChevronDown, Home, Plus, Shield, Sparkles, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  FeaturesContext,
  Step4HighlightKey,
  Step4SecurityFeatureKey,
  Step4SpaceKey,
} from '@shared/features-context';
import {
  getApplicableStep4Spaces,
  normalizeFeaturesContext,
  STEP4_CUSTOM_TEXT_MAX_LENGTH,
  STEP4_CUSTOM_VALUE_LIMIT,
  STEP4_HIGHLIGHT_DEFINITIONS,
  STEP4_SECURITY_FEATURE_DEFINITIONS,
} from '@shared/features-context';
import type { CorePropertyInformation } from '@shared/core-property-information';

type SelectOption = { value: string; label: string };

function SectionHeader({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3 border-b border-slate-100 pb-4', className)}>
      <div className="mt-0.5 rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function OptionalDetailsSection({
  id,
  icon,
  title,
  description,
  selectedCount = 0,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  selectedCount?: number;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const progressLabel = selectedCount > 0 ? `${selectedCount} added` : 'Optional';

  return (
    <details
      open={isOpen}
      onToggle={event => setIsOpen(event.currentTarget.open)}
      className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-colors open:border-slate-300"
    >
      <summary
        data-testid={`optional-section-${id}`}
        className="flex cursor-pointer list-none items-start gap-4 px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset sm:px-6 [&::-webkit-details-marker]:hidden"
      >
        <SectionHeader
          icon={icon}
          title={title}
          description={description}
          className="min-w-0 flex-1 border-b-0 pb-0"
        />
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:inline">
            {progressLabel}
          </span>
          <ChevronDown
            className="h-5 w-5 text-slate-400 transition-transform duration-200 group-open:rotate-180"
            aria-hidden="true"
          />
        </div>
      </summary>
      <div id={`${id}-content`} className="border-t border-slate-100 px-5 py-5 sm:px-6 sm:pb-6">
        {children}
      </div>
    </details>
  );
}

function ChoiceCheckbox({
  id,
  label,
  checked,
  onChange,
  muted = false,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  muted?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'group flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
        'focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1',
        checked
          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-slate-50',
        muted && 'text-slate-600',
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
          checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white',
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      <span className="font-medium">{label}</span>
    </label>
  );
}

function ChoiceRadio({
  name,
  id,
  label,
  checked,
  onChange,
}: {
  name: string;
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
        'focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1',
        checked
          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-slate-50',
      )}
    >
      <input
        id={id}
        name={name}
        type="radio"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
          checked ? 'border-emerald-600' : 'border-slate-300',
        )}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
      </span>
      <span className="font-medium">{label}</span>
    </label>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value?: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 rounded-xl border-slate-200 bg-white">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const utilityOptions = {
  electricitySupply: [
    { value: 'prepaid', label: 'Prepaid' },
    { value: 'municipal', label: 'Municipal supply' },
    { value: 'eskom', label: 'Eskom direct' },
    { value: 'off_grid', label: 'Off-grid' },
    { value: 'unknown', label: 'Not sure' },
  ],
  backupPower: [
    { value: 'none', label: 'None' },
    { value: 'generator', label: 'Generator' },
    { value: 'inverter', label: 'Inverter' },
    { value: 'solar', label: 'Solar system' },
    { value: 'ups', label: 'UPS' },
    { value: 'unknown', label: 'Not sure' },
  ],
  waterSupply: [
    { value: 'municipal', label: 'Municipal supply' },
    { value: 'prepaid', label: 'Prepaid' },
    { value: 'borehole', label: 'Borehole' },
    { value: 'unknown', label: 'Not sure' },
  ],
  wastewaterSystem: [
    { value: 'municipal', label: 'Municipal sewerage' },
    { value: 'septic_tank', label: 'Septic tank' },
    { value: 'package_plant', label: 'Package treatment plant' },
    { value: 'conservancy_tank', label: 'Conservancy tank' },
    { value: 'unknown', label: 'Not sure' },
  ],
  waterHeating: [
    { value: 'electric_geyser', label: 'Electric geyser' },
    { value: 'solar_geyser', label: 'Solar geyser' },
    { value: 'hybrid', label: 'Hybrid system' },
    { value: 'unknown', label: 'Not sure' },
  ],
  internetAccess: [
    { value: 'fibre', label: 'Fibre available' },
    { value: 'adsl', label: 'ADSL' },
    { value: 'satellite', label: 'Satellite' },
    { value: 'none', label: 'No fixed internet' },
    { value: 'unknown', label: 'Not sure' },
  ],
} satisfies Record<string, SelectOption[]>;

export function AdditionalInformationStep() {
  const store = useListingWizardStore();
  const propertyType = store.propertyType;
  const additionalInfo = store.additionalInfo || {};
  const propertyDetails = store.propertyDetails || {};
  const context = normalizeFeaturesContext(additionalInfo.featuresContext, additionalInfo);
  const core = (propertyDetails as Record<string, unknown>).corePropertyInformation as
    | Partial<CorePropertyInformation>
    | undefined;
  const applicableSpaces = getApplicableStep4Spaces(propertyType, core);
  const supportsPetPolicy = ['apartment', 'house', 'townhouse', 'cluster_home'].includes(
    propertyType || '',
  );
  const [customFeature, setCustomFeature] = React.useState('');
  const [customHighlight, setCustomHighlight] = React.useState('');
  const [customHighlightError, setCustomHighlightError] = React.useState('');
  const contextFactCount = [
    context.context.setting,
    context.context.controlledAccess,
    context.context.securityProfile,
    context.petPolicy,
  ].filter(value => value && value !== 'unknown').length;
  const utilityFactCount = Object.values(context.utilities).filter(
    value => value && value !== 'unknown',
  ).length;

  const updateContext = (update: (current: FeaturesContext) => FeaturesContext) => {
    store.setAdditionalInfo({ featuresContext: update(context) });
  };

  const toggleSpace = (value: Step4SpaceKey, checked: boolean) => {
    updateContext(current => ({
      ...current,
      spaces: checked
        ? Array.from(new Set([...current.spaces, value]))
        : current.spaces.filter(item => item !== value),
    }));
  };

  const toggleHighlight = (value: Step4HighlightKey, checked: boolean) => {
    updateContext(current => ({
      ...current,
      highlights: checked
        ? Array.from(new Set([...current.highlights, value]))
        : current.highlights.filter(item => item !== value),
    }));
  };

  const toggleSecurityFeature = (value: Step4SecurityFeatureKey, checked: boolean) => {
    updateContext(current => ({
      ...current,
      security: {
        status: 'known',
        features: checked
          ? Array.from(new Set([...current.security.features, value]))
          : current.security.features.filter(item => item !== value),
      },
    }));
  };

  const addCustomFeature = () => {
    const value = customFeature.trim().replace(/\s+/g, ' ');
    if (!value || value.length > STEP4_CUSTOM_TEXT_MAX_LENGTH) return;
    updateContext(current => ({
      ...current,
      customFeatures: current.customFeatures.some(
        item => item.toLowerCase() === value.toLowerCase(),
      )
        ? current.customFeatures
        : [...current.customFeatures, value].slice(0, STEP4_CUSTOM_VALUE_LIMIT),
    }));
    setCustomFeature('');
  };

  const removeCustomFeature = (value: string) => {
    updateContext(current => ({
      ...current,
      customFeatures: current.customFeatures.filter(item => item !== value),
    }));
  };

  const addCustomHighlight = () => {
    const value = customHighlight.trim().replace(/\s+/g, ' ');
    const canonicalLabel = STEP4_HIGHLIGHT_DEFINITIONS.some(
      option => option.label.toLowerCase() === value.toLowerCase(),
    );
    const alreadyAdded = context.customHighlights.some(
      item => item.toLowerCase() === value.toLowerCase(),
    );

    if (!value) {
      setCustomHighlightError('Enter a short highlight before adding it.');
      return;
    }
    if (value.length > STEP4_CUSTOM_TEXT_MAX_LENGTH) {
      setCustomHighlightError(
        `Highlights must be ${STEP4_CUSTOM_TEXT_MAX_LENGTH} characters or fewer.`,
      );
      return;
    }
    if (canonicalLabel) {
      setCustomHighlightError('That highlight is already available above.');
      return;
    }
    if (alreadyAdded) {
      setCustomHighlightError('That custom highlight has already been added.');
      return;
    }

    updateContext(current => ({
      ...current,
      customHighlights: [...current.customHighlights, value].slice(0, STEP4_CUSTOM_VALUE_LIMIT),
    }));
    setCustomHighlight('');
    setCustomHighlightError('');
  };

  const removeCustomHighlight = (value: string) => {
    updateContext(current => ({
      ...current,
      customHighlights: current.customHighlights.filter(item => item !== value),
    }));
  };

  const updateUtility = (key: keyof FeaturesContext['utilities'], value: string) => {
    updateContext(current => ({
      ...current,
      utilities: { ...current.utilities, [key]: value },
    }));
  };

  return (
    <div
      data-testid="features-context-step"
      className="animate-in slide-in-from-bottom-4 space-y-4 py-4 duration-500 sm:py-6"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
          Step 4 · Optional details
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
          Add the details you know
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Everything on this page is optional. Add only confirmed details now, or return to them in
          the listing editor later.
        </p>
        {propertyType === 'farm' && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
            Farm and smallholding features stay focused on what helps a prospect understand the
            offering. Agricultural operations and infrastructure can be added later where relevant.
          </p>
        )}
      </div>

      <OptionalDetailsSection
        id="spaces"
        icon={Home}
        title="Spaces & Features"
        description="Choose the additional spaces and practical features that are genuinely part of the property."
        selectedCount={context.spaces.length + context.customFeatures.length}
      >
        <fieldset>
          <legend className="sr-only">Spaces and features</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {applicableSpaces.map(option => (
              <ChoiceCheckbox
                key={option.value}
                id={`space-${option.value}`}
                label={option.label}
                checked={context.spaces.includes(option.value)}
                onChange={checked => toggleSpace(option.value, checked)}
              />
            ))}
          </div>
        </fieldset>
        <div className="border-t border-slate-100 pt-4">
          <Label htmlFor="custom-feature" className="text-sm font-medium text-slate-700">
            Other feature <span className="font-normal text-slate-400">(optional)</span>
          </Label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id="custom-feature"
              value={customFeature}
              maxLength={STEP4_CUSTOM_TEXT_MAX_LENGTH}
              onChange={event => setCustomFeature(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCustomFeature();
                }
              }}
              placeholder="Add a detail not listed above"
              className="h-11 rounded-xl border-slate-200 bg-white"
            />
            <button
              type="button"
              onClick={addCustomFeature}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Add
            </button>
          </div>
          {context.customFeatures.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {context.customFeatures.map(feature => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                >
                  {feature}
                  <button
                    type="button"
                    aria-label={`Remove ${feature}`}
                    onClick={() => removeCustomFeature(feature)}
                    className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Other features appear as display-only details and do not change search filters.
          </p>
        </div>
      </OptionalDetailsSection>

      <OptionalDetailsSection
        id="context"
        icon={Building2}
        title="Property Context"
        description="Describe how the property sits within its immediate setting. These answers do not assume a title or ownership structure."
        selectedCount={contextFactCount}
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium text-slate-700">Setting</legend>
            <div className="grid gap-2">
              {[
                ['standalone', 'Standalone property'],
                ['complex', 'Complex or managed building'],
                ['estate', 'Estate or managed community'],
                ['unknown', 'Not sure'],
              ].map(([value, label]) => (
                <ChoiceRadio
                  key={value}
                  name="property-setting"
                  id={`setting-${value}`}
                  label={label}
                  checked={context.context.setting === value}
                  onChange={() =>
                    updateContext(current => ({
                      ...current,
                      context: {
                        ...current.context,
                        setting: value as FeaturesContext['context']['setting'],
                      },
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium text-slate-700">Access to the property</legend>
            <div className="grid gap-2">
              {[
                ['controlled', 'Controlled or gated access'],
                ['not_controlled', 'No controlled access'],
                ['unknown', 'Not sure'],
              ].map(([value, label]) => (
                <ChoiceRadio
                  key={value}
                  name="controlled-access"
                  id={`access-${value}`}
                  label={label}
                  checked={context.context.controlledAccess === value}
                  onChange={() =>
                    updateContext(current => ({
                      ...current,
                      context: {
                        ...current.context,
                        controlledAccess: value as FeaturesContext['context']['controlledAccess'],
                      },
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium text-slate-700">Security setting</legend>
            <p className="text-xs leading-5 text-slate-500">
              Choose the setting directly. Add confirmed details such as a 24-hour guard below.
            </p>
            <div className="grid gap-2">
              {[
                ['security_estate', 'Security estate'],
                ['gated_community', 'Gated community'],
                ['standard', 'Standard security'],
                ['unknown', 'Not sure'],
              ].map(([value, label]) => (
                <ChoiceRadio
                  key={value}
                  name="security-profile"
                  id={`security-profile-${value}`}
                  label={label}
                  checked={context.context.securityProfile === value}
                  onChange={() =>
                    updateContext(current => ({
                      ...current,
                      context: {
                        ...current.context,
                        securityProfile: value as FeaturesContext['context']['securityProfile'],
                      },
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>
        </div>

        {supportsPetPolicy && (
          <fieldset className="border-t border-slate-100 pt-5">
            <legend className="mb-2 text-sm font-medium text-slate-700">Pet policy</legend>
            <p className="mb-3 text-xs text-slate-500">
              Record the confirmed household, estate or body-corporate policy. It is separate from
              security and property features.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['allowed', 'Pets allowed'],
                ['cats_only', 'Cats only'],
                ['dogs_only', 'Dogs only'],
                ['allowed_with_permission', 'With permission'],
                ['not_allowed', 'Pets not allowed'],
                ['unknown', 'Not sure'],
              ].map(([value, label]) => (
                <ChoiceRadio
                  key={value}
                  name="pet-policy"
                  id={`pet-${value}`}
                  label={label}
                  checked={context.petPolicy === value}
                  onChange={() =>
                    updateContext(current => ({
                      ...current,
                      petPolicy: value as FeaturesContext['petPolicy'],
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>
        )}
      </OptionalDetailsSection>

      <OptionalDetailsSection
        id="utilities"
        icon={Zap}
        title="Utilities & Resilience"
        description="Share the practical facts buyers repeatedly need. Choose Not sure rather than guessing."
        selectedCount={utilityFactCount}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            id="electricity-supply"
            label="Electricity supply"
            value={context.utilities.electricitySupply}
            options={utilityOptions.electricitySupply}
            placeholder="Select supply"
            onChange={value => updateUtility('electricitySupply', value)}
          />
          <SelectField
            id="backup-power"
            label="Backup power"
            value={context.utilities.backupPower}
            options={utilityOptions.backupPower}
            placeholder="Select backup"
            onChange={value => updateUtility('backupPower', value)}
          />
          <SelectField
            id="water-supply"
            label="Water supply"
            value={context.utilities.waterSupply}
            options={utilityOptions.waterSupply}
            placeholder="Select supply"
            onChange={value => updateUtility('waterSupply', value)}
          />
          <SelectField
            id="wastewater-system"
            label="Sewerage system"
            value={context.utilities.wastewaterSystem}
            options={utilityOptions.wastewaterSystem}
            placeholder="Select system"
            onChange={value => updateUtility('wastewaterSystem', value)}
          />
          <SelectField
            id="water-heating"
            label="Water heating"
            value={context.utilities.waterHeating}
            options={utilityOptions.waterHeating}
            placeholder="Select heating"
            onChange={value => updateUtility('waterHeating', value)}
          />
          <SelectField
            id="internet-access"
            label="Internet access"
            value={context.utilities.internetAccess}
            options={utilityOptions.internetAccess}
            placeholder="Select access"
            onChange={value => updateUtility('internetAccess', value)}
          />
        </div>
      </OptionalDetailsSection>

      <OptionalDetailsSection
        id="security"
        icon={Shield}
        title="Security"
        description="Select specific security characteristics only when you know they are present."
        selectedCount={context.security.status === 'known' ? context.security.features.length : 0}
      >
        <fieldset className="space-y-3">
          <legend className="sr-only">Security information certainty</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceRadio
              name="security-status"
              id="security-known"
              label="I know the security features"
              checked={context.security.status === 'known'}
              onChange={() =>
                updateContext(current => ({
                  ...current,
                  security: { ...current.security, status: 'known' },
                }))
              }
            />
            <ChoiceRadio
              name="security-status"
              id="security-unknown"
              label="Not sure"
              checked={context.security.status === 'unknown'}
              onChange={() =>
                updateContext(current => ({
                  ...current,
                  security: { ...current.security, status: 'unknown', features: [] },
                }))
              }
            />
          </div>
        </fieldset>
        {context.security.status === 'known' && (
          <fieldset className="border-t border-slate-100 pt-4">
            <legend className="mb-3 text-sm text-slate-500">
              Select all that apply. Leave them unselected if there are no additional features.
            </legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {STEP4_SECURITY_FEATURE_DEFINITIONS.filter(
                definition =>
                  typeof propertyType === 'string' &&
                  definition.applicableTo.includes(propertyType as any),
              ).map(option => (
                <ChoiceCheckbox
                  key={option.value}
                  id={`security-${option.value}`}
                  label={option.label}
                  checked={context.security.features.includes(option.value)}
                  onChange={checked => toggleSecurityFeature(option.value, checked)}
                />
              ))}
            </div>
          </fieldset>
        )}
      </OptionalDetailsSection>

      <OptionalDetailsSection
        id="highlights"
        icon={Sparkles}
        title="Listing Highlights"
        description="Optional presentation characteristics. These help describe the property but are not verified search facts."
        selectedCount={context.highlights.length + context.customHighlights.length}
      >
        <fieldset>
          <legend className="sr-only">Listing highlights</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {STEP4_HIGHLIGHT_DEFINITIONS.map(option => (
              <ChoiceCheckbox
                key={option.value}
                id={`highlight-${option.value}`}
                label={option.label}
                checked={context.highlights.includes(option.value)}
                onChange={checked => toggleHighlight(option.value, checked)}
                muted
              />
            ))}
          </div>
        </fieldset>
        <div className="border-t border-amber-100 pt-4">
          <Label htmlFor="custom-highlight" className="text-sm font-medium text-slate-700">
            Add another highlight <span className="font-normal text-slate-400">(optional)</span>
          </Label>
          <p className="mt-1 text-xs text-slate-500">
            Add a short presentation detail that is not listed above. It will appear only in Listing
            Highlights, not in search filters.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id="custom-highlight"
              data-testid="custom-highlight-input"
              value={customHighlight}
              maxLength={STEP4_CUSTOM_TEXT_MAX_LENGTH}
              onChange={event => {
                setCustomHighlight(event.target.value);
                if (customHighlightError) setCustomHighlightError('');
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCustomHighlight();
                }
              }}
              placeholder="e.g. Quiet cul-de-sac"
              className="h-11 rounded-xl border-slate-200 bg-white"
              aria-invalid={Boolean(customHighlightError)}
              aria-describedby={customHighlightError ? 'custom-highlight-error' : undefined}
            />
            <button
              type="button"
              data-testid="add-custom-highlight"
              onClick={addCustomHighlight}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-amber-300 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Add
            </button>
          </div>
          {customHighlightError && (
            <p id="custom-highlight-error" className="mt-2 text-xs font-medium text-rose-600">
              {customHighlightError}
            </p>
          )}
          {context.customHighlights.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Custom listing highlights">
              {context.customHighlights.map(highlight => (
                <span
                  key={highlight}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-900"
                >
                  {highlight}
                  <button
                    type="button"
                    aria-label={`Remove ${highlight}`}
                    onClick={() => removeCustomHighlight(highlight)}
                    className="rounded-full p-0.5 text-amber-600 hover:bg-amber-100 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </OptionalDetailsSection>
    </div>
  );
}
