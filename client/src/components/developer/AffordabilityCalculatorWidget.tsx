/**
 * Affordability Calculator Widget - Gamified Buyability Calculator
 *
 * A Zillow-inspired, SA-first affordability tool that guides buyers through
 * their property journey with progressive disclosure and real-time feedback.
 *
 * Features:
 * - Start with ONE question (monthly income)
 * - Gamified accuracy progression
 * - Real-time unit matching
 * - Affordability grades (A-E)
 * - Actionable insights and recommendations
 *
 * Validates: Requirements 4.1, 4.2, 4.3
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calculator,
  TrendingUp,
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatSARandShort } from '@/lib/bond-calculator';

interface AffordabilityCalculatorWidgetProps {
  developmentId?: number;
  onAffordabilityCalculated?: (result: any) => void;
  compact?: boolean;
}

export function AffordabilityCalculatorWidget({
  developmentId,
  onAffordabilityCalculated,
  compact = false,
}: AffordabilityCalculatorWidgetProps) {
  // Form state
  const [income, setIncome] = useState<number | ''>('');
  const [combinedIncome, setCombinedIncome] = useState<number | ''>('');
  const [monthlyExpenses, setMonthlyExpenses] = useState<number | ''>('');
  const [monthlyDebts, setMonthlyDebts] = useState<number | ''>('');
  const [savingsDeposit, setSavingsDeposit] = useState<number | ''>('');
  const [dependents, setDependents] = useState<number | ''>('');
  const [creditScore, setCreditScore] = useState<number | ''>('');

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [result, setResult] = useState<any>(null);

  // TRPC mutation
  const calculateMutation = trpc.developer.calculateAffordability.useMutation({
    onSuccess: data => {
      setResult(data);
      if (onAffordabilityCalculated) {
        onAffordabilityCalculated(data);
      }
    },
  });

  const handleCalculate = () => {
    const financialData: any = {};

    if (income) financialData.income = Number(income) * 100; // Convert to cents
    if (combinedIncome) financialData.combinedIncome = Number(combinedIncome) * 100;
    if (monthlyExpenses) financialData.monthlyExpenses = Number(monthlyExpenses) * 100;
    if (monthlyDebts) financialData.monthlyDebts = Number(monthlyDebts) * 100;
    if (savingsDeposit) financialData.savingsDeposit = Number(savingsDeposit) * 100;
    if (dependents) financialData.dependents = Number(dependents);
    if (creditScore) financialData.creditScore = Number(creditScore);

    calculateMutation.mutate(financialData);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-500';
      case 'B':
        return 'bg-blue-500';
      case 'C':
        return 'bg-yellow-500';
      case 'D':
        return 'bg-orange-500';
      case 'E':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'tip':
        return <Lightbulb className="h-4 w-4 text-blue-600" />;
      case 'action':
        return <Zap className="h-4 w-4 text-purple-600" />;
      default:
        return null;
    }
  };

  if (compact && !result) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold">Check Your Affordability</h4>
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-compact">Monthly Income (R)</Label>
            <Input
              id="income-compact"
              type="number"
              placeholder="e.g., 25000"
              value={income}
              onChange={e => setIncome(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          <Button
            onClick={handleCalculate}
            disabled={!income || calculateMutation.isPending}
            className="w-full"
          >
            {calculateMutation.isPending ? 'Calculating...' : 'Calculate Affordability'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calculator className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Affordability Calculator</h3>
              <p className="text-sm text-gray-600">Discover what you can afford</p>
            </div>
          </div>

          {result && (
            <Badge
              className={`${getGradeColor(result.affordabilityGrade.grade)} text-white text-lg px-4 py-2`}
            >
              Grade {result.affordabilityGrade.grade}
            </Badge>
          )}
        </div>

        {result && (
          <>
            {/* Accuracy Score */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Accuracy Score</span>
                </div>
                <span className="text-2xl font-bold text-purple-600">{result.accuracyScore}%</span>
              </div>
              <Progress value={result.accuracyScore} className="h-2" />
              <p className="text-xs text-gray-600 mt-2">
                Complete more details to improve accuracy
              </p>
            </div>

            {/* Affordability Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">You Can Afford</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatSARandShort(result.affordabilityMax / 100)}
                </div>
                <p className="text-xs text-gray-600 mt-1">Maximum property price</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Monthly Payment</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatSARandShort(result.monthlyPaymentCapacity / 100)}
                </div>
                <p className="text-xs text-gray-600 mt-1">Estimated repayment</p>
              </div>
            </div>

            {/* Grade Description */}
            <div
              className={`rounded-lg p-4 border-2 ${result.affordabilityGrade.color === 'green' ? 'bg-green-50 border-green-200' : result.affordabilityGrade.color === 'blue' ? 'bg-blue-50 border-blue-200' : result.affordabilityGrade.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' : result.affordabilityGrade.color === 'orange' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}
            >
              <h4 className="font-semibold mb-1">{result.affordabilityGrade.label}</h4>
              <p className="text-sm text-gray-700">{result.affordabilityGrade.description}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Input Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="income">Monthly Income (R) *</Label>
            <Input
              id="income"
              type="number"
              placeholder="e.g., 25000"
              value={income}
              onChange={e => setIncome(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          {!showAdvanced && (
            <Button variant="outline" onClick={() => setShowAdvanced(true)} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              Add More Details for Better Accuracy
            </Button>
          )}

          {showAdvanced && (
            <>
              <div className="space-y-2">
                <Label htmlFor="combined-income">Partner Income (R)</Label>
                <Input
                  id="combined-income"
                  type="number"
                  placeholder="e.g., 20000"
                  value={combinedIncome}
                  onChange={e => setCombinedIncome(e.target.value ? Number(e.target.value) : '')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenses">Monthly Expenses (R)</Label>
                <Input
                  id="expenses"
                  type="number"
                  placeholder="e.g., 8000"
                  value={monthlyExpenses}
                  onChange={e => setMonthlyExpenses(e.target.value ? Number(e.target.value) : '')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="debts">Monthly Debts (R)</Label>
                <Input
                  id="debts"
                  type="number"
                  placeholder="e.g., 3000"
                  value={monthlyDebts}
                  onChange={e => setMonthlyDebts(e.target.value ? Number(e.target.value) : '')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit">Available Deposit (R)</Label>
                <Input
                  id="deposit"
                  type="number"
                  placeholder="e.g., 100000"
                  value={savingsDeposit}
                  onChange={e => setSavingsDeposit(e.target.value ? Number(e.target.value) : '')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dependents">Dependents</Label>
                  <Input
                    id="dependents"
                    type="number"
                    placeholder="0"
                    value={dependents}
                    onChange={e => setDependents(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit-score">Credit Score</Label>
                  <Input
                    id="credit-score"
                    type="number"
                    placeholder="650"
                    value={creditScore}
                    onChange={e => setCreditScore(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <Button
          onClick={handleCalculate}
          disabled={!income || calculateMutation.isPending}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          size="lg"
        >
          {calculateMutation.isPending
            ? 'Calculating...'
            : result
              ? 'Recalculate'
              : 'Calculate Affordability'}
        </Button>

        {/* Accuracy Boosters */}
        {result && result.accuracyBoosters && result.accuracyBoosters.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Boost Your Accuracy
              </h4>
              <div className="space-y-2">
                {result.accuracyBoosters.slice(0, 3).map((booster: any) => (
                  <div
                    key={booster.id}
                    className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{booster.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{booster.title}</p>
                        <p className="text-xs text-gray-600">{booster.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">+{booster.accuracyGain}%</Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Insights */}
        {result && result.insights && result.insights.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold">Insights</h4>
              <div className="space-y-2">
                {result.insights.map((insight: any, index: number) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <p className="text-sm">{insight.message}</p>
                      {insight.actionable && (
                        <p className="text-xs text-gray-600 mt-1">
                          <strong>{insight.actionable.action}</strong> → {insight.actionable.impact}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Quick Wins */}
        {result && result.quickWins && result.quickWins.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Quick Wins
              </h4>
              <div className="space-y-2">
                {result.quickWins.map((win: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200"
                  >
                    <CheckCircle2 className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <p className="text-sm">{win}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
