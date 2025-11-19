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
  const [bank, setBank] = useState<SABank>('Standard Bank');
  const [depositPercentage, setDepositPercentage] = useState(10);
  const [termYears, setTermYears] = useState<BondTerm>(20);
  const [customRate, setCustomRate] = useState<number | null>(null);

  const interestRate = customRate ?? getBankRate(bank);

  const calculation = calculateBondRepayment({
    propertyPrice,
    depositPercentage,
    interestRate,
    termYears,
  });

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
            <h3 className="text-xl font-bold">Bond Repayment Calculator</h3>
            <p className="text-sm text-gray-600">Calculate your estimated monthly bond repayment</p>
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
          {/* Bank Selection */}
          <div className="space-y-2">
            <Label htmlFor="bank">Select Bank</Label>
            <Select value={bank} onValueChange={value => setBank(value as SABank)}>
              <SelectTrigger id="bank">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(SA_BANKS).map(bankName => (
                  <SelectItem key={bankName} value={bankName}>
                    {bankName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interest Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rate">Interest Rate</Label>
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
            <p className="text-xs text-gray-500">Current SA Prime Rate: 11.75% p.a. (SARB 2025)</p>
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
              <span>0%</span>
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

        {/* Calculation Results */}
        <div className="space-y-4">
          {/* Monthly Repayment - Highlighted */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-700">Monthly Repayment</span>
              </div>
              <span className="text-3xl font-bold text-green-600">
                {formatSARandShort(calculation.monthlyRepayment)}
              </span>
            </div>
            <p className="text-xs text-gray-600 text-right">
              Over {termYears} years at {interestRate.toFixed(2)}% p.a.
            </p>
          </div>

          {/* Loan Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Loan Amount</div>
              <div className="text-lg font-bold text-gray-900">
                {formatSARandShort(calculation.loanAmount)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Total Interest</div>
              <div className="text-lg font-bold text-orange-600">
                {formatSARandShort(calculation.totalInterest)}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Total Repayment</div>
            <div className="text-lg font-bold text-gray-900">
              {formatSARandShort(calculation.totalRepayment)}
            </div>
          </div>
        </div>

        {/* Transfer Costs */}
        {showTransferCosts && transferCosts && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold">Estimated Transfer Costs</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transfer Duty</span>
                  <span className="font-medium">
                    {formatSARandShort(transferCosts.transferDuty)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bond Registration</span>
                  <span className="font-medium">
                    {formatSARandShort(transferCosts.bondRegistration)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Attorney Fees</span>
                  <span className="font-medium">
                    {formatSARandShort(transferCosts.transferAttorney + transferCosts.bondAttorney)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total Transfer Costs</span>
                  <span className="text-blue-600">{formatSARandShort(transferCosts.total)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            <strong>Disclaimer:</strong> These calculations are estimates only. Actual bond
            approval, interest rates, and transfer costs may vary based on individual circumstances
            and bank policies. Consult with a bond originator or financial advisor for accurate
            figures.
          </p>
        </div>
      </div>
    </Card>
  );
}
