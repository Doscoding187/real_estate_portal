import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';

export default function MediaUploadStep() {
  const store = useListingWizardStore();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Photos & Media</h3>
      <p className="text-sm text-slate-500">Upload photos and media for your listing</p>
      <div className="p-12 rounded-xl border border-dashed border-slate-200 text-center text-slate-400">
        <p>Drag & drop upload coming in Week 9</p>
        <p className="text-xs mt-2">(S3 upload, preview, reordering)</p>
      </div>
    </div>
  );
}