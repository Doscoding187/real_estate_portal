import { MapPin, X } from 'lucide-react';

export interface SelectedLocationChipProps {
  /** The place being searched, as the search authority resolved it. */
  label: string;
  /** The parent it sits in, so a suburb is never shown without its city. */
  contextLabel?: string;
  /** Removes the location from the search, returning to the country-wide default. */
  onRemove?: () => void;
  /** Opens the location picker, when the surface has one. */
  onChange?: () => void;
}

/**
 * The location a property search is scoped to.
 *
 * A search that has a location must say so, and the customer must be able to change it or take
 * it away without starting over. The chip names the place and the parent it sits in, and the
 * label is a button that opens the picker, so "Melville" is never shown without "Johannesburg".
 *
 * Removing the chip is a widening the customer asked for, not a silent one: the search returns
 * to the country-wide default, which is the same search a customer gets when they never chose
 * a location.
 */
export function SelectedLocationChip({
  label,
  contextLabel,
  onRemove,
  onChange,
}: SelectedLocationChipProps) {
  return (
    <span
      data-testid="selected-location-chip"
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white pl-2.5 pr-1.5 py-1 text-xs font-semibold text-slate-800"
    >
      <MapPin className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
        >
          {label}
        </button>
      ) : (
        <span>{label}</span>
      )}
      {contextLabel ? (
        <span className="font-normal text-slate-500">{contextLabel}</span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove the ${label} location filter`}
          className="ml-0.5 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
