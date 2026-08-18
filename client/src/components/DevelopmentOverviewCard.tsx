import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatSARandShort } from '@/lib/bond-calculator';
import { formatPriceCompact } from '@/lib/formatPrice';
import { Calculator, Calendar, TrendingUp } from 'lucide-react';

interface DevelopmentOverviewCardProps {
  priceFrom: number | null;
  priceTo?: number | null;
  transactionType: 'for_sale' | 'for_rent';
  monthlyRepayment: number | null;
  minimumIncome: number | null;
  constructionStatus?: string;
  completionDate?: string;
  salesMetrics?: {
    soldPct: number | null;
    total: number;
    available: number;
    sold?: number;
  } | null;
}

export function DevelopmentOverviewCard({
  priceFrom,
  priceTo,
  transactionType,
  monthlyRepayment,
  minimumIncome,
  constructionStatus = 'Now Selling',
  completionDate,
  salesMetrics,
}: DevelopmentOverviewCardProps) {
  const isRental = transactionType === 'for_rent';
  const hasPrice = typeof priceFrom === 'number' && priceFrom > 0;
  const priceRange = hasPrice
    ? typeof priceFrom === 'number' && priceTo && priceTo > priceFrom
      ? `${formatPriceCompact(priceFrom)} - ${formatPriceCompact(priceTo)}`
      : typeof priceFrom === 'number'
        ? formatPriceCompact(priceFrom)
        : isRental
          ? 'Monthly rent on request'
          : 'Price on request'
    : isRental
      ? 'Monthly rent on request'
      : 'Price on request';
  const soldPct = salesMetrics?.soldPct ?? null;
  const unitsLeft = salesMetrics?.available ?? 0;
  const showSalesProgress =
    !isRental && typeof soldPct === 'number' && (salesMetrics?.total ?? 0) > 0;

  return (
    <Card className="w-full bg-white shadow-sm border-slate-200 h-full">
      <CardContent className="p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-5">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">
                {isRental ? 'Monthly rent from' : 'Price from'}
              </p>
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
                {isRental && hasPrice ? `${priceRange} / month` : priceRange}
              </h2>
            </div>

            {isRental ? (
              <p className="text-xs text-slate-500">
                Monthly rent and availability are supplied from the active unit types.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                      <Calculator className="h-4 w-4 text-primary" />
                      Est. Repayment
                    </div>
                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {monthlyRepayment !== null ? formatSARandShort(monthlyRepayment) : 'On request'}
                      {monthlyRepayment !== null ? (
                        <span className="text-sm font-medium text-slate-500"> / month</span>
                      ) : null}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                      <TrendingUp className="h-4 w-4 text-conversion" />
                      Qualifying Income
                    </div>
                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {minimumIncome !== null ? formatSARandShort(minimumIncome) : 'On request'}
                      {minimumIncome !== null ? (
                        <span className="text-sm font-medium text-slate-500"> / month</span>
                      ) : null}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Estimated using a 20-year bond term and standard prime lending rate.
                </p>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-5">
            <div className="flex items-center gap-2 text-slate-900">
              <Calendar className="h-4 w-4 text-conversion" />
              <h3 className="font-bold text-base">Development Details</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-slate-900">
                  {constructionStatus || 'Status unavailable'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Expected completion</span>
                <span className="font-semibold text-slate-900">
                  {completionDate || 'Completion date unavailable'}
                </span>
              </div>
              {!isRental && salesMetrics && salesMetrics.total > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Units available</span>
                  <span className="font-semibold text-slate-900">
                    {unitsLeft} of {salesMetrics.total}
                  </span>
                </div>
              )}
            </div>

            {showSalesProgress ? (
              <div className="space-y-2">
                <Progress
                  value={soldPct ?? 0}
                  className="h-2.5 bg-slate-200"
                  indicatorClassName="bg-conversion"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{soldPct}% sold</span>
                  <span className="text-slate-500">
                    {unitsLeft > 0 ? `Only ${unitsLeft} left` : 'Sold out'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {isRental
                  ? 'Monthly rent and availability are supplied from the active unit types.'
                  : 'Availability updates will appear here once inventory is confirmed.'}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
