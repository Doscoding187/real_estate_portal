import { ArrowRight, FileDown, Info, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  formatBrochureCurrency,
  formatBrochureCurrencyRange,
  getBrochureHighlights,
  getBrochureUnitRows,
  openBrochurePrintWindow,
  type BrochureItem,
} from '@/lib/distributionBrochure';

export function DevelopmentBrochureDialog({
  open,
  onOpenChange,
  item,
  canStartReferral,
  onStartReferral,
  onDownload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BrochureItem | null;
  canStartReferral?: boolean;
  onStartReferral?: () => void;
  onDownload?: () => void;
}) {
  if (!item) return null;

  const { visibleRows, hiddenUnitCount } = getBrochureUnitRows(item);
  const { brandName = 'Listify Property' } = item.brand ?? {};
  const rate = item.affordability?.annualInterestRate;
  const rateAvailable = Boolean(item.affordability?.available && rate);
  const location = item.locationLabels?.join(', ') || 'Location to be confirmed';
  const description = item.description || item.programPromotion?.description || '';
  const highlights = getBrochureHighlights(item);
  const heroImage = item.imageUrl || item.campaign?.images?.[0] || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-[#0b1c3f]">{item.developmentName} brochure</DialogTitle>
          <DialogDescription>
            Print or save a one-page A4 summary with current unit pricing and indicative
            affordability.
          </DialogDescription>
        </DialogHeader>

        <article className="overflow-hidden rounded-lg border border-border">
          <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <h3 className="text-lg font-semibold uppercase tracking-wide text-[#0b1c3f]">
                {item.developmentName}
              </h3>
              {location ? (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {location}
                </p>
              ) : null}
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground">{brandName}</p>
          </header>

          {heroImage ? (
            <img
              src={heroImage}
              alt={`${item.developmentName} development`}
              className="h-44 w-full object-cover"
            />
          ) : (
            <div className="flex h-32 items-center justify-center bg-surface text-sm text-muted-foreground">
              Development image
            </div>
          )}

          {description ? (
            <p className="border-b border-border px-4 py-3 text-[12px] leading-5 text-muted-foreground">
              {String(description).slice(0, 360)}
            </p>
          ) : null}

          <div className="overflow-x-auto p-3 sm:p-0">
            <table className="block w-full border-collapse text-left text-[11.5px] sm:table">
              <thead className="hidden sm:table-header-group">
                <tr className="border-b border-[#0b1c3f]">
                  <th className="px-3 py-2 font-semibold uppercase text-muted-foreground">Unit</th>
                  <th className="px-3 py-2 font-semibold uppercase text-muted-foreground">Type</th>
                  <th className="px-3 py-2 font-semibold uppercase text-muted-foreground">Price</th>
                  <th className="px-3 py-2 font-semibold uppercase text-muted-foreground">
                    Est. bond
                  </th>
                  <th className="px-3 py-2 font-semibold uppercase text-muted-foreground">
                    Qualifying income
                  </th>
                </tr>
              </thead>
              <tbody className="block sm:table-row-group">
                {visibleRows.length ? (
                  visibleRows.map(row => (
                    <tr
                      key={row.unit.id || row.unit.name}
                      className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-border px-3 py-3 last:mb-0 sm:mb-0 sm:table-row sm:rounded-none sm:border-0 sm:border-b sm:border-border sm:p-0"
                    >
                      <td className="col-span-2 flex flex-col gap-0.5 sm:table-cell sm:px-3 sm:py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:hidden">
                          Unit
                        </span>
                        <span className="font-semibold text-[#0b1c3f]">
                          {row.unit.name || 'Unit'}
                        </span>
                      </td>
                      <td className="flex flex-col gap-0.5 text-muted-foreground sm:table-cell sm:px-3 sm:py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:hidden">
                          Type
                        </span>
                        <span>
                          {[
                            row.unit.size ? `${row.unit.size} m²` : null,
                            row.unit.bedrooms ? `${row.unit.bedrooms} bed` : null,
                            row.unit.bathrooms ? `${row.unit.bathrooms} bath` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </td>
                      <td className="flex flex-col gap-0.5 sm:table-cell sm:px-3 sm:py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:hidden">
                          Price
                        </span>
                        <span className="font-semibold text-[#0b1c3f]">
                          {formatBrochureCurrencyRange(row.priceFrom, row.priceTo)}
                        </span>
                      </td>
                      <td className="flex flex-col gap-0.5 sm:table-cell sm:px-3 sm:py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:hidden">
                          Est. bond
                        </span>
                        <span>
                          {rateAvailable
                            ? formatBrochureCurrency(row.monthlyRepayment)
                            : 'Unavailable'}
                        </span>
                      </td>
                      <td className="flex flex-col gap-0.5 sm:table-cell sm:px-3 sm:py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:hidden">
                          Qualifying income
                        </span>
                        <span>
                          {rateAvailable
                            ? formatBrochureCurrency(row.qualifyingIncome)
                            : 'Unavailable'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="block rounded-lg border border-border sm:table-row sm:rounded-none sm:border-0">
                    <td colSpan={5} className="block px-3 py-3 text-muted-foreground sm:table-cell">
                      Unit options available on request.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hiddenUnitCount > 0 ? (
            <p className="px-4 py-2 text-[11px] text-muted-foreground">
              {hiddenUnitCount} more option{hiddenUnitCount === 1 ? '' : 's'} available on request;
              the A4 summary shows up to 8 unit types.
            </p>
          ) : null}

          <section className="border-t border-border bg-surface/60 px-4 py-3 text-[11px] leading-5 text-muted-foreground">
            {rateAvailable ? (
              <p>
                Estimates use a {item.affordability?.termMonths}-month bond at{' '}
                {Number(rate).toFixed(2)}% ({item.affordability?.rateSourceLabel}). Qualifying
                income assumes repayment is{' '}
                {Math.round((item.affordability?.repaymentAllowanceRatio ?? 0) * 100)}% of gross
                monthly income. Figures are indicative only and are not a lender decision.
              </p>
            ) : (
              <p className="flex items-start gap-1.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Affordability estimates are temporarily unavailable because the prime rate is not
                configured.
              </p>
            )}
          </section>

          <section className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-3">
            {highlights.map(highlight => (
              <p key={highlight} className="text-[11px] text-[#0b1c3f]">
                ✓ {highlight}
              </p>
            ))}
          </section>
        </article>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <p className="text-[11px] text-muted-foreground">
            Opens a print-ready A4 brochure in a new tab.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  openBrochurePrintWindow(item);
                }
                onDownload?.();
              }}
            >
              <FileDown className="mr-2 h-4 w-4" /> Print or save PDF
            </Button>
            {canStartReferral && onStartReferral ? (
              <Button variant="conversion" onClick={onStartReferral}>
                Start a referral <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
