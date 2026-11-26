import React from 'react';
import { ImageOff } from 'lucide-react';
import { formatRand, type DevelopmentPreviewModel } from './previewModel';

const tag = 'inline-flex h-5 items-center rounded px-2 text-[11px] font-semibold';

/** "What buyers will see": development card and a unit listing card, fed live from the wizard. */
export function WizardLivePreview({
  model,
  publisherName,
}: {
  model: DevelopmentPreviewModel;
  publisherName?: string | null;
}) {
  const unit = model.unit;
  const developmentName = model.name || 'Your development name';
  const facts = [
    model.bedsRange ? `${model.bedsRange} beds` : null,
    model.sizeRange,
    model.unitTypeCount > 0
      ? `${model.unitTypeCount} house type${model.unitTypeCount === 1 ? '' : 's'}`
      : null,
  ].filter(Boolean);

  return (
    <aside aria-label="Live preview" className="flex flex-col gap-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        What buyers will see
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="relative">
          {model.coverUrl ? (
            <img
              src={model.coverUrl}
              alt={`Cover photo of ${developmentName}`}
              className="block h-[150px] w-full object-cover"
            />
          ) : (
            <div className="flex h-[150px] w-full flex-col items-center justify-center gap-1 bg-slate-100 text-xs text-slate-500">
              <ImageOff className="h-6 w-6" aria-hidden="true" />
              Cover photo appears here
            </div>
          )}
          {model.transactionLabel && (
            <span
              data-testid="preview-transaction"
              className={`${tag} absolute right-3 top-3 bg-blue-700 text-white`}
            >
              {model.transactionLabel}
            </span>
          )}
          {model.statusBadge && (
            <span className={`${tag} absolute left-3 top-3 bg-white text-slate-900`}>
              {model.statusBadge}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 p-3">
          <div className="text-[11px] text-slate-600">
            New development
            {model.phaseLabel ? ` · ${model.phaseLabel}` : ''}
            {publisherName ? ` · ${publisherName}` : ''}
          </div>
          <div className="text-base font-bold leading-snug text-slate-900" data-testid="preview-name">
            {developmentName}
          </div>
          {model.tagline && (
            <div className="text-xs leading-snug text-slate-700">{model.tagline}</div>
          )}
          {model.locationLabel && (
            <div className="text-xs text-slate-600">{model.locationLabel}</div>
          )}
          {model.priceFrom != null && (
            <div className="mt-0.5 text-base font-bold text-slate-900">
              From {formatRand(model.priceFrom)}
            </div>
          )}
          {facts.length > 0 && <div className="text-xs text-slate-700">{facts.join(' · ')}</div>}
          <div className="mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-hidden">
            {model.highlights.map(label => (
              <span
                key={label}
                className={`${tag} whitespace-nowrap bg-orange-50 text-orange-800`}
              >
                {label}
              </span>
            ))}
            {model.moreHighlights > 0 && (
              <span className="whitespace-nowrap text-xs text-slate-600">
                +{model.moreHighlights} more
              </span>
            )}
            {model.highlights.length === 0 && (
              <span className="text-xs text-slate-500">Highlights appear here</span>
            )}
          </div>
          {model.tags.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1.5">
              {model.tags.map(label => (
                <span key={label} className={`${tag} bg-slate-100 text-slate-800`}>
                  {label}
                </span>
              ))}
            </div>
          )}
          {model.timelineLine && (
            <div className="mt-1 text-xs text-slate-600" data-testid="preview-timeline">
              {model.timelineLine}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-1 p-3">
          <div className="text-[11px] text-slate-600">Unit listing in search results</div>
          {unit ? (
            <>
              <div className="text-sm font-bold text-slate-900">{unit.name}</div>
              <div className="text-[11px] text-slate-600">
                {developmentName}
                {model.locationLabel ? ` · ${model.locationLabel}` : ''}
              </div>
              <div className="text-xs text-slate-700">
                {[
                  unit.beds != null ? `${unit.beds} beds` : null,
                  unit.baths != null ? `${unit.baths} baths` : null,
                  unit.priceFrom != null ? `From ${formatRand(unit.priceFrom)}` : null,
                  unit.available != null && unit.available > 0
                    ? `${unit.available} available`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500">Appears once you add a house type.</div>
          )}
        </div>
      </div>

      <div className="text-xs text-slate-600">
        Updates as you type. Nothing is public until you publish.
      </div>
    </aside>
  );
}
