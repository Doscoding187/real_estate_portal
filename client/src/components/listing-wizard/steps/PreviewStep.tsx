import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Button } from '@/components/ui/button';
import { Check, Home } from 'lucide-react';

export default function PreviewStep({ onSaveDraft, isSavingDraft }: { onSaveDraft?: () => void; isSavingDraft?: boolean }) {
  const store = useListingWizardStore();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Review & Publish</h3>
      <p className="text-sm text-slate-500">Review your listing before publishing</p>

      <div className="bg-slate-50 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-900">{store.title || 'Untitled Listing'}</h4>
          <span className="text-sm text-slate-500">{store.action} — {store.propertyType}</span>
        </div>

        <div className="border-t border-slate-200 pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-slate-600">Pricing set</span>
          </div>
          {store.location?.address && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-slate-600">{store.location.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-4 h-4 rounded-full ${store.media.length > 0 ? 'bg-green-500' : 'bg-slate-300'}`} />
            <span className="text-slate-600">{store.media.length} media item(s)</span>
          </div>
        </div>

        <p className="text-sm text-slate-400 mt-2">
          {store.description ? store.description.slice(0, 150) + '...' : 'No description'}
        </p>
      </div>

      {store.media.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Your listing won't be published until you add at least one photo.
        </div>
      )}
    </div>
  );
}