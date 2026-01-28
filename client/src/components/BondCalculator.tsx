/**
 * South African Bond Repayment Calculator Component
 * Interactive calculator for property buyers to estimate monthly repayments
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, Home, DollarSign } from 'lucide-react';
import {
  calculateBondRepayment,
  getBankRate,
  calculateTransferCosts,
  formatSARand,
  formatSARandShort,
  SA_BANKS,
  BOND_TERMS,
  type SABank,
  type BondTerm,
} from '@/lib/bond-calculator';
import { trpc } from '@/lib/trpc';

interface BondCalculatorProps {
  propertyPrice: number;
  onRepaymentCalculated?: (monthlyRepayment: number) => void;
  showTransferCosts?: boolean;
  compact?: boolean;
}

export function BondCalculator({
  propertyPrice,
  onRepaymentCalculated,
  showTransferCosts = false,
  compact = false,
}: BondCalculatorProps) {
  // Fetch SARB Prime Rate from database
  const { data: sarbData } = trpc.settings.getSARBPrimeRate.useQuery();
  const SARB_PRIME_RATE = sarbData?.rate || 10.5; // Fallback to 10.50 if not loaded

  const [depositPercentage, setDepositPercentage] = useState(0); // Default to 0% for 100% bond
  const [termYears, setTermYears] = useState<BondTerm>(20);
  const [customRate, setCustomRate] = useState<number | null>(null);

  const interestRate = customRate ?? SARB_PRIME_RATE;

  const calculation = calculateBondRepayment({
    propertyPrice,
    depositPercentage,
    interestRate,
    termYears,
  });

  // Calculate required gross monthly income (banks typically require repayment to be max 30% of gross income)
  const requiredGrossIncome = Math.ceil(calculation.monthlyRepayment / 0.3);

  const transferCosts = showTransferCosts ? calculateTransferCosts(propertyPrice) : null;

  // Notify parent component of repayment amount
  useEffect(() => {
    if (onRepaymentCalculated) {
      onRepaymentCalculated(calculation.monthlyRepayment);
    }
  }, [calculation.monthlyRepayment, onRepaymentCalculated]);

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="h-5 w-5 text-green-600" />
          <h4 className="font-semibold text-green-900">Estimated Monthly Repayment</h4>
        </div>
        <div className="text-3xl font-bold text-green-600 mb-2">
          {formatSARandShort(calculation.monthlyRepayment)}
        </div>
        <p className="text-sm text-gray-600">
          Based on {depositPercentage}% deposit over {termYears} years at {interestRate.toFixed(2)}%
        </p>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Calculator className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Buyability Calculator</h3>
            <p className="text-sm text-gray-600">Calculate your property affordability and costs</p>
          </div>
        </div>

        <Separator />

        {/* Property Price Display */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-700">Property Price</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">
              {formatSARandShort(propertyPrice)}
            </span>
          </div>
        </div>

        {/* Calculator Inputs */}
        <div className="space-y-4">
          {/* Interest Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rate">Interest Rate (SARB Prime Rate)</Label>
              <span className="text-sm font-medium text-green-600">
                {interestRate.toFixed(2)}% p.a.
              </span>
            </div>
            <Input
              id="rate"
              type="number"
              step="0.01"
              value={customRate ?? interestRate}
              onChange={e => {
                const value = parseFloat(e.target.value);
                setCustomRate(isNaN(value) ? null : value);
              }}
              placeholder="Custom rate (optional)"
            />
            <p className="text-xs text-gray-500">
              Current SA Prime Rate: 10.50% p.a. (SARB Repo: 7.00%)
            </p>
          </div>

          {/* Deposit Percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Deposit</Label>
              <div className="text-right">
                <div className="font-medium text-green-600">{depositPercentage}%</div>
                <div className="text-xs text-gray-500">
                  {formatSARandShort(calculation.depositAmount)}
                </div>
              </div>
            </div>
            <Slider
              value={[depositPercentage]}
              onValueChange={([value]) => setDepositPercentage(value)}
              min={0}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0% (100% Bond)</span>
              <span>50%</span>
            </div>
          </div>

          {/* Bond Term */}
          <div className="space-y-2">
            <Label htmlFor="term">Bond Term</Label>
            <Select
              value={termYears.toString()}
              onValueChange={value => setTermYears(Number(value) as BondTerm)}
            >
              <SelectTrigger id="term">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOND_TERMS.map(term => (
                  <SelectItem key={term} value={term.toString()}>
                    {term} years
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Calculation Results - Compact Grid Layout */}
        <div className="grid grid-cols-2 gap-3">
          {/* Loan Amount */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-1.5 mb-1">
              <Home className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-gray-700">Loan Amount</span>
            </div>
            <div className="text-xl font-bold text-blue-600">
              {formatSARandShort(calculation.loanAmount)}
            </div>
            <p className="text-[10px] text-gray-600 mt-0.5">{depositPercentage}% deposit</p>
          </div>

          {/* Monthly Repayment */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-3 border-2 border-green-200">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-gray-700">Monthly</span>
            </div>
            <div className="text-xl font-bold text-green-600">
              {formatSARandShort(calculation.monthlyRepayment)}
            </div>
            <p className="text-[10px] text-gray-600 mt-0.5">
              {termYears} years @ {interestRate.toFixed(2)}%
            </p>
          </div>

          {/* Required Gross Income */}
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-gray-700">Income Needed</span>
            </div>
            <div className="text-xl font-bold text-orange-600">
              {formatSARandShort(requiredGrossIncome)}
            </div>
            <p className="text-[10px] text-gray-600 mt-0.5">Per month (30% ratio)</p>
          </div>

          {/* Estimated Transfer Costs */}
          {transferCosts && (
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center gap-1.5 mb-1">
                <Calculator className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-gray-700">Transfer Costs</span>
              </div>
              <div className="text-xl font-bold text-purple-600">
                {formatSARandShort(transferCosts.total)}
              </div>
              <p className="text-[10px] text-gray-600 mt-0.5">Incl. duty & fees</p>
            </div>
          )}
        </div>

        {/* Call to Action - Bond Qualification */}
        <Separator />
        <div className="bg-gradient-to-br from-orange-50 to-blue-50 rounded-lg p-4 border-2 border-orange-200">
          <div className="text-center mb-3">
            <h4 className="text-base font-bold text-slate-900 mb-1">Ready to Buy?</h4>
            <p className="text-xs text-slate-600">
              Check your bond qualification with our trusted partners
            </p>
          </div>
          <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Check Bond Qualification
          </Button>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            Free pre-qualification with our bond originator partners
          </p>
        </div>
      </div>
    </Card>
  );
}
