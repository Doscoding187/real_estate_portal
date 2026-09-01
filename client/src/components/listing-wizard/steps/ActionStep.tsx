// @ts-nocheck
/**
 * Step 1: Listing intent selection
 *
 * User selects: For Sale / To Rent
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Check, Home, Key } from 'lucide-react';
import type { ListingIntent } from '@/../../shared/listing-types';
import { listingActionToIntent } from '@/../../shared/listing-types';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { InlineError } from '@/components/ui/InlineError';

const LISTING_INTENT_OPTIONS: {
  value: ListingIntent;
  label: string;
  icon: JSX.Element;
  description: string;
  color: 'blue' | 'green';
}[] = [
  {
    value: 'sale',
    label: 'For Sale',
    icon: <Home className="w-8 h-8" />,
    description: 'List this property for buyers.',
    color: 'blue',
  },
  {
    value: 'rent',
    label: 'To Rent',
    icon: <Key className="w-8 h-8" />,
    description: 'List this property for prospective tenants.',
    color: 'green',
  },
];

const ActionStep: React.FC = () => {
  const { action, setListingIntent } = useListingWizardStore();
  const selectedIntent = listingActionToIntent(action);
  const optionRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  // Validation
  const actionValidation = useFieldValidation({
    field: 'action',
    value: action,
    context: { currentStep: 1 },
    trigger: 'submit',
  });

  const handleSelect = (value: ListingIntent) => {
    setListingIntent(value);
    actionValidation.clearError();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    let nextIndex: number | undefined;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % LISTING_INTENT_OPTIONS.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + LISTING_INTENT_OPTIONS.length) % LISTING_INTENT_OPTIONS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = LISTING_INTENT_OPTIONS.length - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      const nextOption = LISTING_INTENT_OPTIONS[nextIndex];
      handleSelect(nextOption.value);
      optionRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(LISTING_INTENT_OPTIONS[index].value);
    }
  };

  return (
    <div className="py-2 sm:py-4">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
          Step 1 · Listing intent
        </p>
        <h2
          id="listing-intent-heading"
          className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950"
        >
          How should this property be marketed?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Choose whether it is available for sale or rent. We&apos;ll tailor the pricing and
          availability details in the next steps.
        </p>
      </div>

      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        role="radiogroup"
        aria-labelledby="listing-intent-heading"
        aria-required="true"
      >
        {LISTING_INTENT_OPTIONS.map((option, index) => {
          const isSelected = selectedIntent === option.value;

          return (
            <Card
              key={option.value}
              ref={element => {
                optionRefs.current[index] = element;
              }}
              onClick={() => handleSelect(option.value)}
              onKeyDown={event => handleKeyDown(event, index)}
              role="radio"
              aria-checked={isSelected}
              aria-describedby={`listing-intent-${option.value}-description`}
              tabIndex={isSelected || (!selectedIntent && index === 0) ? 0 : -1}
              className={`relative cursor-pointer rounded-2xl border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.09)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${
                isSelected
                  ? option.color === 'blue'
                    ? 'border-[var(--primary)] bg-[color:color-mix(in_oklab,var(--primary)_7%,white)] shadow-[0_10px_24px_rgba(0,92,168,0.12)]'
                    : 'border-emerald-400 bg-emerald-50 shadow-[0_10px_24px_rgba(5,150,105,0.1)]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div
                  className={`absolute top-4 right-4 rounded-full p-1 shadow-lg ${
                    option.color === 'blue' ? 'bg-[var(--primary)]' : 'bg-emerald-500'
                  }`}
                >
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}

              <div className="flex flex-col items-center space-y-3 p-6 text-center sm:p-7">
                {/* Icon */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                    isSelected
                      ? option.color === 'blue'
                        ? 'bg-[color:color-mix(in_oklab,var(--primary)_12%,white)] text-[var(--primary)]'
                        : 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {option.icon}
                </div>

                {/* Label */}
                <h3
                  className={`text-xl font-semibold tracking-[-0.025em] transition-colors ${
                    isSelected
                      ? option.color === 'blue'
                        ? 'text-[var(--primary)]'
                        : 'text-emerald-700'
                      : 'text-slate-950'
                  }`}
                >
                  {option.label}
                </h3>

                {/* Description */}
                <p
                  id={`listing-intent-${option.value}-description`}
                  className="text-sm leading-5 text-slate-600"
                >
                  {option.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Validation Error */}
      {actionValidation.error && (
        <div className="mt-6">
          <InlineError error={actionValidation.error} show={!!actionValidation.error} />
        </div>
      )}

      {/* Supporting explanation */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm leading-5 text-slate-600">
          You can change this choice before you submit the listing.
        </p>
      </div>
    </div>
  );
};

export default ActionStep;
