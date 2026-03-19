import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AcceleratorAssessment } from './acceleratorTypes';

function formatRand(amount: number) {
  return `R${Math.round(amount).toLocaleString('en-ZA')}`;
}

export function ResultsPanel({
  assessment,
  onGetMatches,
  isLoadingMatches,
}: {
  assessment: AcceleratorAssessment;
  onGetMatches: () => void;
  isLoadingMatches: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Results + Assumptions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded border bg-white p-2">
            <p className="text-xs text-slate-500">Max monthly repayment</p>
            <p className="text-base font-semibold">{formatRand(assessment.outputs.maxMonthlyRepayment)}</p>
          </div>
          <div className="rounded border bg-white p-2">
            <p className="text-xs text-slate-500">Indicative loan amount</p>
            <p className="text-base font-semibold">{formatRand(assessment.outputs.indicativeLoanAmount)}</p>
          </div>
          <div className="rounded border bg-white p-2">
            <p className="text-xs text-slate-500">Indicative purchase price</p>
            <p className="text-base font-semibold">{formatRand(assessment.outputs.purchasePrice)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{assessment.outputs.confidenceLabel}</Badge>
          {assessment.outputs.confidenceLevel === 'low' ? (
            <Badge variant="secondary">Low confidence: verify affordability data</Badge>
          ) : null}
        </div>

        <div className="rounded border bg-slate-50 p-3 text-xs text-slate-600">
          <p>Interest rate annual: {assessment.assumptions.interestRateAnnual}%</p>
          <p>Term: {assessment.assumptions.termMonths} months</p>
          <p>Max repayment ratio: {assessment.assumptions.maxRepaymentRatio}</p>
          <p>Calculation version: {assessment.assumptions.calcVersion}</p>
        </div>

        <button
          className="h-9 rounded bg-slate-900 px-3 text-sm font-medium text-white disabled:opacity-60"
          onClick={onGetMatches}
          disabled={isLoadingMatches}
        >
          {isLoadingMatches ? 'Finding matches...' : 'Get matches'}
        </button>
      </CardContent>
    </Card>
  );
}
