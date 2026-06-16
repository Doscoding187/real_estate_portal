import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';

export default function AdditionalInformationStep() {
  const store = useListingWizardStore();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Additional Information</h3>
      <p className="text-sm text-slate-500">Add more details to help your listing stand out</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-slate-400">
          <p>Additional property fields coming in Week 6</p>
          <p className="text-xs mt-2">(Security, amenities, features, etc.)</p>
        </div>
      </div>
    </div>
  );
}