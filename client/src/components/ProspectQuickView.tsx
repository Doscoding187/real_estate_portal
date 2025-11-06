import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calculator, TrendingUp, Target, Award } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface ProspectQuickViewProps {
  sessionId: string;
  compact?: boolean;
  className?: string;
}

export function ProspectQuickView({
  sessionId,
  compact = false,
  className = '',
}: ProspectQuickViewProps) {
  // Load prospect data and buyability results
  const { data: prospect } = trpc.prospects.getProspect.useQuery(
    { sessionId },
    { enabled: !!sessionId },
  );
  const { data: progress } = trpc.prospects.getProspectProgress.useQuery(
    { sessionId },
    { enabled: !!sessionId },
  );
  const { data: buyabilityResults } = trpc.prospects.calculateBuyability.useQuery(
    {
      income: prospect?.income ? prospect.income / 100 : undefined,
      incomeRange: prospect?.incomeRange as any,
      employmentStatus: prospect?.employmentStatus as any,
      combinedIncome: prospect?.combinedIncome ? prospect.combinedIncome / 100 : undefined,
      monthlyExpenses: prospect?.monthlyExpenses ? prospect.monthlyExpenses / 100 : undefined,
      monthlyDebts: prospect?.monthlyDebts ? prospect.monthlyDebts / 100 : undefined,
      dependents: prospect?.dependents || 0,
      savingsDeposit: prospect?.savingsDeposit ? prospect.savingsDeposit / 100 : undefined,
      creditScore: prospect?.creditScore,
      hasCreditConsent: prospect?.hasCreditConsent === 1,
    },
    { enabled: !!prospect },
  );

  if (!prospect) {
    return (
      <Card className={`p-4 ${className}`}>
        <CardContent className="text-center py-8">
          <Calculator className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No affordability data yet</p>
          <Button size="sm" className="mt-2" variant="outline">
            Calculate Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getBuyabilityColor = (score?: 'low' | 'medium' | 'high') => {
    switch (score) {
      case 'high':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString()}`;
  };

  if (compact) {
    return (
      <Card
        className={`border-2 ${getBuyabilityColor(buyabilityResults?.buyabilityScore)} ${className}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4" />
              <span className="font-medium text-sm">Buyability</span>
            </div>
            {buyabilityResults?.buyabilityScore && (
              <Badge variant="outline" className="text-xs">
                {buyabilityResults.buyabilityScore.toUpperCase()}
              </Badge>
            )}
          </div>

          {buyabilityResults?.affordabilityMin && buyabilityResults?.affordabilityMax && (
            <div className="text-xs text-gray-600">
              <div>
                Range: {formatCurrency(buyabilityResults.affordabilityMin)} -{' '}
                {formatCurrency(buyabilityResults.affordabilityMax)}
              </div>
            </div>
          )}

          {progress && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Profile</span>
                <span>{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="w-5 h-5" />
          <span>Affordability Summary</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Buyability Score */}
        {buyabilityResults?.buyabilityScore && (
          <div
            className={`p-4 rounded-lg border ${getBuyabilityColor(buyabilityResults.buyabilityScore)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Buyability Score</h4>
              <Badge variant="outline">{buyabilityResults.buyabilityScore.toUpperCase()}</Badge>
            </div>

            {buyabilityResults.affordabilityMin && buyabilityResults.affordabilityMax && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Affordability Range:</span>
                  <span className="font-medium">
                    {formatCurrency(buyabilityResults.affordabilityMin)} -{' '}
                    {formatCurrency(buyabilityResults.affordabilityMax)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Max Monthly Payment:</span>
                  <span className="font-medium">
                    {formatCurrency(buyabilityResults.monthlyPaymentCapacity)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Key Financial Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {prospect.income && (
            <div>
              <div className="text-gray-600">Monthly Income</div>
              <div className="font-medium">{formatCurrency(prospect.income / 100)}</div>
            </div>
          )}

          {prospect.savingsDeposit && (
            <div>
              <div className="text-gray-600">Available Deposit</div>
              <div className="font-medium">{formatCurrency(prospect.savingsDeposit / 100)}</div>
            </div>
          )}

          {prospect.monthlyExpenses && (
            <div>
              <div className="text-gray-600">Monthly Expenses</div>
              <div className="font-medium">{formatCurrency(prospect.monthlyExpenses / 100)}</div>
            </div>
          )}

          {prospect.monthlyDebts && (
            <div>
              <div className="text-gray-600">Monthly Debts</div>
              <div className="font-medium">{formatCurrency(prospect.monthlyDebts / 100)}</div>
            </div>
          )}
        </div>

        {/* Progress */}
        {progress && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Profile Completion</span>
              <span className="text-sm text-gray-600">{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} className="h-2" />

            {/* Badges */}
            {progress.badges && progress.badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {progress.badges.map((badge: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    <Award className="w-3 h-3 mr-1" />
                    {badge}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preferences */}
        {(prospect.preferredPropertyType || prospect.preferredLocation) && (
          <div className="pt-3 border-t">
            <h4 className="font-medium mb-2">Preferences</h4>
            <div className="space-y-1 text-sm text-gray-600">
              {prospect.preferredPropertyType && (
                <div className="flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Prefers {prospect.preferredPropertyType.replace('_', ' ')}
                </div>
              )}
              {prospect.preferredLocation && (
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Interested in {prospect.preferredLocation}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
