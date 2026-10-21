import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Calculator, CircleAlert, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CheckFitMatch = {
  developmentId: number;
  programId: number;
  developmentName: string;
  city: string;
  province: string;
  entryPrice: number;
  currencyCode: string;
  qualified: boolean;
  matchRank: number;
};

type CheckFitRecord = {
  id: string;
  referenceLabel: string | null;
  grossIncomeMonthly: number;
  coApplicantGrossIncomeMonthly: number | null;
  combinedGrossIncomeMonthly: number;
  policyVersion: string;
  assumptions: {
    annualInterestRate: number;
    termMonths: number;
    repaymentAllowanceRatio: number;
    rateSourceLabel: string;
    applicantCount: number;
    jointAssessment: boolean;
  };
  outputs: {
    combinedGrossIncomeMonthly: number;
    repaymentAllowanceMonthly: number;
    estimatedLoanAmount: number;
    estimatedPurchasePrice: number;
    qualifiedDevelopmentCount: number;
  };
  matches: CheckFitMatch[];
  lockedByDealId: number | null;
  createdAt: string;
};

function formatAmount(value: number) {
  return `R ${Math.round(value).toLocaleString('en-ZA')}`;
}

function parseAmount(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Math.min(Number.parseInt(digits, 10), 100_000_000);
}

