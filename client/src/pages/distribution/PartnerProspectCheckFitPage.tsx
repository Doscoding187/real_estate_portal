import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Building2, Calculator, CircleAlert, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDevelopmentTypeLabel } from '@/lib/distributionOpportunityFormat';
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
  prospectName: string | null;
  coApplicantName: string | null;
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
  const [prospectName, setProspectName] = useState('');
  const [grossIncome, setGrossIncome] = useState('');
  const [coApplicantName, setCoApplicantName] = useState('');
  const [coApplicantIncome, setCoApplicantIncome] = useState('');
  const [isJoint, setIsJoint] = useState(false);
  const [activeCheckFitId, setActiveCheckFitId] = useState<string | null>(null);
  const [recordedCheckFits, setRecordedCheckFits] = useState<CheckFitRecord[]>([]);

  const utils = trpc.useUtils();
  const checkFitsQuery = trpc.distribution.partner.listProspectCheckFits.useQuery(
    { limit: 20 },
    { retry: false },
  );
  const createMutation = trpc.distribution.partner.createProspectCheckFit.useMutation({
    onSuccess: record => {
      setRecordedCheckFits(current => [record as CheckFitRecord, ...current]);
      setActiveCheckFitId(record.id);
      toast.success('Check fit recorded.');
      void utils.distribution.partner.listProspectCheckFits.invalidate();
    },
    onError: error => {
      toast.error(error?.message || 'Could not record the check fit.');
    },
  });

  const listedCheckFits = (checkFitsQuery.data || []) as CheckFitRecord[];
  const checkFits = [
    ...recordedCheckFits.filter(
      recorded => !listedCheckFits.some(listed => listed.id === recorded.id),
    ),
    ...listedCheckFits,
  ];
  const activeCheckFit =
    checkFits.find(record => record.id === activeCheckFitId) || checkFits[0] || null;
  const qualifiedMatches = (activeCheckFit?.matches || []).filter(match => match.qualified);
  const outOfReachMatches = (activeCheckFit?.matches || []).filter(match => !match.qualified);
  const catalogueQuery = trpc.distribution.partner.listEligibleDevelopmentsForSubmission.useQuery(
    undefined,
    { retry: false },
  );
  const catalogueItemByDevelopmentId = new Map<number, any>(
    (catalogueQuery.data?.items || []).map((item: any) => [Number(item.developmentId), item]),
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!prospectName.trim()) {
      toast.error('Enter the prospect’s name.');
      return;
    }
    const primary = parseAmount(grossIncome);
    if (primary <= 0) {
      toast.error('Enter the prospect’s gross monthly income.');
      return;
    }
    const coApplicant = isJoint ? parseAmount(coApplicantIncome) : 0;
    if (isJoint && !coApplicantName.trim()) {
      toast.error('Enter the second applicant’s name.');
      return;
    }
    if (isJoint && coApplicant <= 0) {
      toast.error('Enter the second applicant’s gross monthly income.');
      return;
    }
    void createMutation.mutateAsync({
      prospectName: prospectName.trim(),
      grossIncomeMonthly: primary,
      ...(isJoint
        ? {
            coApplicantName: coApplicantName.trim(),
            coApplicantGrossIncomeMonthly: coApplicant,
          }
        : {}),
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
              The prospect’s name and gross monthly income. Their documents and signed consent are
              collected in the referral step that follows, before anything is shared with the
              developer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={isJoint}
                  onChange={event => setIsJoint(event.target.checked)}
                />
                Joint application (two people applying together)
              </label>

              <div className={isJoint ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {isJoint ? 'Applicant 1' : 'Prospect'}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="check-fit-name">Prospect name</Label>
                    <Input
                      id="check-fit-name"
                      placeholder="e.g. Thandi Mokoena"
                      value={prospectName}
                      onChange={event => setProspectName(event.target.value)}
                    />
                  </div>
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
                </div>

                {isJoint ? (
                  <div className="space-y-3 rounded-lg border p-4">
                    <p className="text-sm font-semibold text-foreground">Applicant 2</p>
                    <div className="space-y-2">
                      <Label htmlFor="check-fit-co-name">Prospect name</Label>
                      <Input
                        id="check-fit-co-name"
                        placeholder="e.g. Sipho Mokoena"
                        value={coApplicantName}
                        onChange={event => setCoApplicantName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-fit-co-income">Gross monthly income</Label>
                      <Input
                        id="check-fit-co-income"
                        inputMode="numeric"
                        placeholder="e.g. 20000"
                        value={coApplicantIncome}
                        onChange={event => setCoApplicantIncome(event.target.value)}
                      />
                    </div>
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
                {[
                  activeCheckFit.prospectName,
                  activeCheckFit.coApplicantName,
                ]
                  .filter(Boolean)
                  .join(' and ') || 'This check fit'}
                {' — '}
                {activeCheckFit.assumptions.jointAssessment ? 'combined ' : ''}gross monthly income
                of {formatAmount(activeCheckFit.outputs.combinedGrossIncomeMonthly)}.
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

              <p className="text-sm text-foreground">
                On a gross monthly income of{' '}
                {formatAmount(activeCheckFit.outputs.combinedGrossIncomeMonthly)} and the current
                prime rate of {activeCheckFit.assumptions.annualInterestRate}%
                {activeCheckFit.assumptions.jointAssessment ? ' (both applicants combined)' : ''}, this
                prospect qualifies for properties priced up to about{' '}
                {formatAmount(activeCheckFit.outputs.estimatedPurchasePrice)}.
              </p>

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
                  <div
                    role="region"
                    aria-label="Developments the prospect may qualify for"
                    tabIndex={0}
                    className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1"
                  >
                    {qualifiedMatches.map(match => {
                      const item = catalogueItemByDevelopmentId.get(match.developmentId);
                      const imageUrl = item?.imageUrl || null;
                      const developmentType = formatDevelopmentTypeLabel(
                        item?.campaign?.developmentType,
                      );
                      const availableCount = Number(
                        item?.inventory?.modes?.sale?.availableCount || 0,
                      );
                      return (
                        <article
                          key={match.developmentId}
                          className="flex w-[86%] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm sm:w-[calc((100%_-_1.5rem)/3.15)] lg:w-[calc((100%_-_1.5rem)/3.4)]"
                        >
                          <div className="relative">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={match.developmentName}
                                className="h-40 w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-40 w-full items-center justify-center bg-[#eef4fc]">
                                <Building2 className="h-8 w-8 text-[#9cc0ee]" />
                              </div>
                            )}
                            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-[#cde9d2] bg-[#f5fcf6] px-2 py-0.5 text-[10.5px] font-medium text-[#2f8f4e]">
                              <Users className="h-3 w-3" />
                              May qualify
                            </span>
                          </div>

                          <div className="flex flex-1 flex-col p-3">
                            <h3 className="text-[14px] font-semibold leading-snug text-[#0b1c3f]">
                              {match.developmentName}
                            </h3>
                            <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {[match.city, match.province].filter(Boolean).join(', ') ||
                                'Location to be confirmed'}
                            </p>

                            {developmentType || availableCount ? (
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
                                {developmentType ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Building2 className="h-3 w-3" /> {developmentType}
                                  </span>
                                ) : null}
                                {availableCount ? (
                                  <span>
                                    {availableCount} home{availableCount === 1 ? '' : 's'} available
                                  </span>
                                ) : null}
                              </div>
                            ) : null}

                            <p className="mt-2 text-[14px] font-bold text-[#0b1c3f]">
                              Qualifies from about {formatAmount(match.entryPrice)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Before any deposit is considered.
                            </p>

                            <Button
                              size="sm"
                              className="mt-3 w-full"
                              onClick={() =>
                                setLocation(
                                  `/distribution/partner/submit?developmentId=${match.developmentId}&marketMode=sale&checkFitId=${activeCheckFit.id}`,
                                )
                              }
                            >
                              Refer this development
                              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
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

        {checkFits.length > 1 ? (
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
                      {record.prospectName || 'Unnamed prospect'}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {formatAmount(record.outputs.combinedGrossIncomeMonthly)} gross
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {record.id === activeCheckFit?.id
                      ? 'Shown above'
                      : record.lockedByDealId
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
