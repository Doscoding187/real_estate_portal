import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatSARandShort } from '@/lib/bond-calculator';
import { formatPriceCompact } from '@/lib/formatPrice';
import { Calculator, Calendar, TrendingUp } from 'lucide-react';

interface DevelopmentOverviewCardProps {
  priceFrom: number;
  priceTo?: number;
  monthlyRepayment: number;
  minimumIncome: number;
  constructionStatus?: string;
  completionDate?: string;
  salesMetrics?: {
    soldPct: number | null;
    total: number;
    available: number;
    sold?: number;
  };
}

export function DevelopmentOverviewCard({
  priceFrom,
  priceTo,
  monthlyRepayment,
  minimumIncome,
  constructionStatus = 'Now Selling',
  completionDate,
  salesMetrics,
}: DevelopmentOverviewCardProps) {
  const priceRange = priceTo
    ? `${formatPriceCompact(priceFrom)} - ${formatPriceCompact(priceTo)}`
    : formatPriceCompact(priceFrom);
  const soldPct = salesMetrics?.soldPct ?? null;
  const unitsLeft = salesMetrics?.available ?? 0;
  const showSalesProgress = typeof soldPct === 'number' && (salesMetrics?.total ?? 0) > 0;

  return (
    <Card className="w-full bg-white shadow-sm border-slate-200 h-full">
      <CardContent className="p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-5">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Price From</p>
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
                {priceRange}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  Est. Repayment
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {formatSARandShort(monthlyRepayment)}
                  <span className="text-sm font-medium text-slate-500"> / month</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  Qualifying Income
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {formatSARandShort(minimumIncome)}
                  <span className="text-sm font-medium text-slate-500"> / month</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Estimated using a 20-year bond term and standard prime lending rate.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-5">
            <div className="flex items-center gap-2 text-slate-900">
              <Calendar className="h-4 w-4 text-orange-500" />
              <h3 className="font-bold text-base">Development Details</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-slate-900">
                  {constructionStatus || 'Now Selling'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Expected completion</span>
                <span className="font-semibold text-slate-900">
                  {completionDate || 'Completion TBC'}
                </span>
              </div>
              {salesMetrics && salesMetrics.total > 0 && (
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
                  indicatorClassName="bg-orange-500"
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
                Availability updates will appear here once inventory is confirmed.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
