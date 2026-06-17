import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BasicInformationStep() {
  const store = useListingWizardStore();

  const titleLength = store.title.length;
  const descriptionLength = store.description.length;
  const titleValid = titleLength >= 10;
  const descValid = descriptionLength >= 50;
  const allValid = titleValid && descValid;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-slate-900">Property Details</h3>
        <p className="text-sm text-slate-500 mt-1">
          Create a compelling title and description to attract buyers
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-semibold text-slate-700">
          Property Title
        </label>
        <input
          id="title"
          type="text"
          value={store.title}
          onChange={(e) => store.setTitle(e.target.value)}
          placeholder="e.g. Modern 3-Bedroom Apartment in Sandton with Pool"
          maxLength={255}
          aria-invalid={titleLength > 0 && !titleValid}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 text-base outline-none transition-all',
            'focus:ring-2 focus:ring-blue-500/20',
            titleLength === 0
              ? 'border-slate-300 bg-white'
              : titleValid
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-red-300 bg-red-50/30',
          )}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            'flex items-center gap-1',
            titleLength === 0 ? 'text-slate-400' : titleValid ? 'text-emerald-700' : 'text-red-600',
          )}>
            {titleLength > 0 && (
              titleValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />
            )}
            {titleLength === 0
              ? 'Min 10 characters'
              : titleValid
                ? 'Looks good!'
                : `${10 - titleLength} more characters needed`}
          </span>
          <span className={cn(
            'font-mono',
            titleLength > 240 ? 'text-red-600 font-semibold' : 'text-slate-500',
          )}>
            {titleLength} / 255
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-semibold text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          value={store.description}
          onChange={(e) => store.setDescription(e.target.value)}
          placeholder="Describe your property in detail — features, finishes, neighbourhood, amenities..."
          rows={8}
          maxLength={5000}
          aria-invalid={descriptionLength > 0 && !descValid}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 text-base leading-relaxed outline-none transition-all resize-y',
            'focus:ring-2 focus:ring-blue-500/20',
            descriptionLength === 0
              ? 'border-slate-300 bg-white'
              : descValid
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-red-300 bg-red-50/30',
          )}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            'flex items-center gap-1',
            descriptionLength === 0 ? 'text-slate-400' : descValid ? 'text-emerald-700' : 'text-red-600',
          )}>
            {descriptionLength > 0 && (
              descValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />
            )}
            {descriptionLength === 0
              ? 'Min 50 characters'
              : descValid
                ? 'Great description!'
                : `${50 - descriptionLength} more characters needed`}
          </span>
          <span className={cn(
            'font-mono',
            descriptionLength > 4800 ? 'text-red-600 font-semibold' : 'text-slate-500',
          )}>
            {descriptionLength} / 5,000
          </span>
        </div>
      </div>

      {/* Live Title Preview */}
      {store.title && (
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Title Preview</p>
          <p className="text-sm text-slate-700 line-clamp-2">{store.title}</p>
        </div>
      )}
    </div>
  );
}