export default function PartnerProspectCheckFitPage() {
  const [, setLocation] = useLocation();
  const [referenceLabel, setReferenceLabel] = useState('');
  const [grossIncome, setGrossIncome] = useState('');
  const [jointIncome, setJointIncome] = useState('');
  const [isJoint, setIsJoint] = useState(false);
  const [activeCheckFitId, setActiveCheckFitId] = useState<string | null>(null);

  const checkFitsQuery = trpc.distribution.partner.listProspectCheckFits.useQuery(
    { limit: 20 },
    { retry: false },
  );
  const createMutation = trpc.distribution.partner.createProspectCheckFit.useMutation({
    onSuccess: record => {
      setActiveCheckFitId(record.id);
      toast.success('Check fit recorded.');
    },
    onError: error => {
      toast.error(error?.message || 'Could not record the check fit.');
    },
  });

  const checkFits = (checkFitsQuery.data || []) as CheckFitRecord[];
  const activeCheckFit =
    checkFits.find(record => record.id === activeCheckFitId) || checkFits[0] || null;
  const qualifiedMatches = (activeCheckFit?.matches || []).filter(match => match.qualified);
  const outOfReachMatches = (activeCheckFit?.matches || []).filter(match => !match.qualified);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const primary = parseAmount(grossIncome);
    if (primary <= 0) {
      toast.error('Enter the prospect’s gross monthly income.');
      return;
    }
    const coApplicant = isJoint ? parseAmount(jointIncome) : 0;
    if (isJoint && coApplicant <= 0) {
      toast.error('Enter the second applicant’s gross monthly income.');
      return;
    }
    void createMutation.mutateAsync({
      grossIncomeMonthly: primary,
      ...(coApplicant > 0 ? { coApplicantGrossIncomeMonthly: coApplicant } : {}),
      ...(referenceLabel.trim() ? { referenceLabel: referenceLabel.trim() } : {}),
    });
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">I have a prospect</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with what the prospect earns. The check fit tells you which current opportunities
            they may reach before you collect any personal detail, and which ones are out of reach.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Check fit
            </CardTitle>
            <CardDescription>
              Gross monthly income only. The prospect’s identity, documents and consent are
              collected in the referral step that follows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="check-fit-income">Gross monthly income</Label>
                  <Input
                    id="check-fit-income"
                    inputMode="numeric"
                    placeholder="e.g. 45000"
                    value={grossIncome}
                    onChange={event => setGrossIncome(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="check-fit-label">Reference (optional)</Label>
                  <Input
                    id="check-fit-label"
                    placeholder="e.g. Prospect A"
                    value={referenceLabel}
                    onChange={event => setReferenceLabel(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={isJoint}
                    onChange={event => setIsJoint(event.target.checked)}
                  />
                  Joint application (two people applying together)
                </label>
                {isJoint ? (
                  <div className="space-y-2">
                    <Label htmlFor="check-fit-joint-income">
                      Second applicant gross monthly income
                    </Label>
                    <Input
                      id="check-fit-joint-income"
                      inputMode="numeric"
                      placeholder="e.g. 20000"
                      value={jointIncome}
                      onChange={event => setJointIncome(event.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Checking…' : 'Run the check fit'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {activeCheckFit ? (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>
                {activeCheckFit.referenceLabel
                  ? `${activeCheckFit.referenceLabel} · `
                  : ''}
                Based on a combined gross monthly income of{' '}
                {formatAmount(activeCheckFit.outputs.combinedGrossIncomeMonthly)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Indicative purchase price
                  </p>
                  <p className="text-xl font-semibold">
                    {formatAmount(activeCheckFit.outputs.estimatedPurchasePrice)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Repayment allowance
                  </p>
                  <p className="text-xl font-semibold">
                    {formatAmount(activeCheckFit.outputs.repaymentAllowanceMonthly)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Opportunities in reach
                  </p>
                  <p className="text-xl font-semibold">
                    {activeCheckFit.outputs.qualifiedDevelopmentCount}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Assumes {activeCheckFit.assumptions.annualInterestRate}% (
                {activeCheckFit.assumptions.rateSourceLabel}), a{' '}
                {activeCheckFit.assumptions.termMonths}-month term and up to{' '}
                {Math.round(activeCheckFit.assumptions.repaymentAllowanceRatio * 100)}% of gross
                monthly income for the repayment. Indicative pre-qualification only. Not a final
                bond approval, credit decision or guaranteed finance offer.
                {activeCheckFit.assumptions.jointAssessment
                  ? ' A joint application is assessed as one combined allowance over both incomes.'
                  : ''}
              </p>

              {activeCheckFit.outputs.qualifiedDevelopmentCount === 0 ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    This prospect does not qualify for any current opportunity on the income you
                    entered. There is nothing to refer yet, and we do not have an option for them
                    right now.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Developments this prospect may qualify for
                  </p>
                  {qualifiedMatches.map(match => (
                    <div
                      key={match.developmentId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{match.developmentName}</p>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {[match.city, match.province].filter(Boolean).join(', ')}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          From {formatAmount(match.entryPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <Users className="mr-1 h-3 w-3" />
                          May qualify
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() =>
                            setLocation(
                              `/distribution/partner/submit?developmentId=${match.developmentId}&marketMode=sale&checkFitId=${activeCheckFit.id}`,
                            )
                          }
                        >
                          Refer this development
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {outOfReachMatches.length ? (
                <details className="rounded-lg border p-4">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    {outOfReachMatches.length} further opportunit
                    {outOfReachMatches.length === 1 ? 'y is' : 'ies are'} out of reach for this
                    income
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {outOfReachMatches.map(match => (
                      <li
                        key={match.developmentId}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
                      >
                        <span>
                          {match.developmentName} ·{' '}
                          {[match.city, match.province].filter(Boolean).join(', ')}
                        </span>
                        <span>From {formatAmount(match.entryPrice)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {checkFits.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Your check fits</CardTitle>
              <CardDescription>
                A check fit can be attached to one referral. Ask for the prospect’s consent before
                you share any personal detail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {checkFits.map(record => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setActiveCheckFitId(record.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-left text-sm hover:bg-muted/60"
                >
                  <span>
                    <span className="font-medium text-foreground">
                      {record.referenceLabel || 'Unnamed prospect'}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {formatAmount(record.outputs.combinedGrossIncomeMonthly)} gross
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {record.lockedByDealId
                      ? 'Attached to a referral'
                      : `${record.outputs.qualifiedDevelopmentCount} in reach`}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </ReferralAppShell>
  );
}
