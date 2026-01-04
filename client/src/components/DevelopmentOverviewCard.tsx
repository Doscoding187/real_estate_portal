import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SA_PRIME_RATE, calculateMonthlyRepayment, formatSARandShort } from "@/lib/bond-calculator";
import { Separator } from "@/components/ui/separator";

interface DevelopmentOverviewCardProps {
  priceFrom: number;
  priceTo?: number;
  constructionStatus?: string; // e.g., "Under Construction"
  projectStatus?: string; // e.g., "Selling"
  completionDate?: string;
  progressPercentage?: number;
}

export function DevelopmentOverviewCard({
  priceFrom,
  priceTo,
  constructionStatus = "Under Construction",
  projectStatus = "Selling",
  completionDate,
  progressPercentage = 5
}: DevelopmentOverviewCardProps) {

  // Calculate estimated monthly repayment based on starting price
  // Assumptions: 20 years, Prime Interest Rate, 0% Deposit (conservative "from")
  const monthlyRepayment = calculateMonthlyRepayment(
    priceFrom,
    SA_PRIME_RATE,
    20
  );

  const priceRange = priceTo 
    ? `${formatSARandShort(priceFrom)} - ${formatSARandShort(priceTo)}`
    : formatSARandShort(priceFrom);

  return (
    <Card className="w-full bg-white shadow-sm border-slate-200 mb-8">
      <CardContent className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Left Column: Price & Finance */}
          <div className="flex-1 space-y-6">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Priced From</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                {priceRange}
              </h2>
            </div>

            <div>
              <p className="text-slate-600 text-sm font-medium">
                Est. Repayments From: <span className="text-slate-900 font-bold">{formatSARandShort(monthlyRepayment)}/pm</span>
              </p>
            </div>

            <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700 font-semibold text-sm">
              Get Pre-Qualified
            </Button>
          </div>

          {/* Vertical Separator (Desktop only) */}
          <div className="hidden lg:block w-px bg-slate-100 self-stretch" />

          {/* Right Column: Construction Status */}
          <div className="flex-1 space-y-6">
            <h3 className="text-slate-900 font-bold text-base">Construction Status</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Project Status</span>
                <span className="font-semibold text-slate-900">{constructionStatus}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Expected Handover Start Date</span>
                <span className="font-semibold text-orange-500">{completionDate || "TBA"}</span>
              </div>

              <div className="space-y-2 pt-2">
                <Progress value={progressPercentage} className="h-2.5 bg-slate-100" indicatorClassName="bg-blue-500" />
                <p className="text-slate-600 text-xs font-medium">{progressPercentage}% Complete</p>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
