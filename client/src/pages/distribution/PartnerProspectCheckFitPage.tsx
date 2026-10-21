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

type DocumentPack = {
  developmentId: number;
  downloads: { key: string; label: string; url: string; instructions: string | null }[];
  uploads: { evidenceType: string; label: string; instructions: string | null }[];
  signatureMethod: string | null;
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
  const qualifiedMatchDevelopmentIds = qualifiedMatches.map(match => match.developmentId);
  const documentPacksQuery = trpc.distribution.partner.getProspectDocumentPacks.useQuery(
    { developmentIds: qualifiedMatchDevelopmentIds },
    { enabled: qualifiedMatchDevelopmentIds.length > 0, retry: false },
  );
  const documentPacks = (documentPacksQuery.data || []) as DocumentPack[];

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
                {activeCheckFit.prospectName ? `${activeCheckFit.prospectName} · ` : ''}
                {activeCheckFit.coApplicantName
                  ? `${activeCheckFit.coApplicantName} · `
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
                          Qualifies for units from about {formatAmount(match.entryPrice)}
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
                      {(() => {
                        const pack = documentPacks.find(
                          candidate => candidate.developmentId === match.developmentId,
                        );
                        if (!pack) return null;
                        return (
                          <div className="mt-3 w-full space-y-2 rounded-lg border bg-muted/40 p-3">
                            <p className="text-sm font-medium text-foreground">Next step</p>
                            <p className="text-xs text-muted-foreground">
                              {pack.uploads.length
                                ? 'Download these for the prospect, sign them, and upload them back with the prospect\u2019s ID before you introduce them.'
                                : 'Start the referral and upload the required documents for the prospect.'}
                            </p>
                            {pack.downloads.length ? (
                              <ul className="space-y-1">
                                {pack.downloads.map(download => (
                                  <li key={download.key} className="text-xs">
                                    <a
                                      href={download.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-medium text-primary underline"
                                    >
                                      Download {download.label}
                                    </a>
                                    {download.instructions ? (
                                      <span className="ml-1 text-muted-foreground">
                                        {download.instructions}
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                No downloadable documents are published for this opportunity yet.
                              </p>
                            )}
                            {pack.uploads.length ? (
                              <ul className="space-y-1">
                                {pack.uploads.map(upload => (
                                  <li key={upload.evidenceType} className="text-xs text-muted-foreground">
                                    Upload: {upload.label}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        );
                      })()}
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
                      {record.prospectName || 'Unnamed prospect'}
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
