import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';

export default function BasicInformationStep() {
  const store = useListingWizardStore();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Property Details</h3>
      <p className="text-sm text-slate-500">Tell us about your property</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input
            type="text"
            value={store.title}
            onChange={(e) => store.setTitle(e.target.value)}
            placeholder="e.g. Modern 3-Bedroom Apartment in Sandton"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
          <p className="text-xs text-slate-400 mt-1">{store.title.length} / 255 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={store.description}
            onChange={(e) => store.setDescription(e.target.value)}
            placeholder="Describe your property in detail..."
            rows={6}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-y"
          />
          <p className="text-xs text-slate-400 mt-1">{store.description.length} characters (min 50 recommended)</p>
        </div>
      </div>
    </div>
  );
}