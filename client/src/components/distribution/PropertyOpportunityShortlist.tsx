import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_SHORTLIST_OPTIONS = 5;

export type ShortlistOption = {
  id: number | string;
  name: string;
  location: string;
  publisher?: string | null;
  imageUrl?: string | null;
  url?: string | null;
  priceLabel: string;
  availabilityLabel: string;
  propertyDetails?: string[];
  description?: string | null;
};

function currentTimestamp() {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
}

export function PropertyOpportunityShortlist({
  marketMode,
  searchSummary,
  opportunities,
}: {
  marketMode: 'sale' | 'rent';
  searchSummary: string;
  opportunities: ShortlistOption[];
}) {
  const [selectedById, setSelectedById] = useState<Record<string, {
    option: ShortlistOption;
    searchSummary: string;
  }>>({});
  const currentOptionsById = useMemo(
    () => new Map(opportunities.map(option => [String(option.id), option])),
    [opportunities],
  );
  const selectedOptions = Object.entries(selectedById).map(([id, selection]) => ({
    id,
    option: currentOptionsById.get(id) || selection.option,
    searchSummary: selection.searchSummary,
  }));
  const selectedIds = new Set(selectedOptions.map(selection => selection.id));
  const selectedSearchSummaries = [...new Set(
    selectedOptions.map(selection => selection.searchSummary).filter(Boolean),
  )];

  const toggleOption = (option: ShortlistOption) => {
    const id = String(option.id);
    setSelectedById(current => {
      if (current[id]) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      if (Object.keys(current).length >= MAX_SHORTLIST_OPTIONS) return current;
      return { ...current, [id]: { option, searchSummary } };
    });
  };

  const removeOption = (id: string) => {
    setSelectedById(current => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const generatedAt = currentTimestamp();

  return (
    <>
      <style>{`
        .distribution-shortlist-print { display: none !important; }
        @media print {
          @page { margin: 16mm; }
          body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .distribution-shortlist-print,
          .distribution-shortlist-print * { visibility: visible !important; }
          .distribution-shortlist-print {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            padding: 12mm !important;
            overflow: visible !important;
            color: #0f172a !important;
            background: #fff !important;
            font-family: Arial, sans-serif !important;
          }
          .distribution-shortlist-print__option { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
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
          {opportunities.length ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {opportunities.map(option => {
                const id = String(option.id);
                const checked = selectedIds.has(id);
                const selectionLimitReached = selectedOptions.length >= MAX_SHORTLIST_OPTIONS;
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
      <section className="distribution-shortlist-print" aria-hidden="true">
        <header style={{ borderBottom: '2px solid #0f5ea8', paddingBottom: 18, marginBottom: 22 }}>
          <p style={{ color: '#0f5ea8', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Property Listify
          </p>
          <h1 style={{ margin: '8px 0', fontSize: 26 }}>Property opportunity shortlist</h1>
          <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>
            {marketMode === 'sale' ? 'Purchase' : 'Rental'} options · Prepared {generatedAt}
          </p>
        </header>

        {selectedSearchSummaries.length ? (
          <section style={{ marginBottom: 22, borderRadius: 8, background: '#f1f5f9', padding: 14 }}>
            <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              Search preferences used
            </p>
            {selectedSearchSummaries.map(summary => (
              <p key={summary} style={{ margin: '4px 0 0', fontSize: 13 }}>{summary}</p>
            ))}
          </section>
        ) : null}

        <div style={{ display: 'grid', gap: 14 }}>
          {selectedOptions.map(({ option }, index) => (
            <article
              key={option.id}
              className="distribution-shortlist-print__option"
              style={{ display: 'grid', gridTemplateColumns: option.imageUrl ? '130px 1fr' : '1fr', gap: 16, border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}
            >
              {option.imageUrl ? (
                <img src={option.imageUrl} alt="" style={{ width: 130, height: 96, borderRadius: 5, objectFit: 'cover' }} />
              ) : null}
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                  Option {index + 1}
                </p>
                <h2 style={{ margin: '0 0 3px', fontSize: 17 }}>{option.name}</h2>
                <p style={{ margin: '0 0 8px', color: '#475569', fontSize: 12 }}>{option.location}</p>
                <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 700 }}>{option.priceLabel}</p>
                <p style={{ margin: 0, color: '#475569', fontSize: 11 }}>{option.availabilityLabel}</p>
                {option.propertyDetails?.length ? (
                  <p style={{ margin: '7px 0 0', color: '#475569', fontSize: 11 }}>
                    {option.propertyDetails.join(' · ')}
                  </p>
                ) : null}
                {option.publisher ? (
                  <p style={{ margin: '7px 0 0', color: '#64748b', fontSize: 10 }}>
                    Published by {option.publisher}
                  </p>
                ) : null}
                {option.description ? (
                  <p style={{ margin: '7px 0 0', color: '#334155', fontSize: 11, lineHeight: 1.45 }}>
                    {option.description}
                  </p>
                ) : null}
                {option.url ? (
                  <p style={{ margin: '7px 0 0', color: '#0f5ea8', fontSize: 10 }}>
                    propertylistifysa.co.za{option.url}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <footer style={{ marginTop: 24, borderTop: '1px solid #cbd5e1', paddingTop: 12, color: '#475569', fontSize: 10, lineHeight: 1.5 }}>
          These selected options are for discussion only. This is not a credit assessment, loan
          approval, property offer, or guarantee of availability. Prices and stock can change;
          confirm current details with the developer.
        </footer>
      </section>
    </>
  );
}
