import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { cn } from '@/lib/utils';
import { HIGHLIGHTS_MAX, HIGHLIGHTS_MIN, HIGHLIGHT_MAX_LENGTH } from '@/lib/wizardBasicsAbout';
import {
  AMENITY_GROUPS,
  addCustomAmenity,
  addHighlight,
  amenityChipsByGroup,
  amenityLabel,
  cardHighlightSplit,
  highlightChoices,
  highlightSuggestions,
  toggleAmenity,
  toggleHighlight,
  type AmenityGroupId,
} from '@/lib/wizardLocationCostsAmenities';
import { iconForAmenity } from '../../wizard/wizardIcons';
import { ChipButton, WizardSection } from '../../wizard/ui/WizardUi';
import { wizardTokens as t } from '../../wizard/ui/wizardTokens';

/**
 * Amenities: Security / Lifestyle / In every home chips with icons (custom
 * items get the star fallback), an "Add your own" box per group, and the
 * highlights for the search card at the end. Registry keys are kept for known
 * items so the public amenity groups keep working; custom items are stored as
 * their label, as before. Highlights are stored as before too (keySellingPoints
 * -> developments.highlights).
 */
export function AmenitiesPhase() {
  const {
    stepData,
    getWizardData,
    setIdentity,
    saveWorkflowStepData,
    ensureResidentialWorkflow,
    stepErrors,
    currentStepId,
  } = useDevelopmentWizard();

  const [drafts, setDrafts] = useState<Record<AmenityGroupId, string>>({
    security: '',
    lifestyle: '',
    home: '',
  });
  const [highlightDraft, setHighlightDraft] = useState('');

  const savedAmenities = (stepData?.amenities_features ?? {}) as Record<string, any>;
  const data = getWizardData() as Record<string, any>;
  const selected: string[] = Array.isArray(savedAmenities.amenities)
    ? savedAmenities.amenities
    : Array.isArray(data.amenities)
      ? data.amenities
      : [];
  const customGroups = (savedAmenities.customGroups ?? {}) as Record<string, AmenityGroupId>;
  const chips = amenityChipsByGroup(selected, customGroups);

  const highlights: string[] = Array.isArray(data.highlights) ? data.highlights : [];
  const suggestions = highlightChoices(
    highlightSuggestions({
      setting: data.setting,
      estateType: data.estateType,
      ownershipTypes: data.ownershipTypes,
      amenities: selected,
    }),
    highlights,
  );

  const errors = (currentStepId && stepErrors?.[currentStepId]) || [];
  const highlightError = errors.find((e: any) => e?.field === 'highlights')?.message as
    | string
    | undefined;

  const writeAmenities = (amenities: string[], groups: Record<string, AmenityGroupId>) => {
    ensureResidentialWorkflow?.();
    saveWorkflowStepData('amenities_features', {
      ...savedAmenities,
      amenities,
      customGroups: groups,
    });
  };

  const writeHighlights = (next: string[]) => {
    ensureResidentialWorkflow?.();
    setIdentity({ highlights: next } as any);
    saveWorkflowStepData('marketing_summary', { keySellingPoints: next });
  };

  const onToggleAmenity = (item: string) => {
    const next = toggleAmenity(selected, customGroups, item);
    writeAmenities(next.amenities, next.customGroups);
  };

  const onAddCustom = (group: AmenityGroupId) => {
    const result = addCustomAmenity(selected, customGroups, group, drafts[group]);
    if (result.status === 'duplicate' || result.status === 'empty') {
      if (result.status === 'duplicate') toast.error('That one is already ticked');
      return;
    }
    // 'added' or 'known' (a registry amenity ticked by its label).
    writeAmenities(result.amenities, result.customGroups);
    setDrafts(prev => ({ ...prev, [group]: '' }));
  };

  const onAddHighlight = () => {
    const result = addHighlight(highlights, highlightDraft);
    if (result.status === 'empty') return;
    if (result.status === 'added') writeHighlights(result.highlights);
    setHighlightDraft('');
  };

  const { shown, more } = cardHighlightSplit(highlights);
  const full = highlights.length >= HIGHLIGHTS_MAX;

  return (
    <div className={cn(t.card, 'flex flex-col gap-7')}>
      <p className="text-sm text-slate-600">Tap what the development really has.</p>

      {AMENITY_GROUPS.map(group => (
        <WizardSection key={group.id} label={group.title}>
          <div className="flex flex-wrap gap-2" role="group" aria-label={group.title}>
            {chips[group.id].map(item => (
              <ChipButton
                key={item}
                icon={iconForAmenity(amenityLabel(item))}
                label={amenityLabel(item)}
                selected={selected.includes(item)}
                onClick={() => onToggleAmenity(item)}
              />
            ))}
          </div>
          <div className="mt-3.5 flex max-w-[520px] items-center gap-2">
            <input
              className={t.input}
              aria-label={group.addAria}
              placeholder={group.placeholder}
              value={drafts[group.id]}
              onChange={e => setDrafts(prev => ({ ...prev, [group.id]: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddCustom(group.id);
                }
              }}
            />
            <button type="button" className={t.button} onClick={() => onAddCustom(group.id)}>
              Add
            </button>
          </div>
        </WizardSection>
      ))}

      <div className="-mx-4 -mb-4 rounded-b-lg bg-slate-50 px-4 pb-6 pt-7 sm:-mx-6 sm:-mb-6 sm:px-6">
        <span className={t.sectionLabel}>Highlights for the search card</span>
        <p className="-mt-1 mb-3.5 text-[13px] leading-relaxed text-slate-600">
          Pick the few things buyers should notice first. Suggestions come only from what you
          entered. The card shows the first three; the development page shows all of them.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Highlight suggestions">
          {suggestions.map(label => {
            const on = highlights.some(item => item.toLowerCase() === label.toLowerCase());
            return (
              <ChipButton
                key={label}
                tone="highlight"
                icon={on ? Check : iconForAmenity(label)}
                label={label}
                selected={on}
                onClick={() => writeHighlights(toggleHighlight(highlights, label))}
              />
            );
          })}
          {suggestions.length === 0 ? (
            <span className="text-sm text-slate-600">
              Tick some amenities above, or add your own below.
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex max-w-[520px] items-center gap-2">
          <input
            className={t.input}
            maxLength={HIGHLIGHT_MAX_LENGTH}
            aria-label="Add your own highlight"
            placeholder={`Add your own (max ${HIGHLIGHT_MAX_LENGTH} characters)`}
            value={highlightDraft}
            disabled={full}
            onChange={e => setHighlightDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddHighlight();
              }
            }}
          />
          <span className="w-12 flex-none text-xs text-slate-600" data-testid="highlight-counter">
            {highlightDraft.length}/{HIGHLIGHT_MAX_LENGTH}
          </span>
          <button type="button" className={t.button} onClick={onAddHighlight} disabled={full}>
            Add
          </button>
        </div>
        <div className={t.hint} data-testid="highlight-status">
          {highlights.length} of {HIGHLIGHTS_MAX} chosen (at least {HIGHLIGHTS_MIN} to publish).
          Tap a chosen tag again to remove it.
          {more > 0 ? ` The card shows ${shown.length} and “+${more} more”.` : ''}
        </div>
        {highlightError ? (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {highlightError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
