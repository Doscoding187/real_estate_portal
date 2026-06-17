/**
 * ActionStep
 *
 * Step 1: Select listing action (Sell / Rent / Auction).
 * In pre-workflow mode this is rendered standalone; once selected
 * the workflow is resolved and the full WizardEngine renders.
 */

import React, { useState, useCallback } from 'react';
import { useListingWizardContext } from '../contexts/ListingWizardContext';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Home, CalendarClock, Gavel, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  {
    value: 'sell' as const,
    label: 'Sell',
    icon: Home,
    description: 'List your property for sale',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-200',
  },
  {
    value: 'rent' as const,
    label: 'Rent',
    icon: CalendarClock,
    description: 'List your property for rent',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100',
    borderColor: 'border-emerald-200',
  },
  {
    value: 'auction' as const,
    label: 'Auction',
    icon: Gavel,
    description: 'Sell via public auction',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    borderColor: 'border-purple-200',
  },
];

export default function ActionStep() {
  const ctx = useListingWizardContext();
  const store = useListingWizardStore();

  const handleSelect = (action: 'sell' | 'rent' | 'auction') => {
    store.setAction(action);
    // If property type is already selected too, init the workflow
    if (store.propertyType) {
      ctx.initWorkflow(action, store.propertyType);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          What would you like to do with your property?
        </h3>
        <p className="text-sm text-slate-500">
          Choose the type of listing you want to create
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action) => {
          const isSelected = store.action === action.value;
          const Icon = action.icon;

          return (
            <button
              key={action.value}
              onClick={() => handleSelect(action.value)}
              aria-pressed={isSelected}
              aria-label={`${action.label}: ${action.description}`}
              className={cn(
                'relative flex flex-col items-center gap-4 p-6 rounded-xl border-2 text-center',
                'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                isSelected
                  ? `${action.bgColor} ${action.borderColor} shadow-md ring-1 ring-blue-500/20`
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm',
              )}
            >
              <div className={cn('p-4 rounded-full transition-all', isSelected ? 'bg-white shadow-sm scale-110' : 'bg-slate-50')}>
                <Icon className={cn('w-10 h-10', action.color)} />
              </div>

              <div className="space-y-1">
                <h4 className={cn('font-bold text-xl', isSelected ? 'text-slate-900' : 'text-slate-700')}>
                  {action.label}
                </h4>
                <p className="text-sm text-slate-500 leading-relaxed">{action.description}</p>
              </div>

              {isSelected && (
                <div className="absolute top-3 right-3 animate-in fade-in zoom-in">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
              )}

              <span className="sr-only">
                {isSelected ? 'Selected' : 'Not selected'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}