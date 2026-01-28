import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SA_PRIME_RATE, calculateMonthlyRepayment, formatSARandShort } from '@/lib/bond-calculator';
import { formatPriceCompact } from '@/lib/formatPrice';
import { Separator } from '@/components/ui/separator';

interface DevelopmentOverviewCardProps {
  priceFrom: number;
  priceTo?: number;
  constructionStatus?: string; // e.g., "Selling", "Launching Soon"
  projectStatus?: string; // e.g., "Selling"
  completionDate?: string;
  progressPercentage?: number;
  salesMetrics?: {
    soldPct: number | null;
    total: number;
    available: number;
  };
}

export function DevelopmentOverviewCard({
  priceFrom,
  priceTo,
  constructionStatus = 'Selling',
  projectStatus,
  completionDate,
  progressPercentage = 0,
  salesMetrics,
}: DevelopmentOverviewCardProps) {
  // Use salesMetrics if provided, otherwise fall back to progressPercentage
  const displayProgress = salesMetrics?.soldPct ?? progressPercentage;
  const showProgress = salesMetrics ? salesMetrics.total > 0 : displayProgress > 0;

  // Calculate estimated monthly repayment based on starting price
  // Assumptions: 20 years, Prime Interest Rate, 0% Deposit (conservative "from")
  const monthlyRepayment = calculateMonthlyRepayment(priceFrom, SA_PRIME_RATE, 20);

  const priceRange = priceTo
    ? `${formatPriceCompact(priceFrom)} - ${formatPriceCompact(priceTo)}`
    : formatPriceCompact(priceFrom);

  return (
    <Card className="w-full bg-white shadow-sm border-slate-200 h-full">
      <CardContent className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left Column: Price & Finance */}
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Priced From</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                {priceRange}
              </h2>
            </div>

            <div>
              <p className="text-slate-600 text-sm font-medium">
                Est. Repayments From:{' '}
                <span className="text-slate-900 font-bold">
                  {formatSARandShort(monthlyRepayment)}/pm
                </span>
              </p>
            </div>

            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              Get Pre-Qualified
            </Button>
          </div>

          {/* Vertical Separator (Desktop only) */}
          <div className="hidden lg:block w-px bg-slate-100 self-stretch" />

          {/* Right Column: Project Status */}
          <div className="flex-1 space-y-6">
            <h3 className="text-slate-900 font-bold text-base">Project Status</h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-slate-900">{constructionStatus}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Expected Completion Date</span>
                <span className="font-semibold text-orange-500">{completionDate || 'TBA'}</span>
              </div>

              {showProgress ? (
                <div className="space-y-2 pt-2">
                  <Progress
                    value={displayProgress}
                    className="h-2.5 bg-slate-100"
                    indicatorClassName="bg-blue-500"
                  />
                  <p className="text-slate-600 text-xs font-medium">
                    {salesMetrics ? `${displayProgress}% sold out` : `${displayProgress}% Complete`}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-xs italic pt-2">Sales data unavailable</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
