import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_SHORTLIST_OPTIONS } from './distributionShortlistStorage';
import { ShortlistPrintView } from './ShortlistPrintView';
import { useDistributionShortlist } from './useDistributionShortlist';

export {
  MAX_SHORTLIST_OPTIONS,
  readSavedSelections,
  shortlistStorageKey,
  publicShortlistStorageKey,
  type ShortlistOption,
  type ShortlistSelection,
} from './distributionShortlistStorage';

export function PropertyOpportunityShortlist({
  marketMode,
  searchSummary,
  opportunities,
  currentOpportunities,
  storageScope,
}: {
  marketMode: 'sale' | 'rent';
  searchSummary: string;
  opportunities: import('./distributionShortlistStorage').ShortlistOption[];
  currentOpportunities: import('./distributionShortlistStorage').ShortlistOption[];
  storageScope: string;
}) {
  const {
    selectedOptions,
    selectedIds,
    toggleOption,
    removeOption,
    publicSelectionCount,
    importMessage,
    importPublicShortlist,
  } = useDistributionShortlist({
    marketMode,
    searchSummary,
    storageScope,
    currentOpportunities,
  });
  const selectionLimitReached = selectedOptions.length >= MAX_SHORTLIST_OPTIONS;

  return (
    <>
      <div className="w-full space-y-3 print:hidden">
        <details className="rounded-md border border-primary/15 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            Choose up to {MAX_SHORTLIST_OPTIONS} options for a shareable shortlist
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {selectedOptions.length} selected
            </span>
          </summary>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Select the options you want to discuss. Changing filters keeps your selections; switching
            between buying and renting starts a separate shortlist.
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Your options and search preferences stay in this browser and can carry into your signed-in catalogue. Current details are refreshed before sharing. No name, ID, income, or contact details are saved here.
          </p>
          {publicSelectionCount > 0 && storageScope.startsWith('partner:') ? (
            <div className="mt-3 rounded-md border border-primary/15 bg-primary/5 p-3">
              <p className="text-xs text-slate-700">
                You have {publicSelectionCount} option{publicSelectionCount === 1 ? '' : 's'} in your public shortlist for this search.
              </p>
              <Button type="button" variant="outline" className="mt-2" onClick={importPublicShortlist}>
                Continue with public shortlist
              </Button>
              {importMessage ? <p role="status" className="mt-2 text-xs text-muted-foreground">{importMessage}</p> : null}
            </div>
          ) : null}
          {opportunities.length ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {opportunities.map(option => {
                const id = String(option.id);
                const checked = selectedIds.has(id);
                return (
                  <li key={id}>
                    <label className="flex h-full cursor-pointer items-start gap-3 rounded-md border border-primary/10 p-3 text-sm hover:bg-primary/5">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && selectionLimitReached}
                        onChange={() => toggleOption(option)}
                        className="mt-0.5 h-4 w-4 accent-primary"
                        aria-label={`Add ${option.name} to shortlist`}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-900">{option.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {[option.location, option.priceLabel].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 rounded border border-dashed p-3 text-sm text-muted-foreground">
              No current options match these search choices. Adjust the filters to find options to add.
            </p>
          )}
          {selectedOptions.length ? (
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="text-xs font-semibold text-slate-700">Selected options</p>
              <ul className="mt-2 space-y-1">
                {selectedOptions.map(selection => (
                  <li key={selection.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate text-slate-700">{selection.option.name}</span>
                    <button
                      type="button"
                      onClick={() => removeOption(selection.id)}
                      className="shrink-0 font-medium text-primary underline underline-offset-2"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </details>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-5 text-muted-foreground">
            The shortlist is for discussion. It is not a credit decision or a saved referral.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedOptions.length}
            onClick={() => window.print()}
          >
            <Download className="mr-2 h-4 w-4" />
            Print {selectedOptions.length ? `${selectedOptions.length} selected option${selectedOptions.length === 1 ? '' : 's'}` : 'selected options'} or save as PDF
          </Button>
        </div>
      </div>
      <ShortlistPrintView marketMode={marketMode} selectedOptions={selectedOptions} />
    </>
  );
}
