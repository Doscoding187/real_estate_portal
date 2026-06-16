import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';

export default function LocationStep() {
  const store = useListingWizardStore();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Location</h3>
      <p className="text-sm text-slate-500">Where is the property located?</p>
      <div className="space-y-4">
        <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-slate-400">
          <p>Google Maps integration coming in Week 8</p>
          <p className="text-xs mt-2">(Address autocomplete, map pin, area insights)</p>
        </div>
      </div>
    </div>
  );
}