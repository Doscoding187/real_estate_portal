import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, Link2, Sparkles } from 'lucide-react';

type WidgetProps = {
  showFullList?: boolean;
};

type QualificationMode = 'quick_qual' | 'verified_qual';
type ConfidenceLevel = 'low' | 'medium' | 'high' | 'verified';

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

function statusChipClass(status: string) {
  if (status === 'quick') return 'bg-slate-100 text-slate-700 border-slate-200';
  if (status === 'awaiting_documents') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'under_review') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (status === 'verified') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'submitted') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return 'bg-violet-50 text-violet-700 border-violet-200';
}

function parsePreferredAreas(raw: string) {
  return raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function deriveConfidenceLevel(score: number): ConfidenceLevel {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(score || 0))));
  if (normalized >= 90) return 'verified';
  if (normalized >= 70) return 'high';
  if (normalized >= 40) return 'medium';
  return 'low';
}

function normalizeConfidenceLevel(level: unknown, score: number): ConfidenceLevel {
  const normalized = String(level || '').trim().toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'verified') {
    return normalized as ConfidenceLevel;
  }
  return deriveConfidenceLevel(score);
}

function confidenceLevelLabel(level: ConfidenceLevel): string {
  if (level === 'verified') return 'Verified Confidence';
  if (level === 'high') return 'High Confidence';
  if (level === 'medium') return 'Medium Confidence';
  return 'Low Confidence';
}

function confidenceLevelHint(level: ConfidenceLevel): string {
  if (level === 'verified') return 'Very complete input set. Suitable for priority routing.';
  if (level === 'high') return 'Strong completeness. Add documents to push to verified confidence.';
  if (level === 'medium') return 'Reasonable estimate. Add debts, expenses, and docs for tighter accuracy.';
  return 'Limited detail provided. Add more inputs and docs to improve reliability.';
}

function openHtmlPreview(html: string) {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) {
    toast.error('Popup blocked. Allow popups to preview the PDF template.');
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

export function ReferralQualificationWidget({ showFullList = false }: WidgetProps) {
  const [, setLocation] = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedReferralId, setSelectedReferralId] = useState<number | null>(null);

  const [mode, setMode] = useState<QualificationMode>('quick_qual');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [preferredAreasText, setPreferredAreasText] = useState('');
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState('');
  const [monthlyDebts, setMonthlyDebts] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [dependents, setDependents] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [docsUploaded, setDocsUploaded] = useState('');

  const listQuery = trpc.distribution.qualification.listMine.useQuery(
    { limit: showFullList ? 40 : 5 },
    { retry: false },
  );

  const detailQuery = trpc.distribution.qualification.getById.useQuery(
    { referralId: selectedReferralId || 0 },
    { enabled: showFullList && !!selectedReferralId, retry: false },
  );

  useEffect(() => {
    if (!showFullList) return;
    const rows = listQuery.data || [];
    if (!rows.length) {
      setSelectedReferralId(null);
      return;
    }
    if (!selectedReferralId) {
      setSelectedReferralId(Number(rows[0].id));
      return;
    }
    if (!rows.some((row: any) => Number(row.id) === Number(selectedReferralId))) {
      setSelectedReferralId(Number(rows[0].id));
    }
  }, [listQuery.data, selectedReferralId, showFullList]);

  const previewMutation = trpc.distribution.qualification.previewQuick.useMutation();
  const createReferralMutation = trpc.distribution.qualification.createReferral.useMutation({
    onSuccess: data => {
      toast.success(`Referral ${data.referenceCode} created`);
      setSheetOpen(false);
      setStep(1);
      listQuery.refetch();
      if (showFullList) {
        setSelectedReferralId(Number(data.referralId));
      }
    },
    onError: error => toast.error(error.message),
  });

  const generatePdfMutation = trpc.distribution.qualification.generatePdf.useMutation({
    onSuccess: data => {
      openHtmlPreview(data.html);
      toast.success('PDF template generated');
    },
    onError: error => toast.error(error.message),
  });

  const sendUploadLinkMutation = trpc.distribution.qualification.sendUploadLink.useMutation({
    onSuccess: async data => {
      try {
        await navigator.clipboard.writeText(data.uploadUrl);
        toast.success('Secure upload link copied');
      } catch {
        toast.success(`Upload link: ${data.uploadUrl}`);
      }
      detailQuery.refetch();
      listQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const submitToDevelopmentMutation = trpc.distribution.qualification.submitToDevelopment.useMutation({
    onSuccess: () => {
      toast.success('Referral submitted to development');
      listQuery.refetch();
      detailQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const preferredAreas = useMemo(() => parsePreferredAreas(preferredAreasText), [preferredAreasText]);

  const previewPayload = useMemo(
    () => ({
      mode,
      client: {
        name: clientName.trim(),
        email: clientEmail.trim() || null,
        phone: clientPhone.trim() || null,
        preferredAreas,
      },
      financial: {
        grossMonthlyIncome: Number(grossMonthlyIncome || 0),
        monthlyDebts: monthlyDebts ? Number(monthlyDebts) : null,
        monthlyExpenses: monthlyExpenses ? Number(monthlyExpenses) : null,
        dependents: dependents ? Number(dependents) : null,
        depositAmount: depositAmount ? Number(depositAmount) : null,
        employmentType: employmentType.trim() || null,
        docsUploaded: docsUploaded ? Number(docsUploaded) : null,
      },
    }),
    [
      mode,
      clientName,
      clientEmail,
      clientPhone,
      preferredAreas,
      grossMonthlyIncome,
      monthlyDebts,
      monthlyExpenses,
      dependents,
      depositAmount,
      employmentType,
      docsUploaded,
    ],
  );

  const canRunPreview =
    previewPayload.client.name.length >= 2 &&
    previewPayload.client.preferredAreas.length > 0 &&
    previewPayload.financial.grossMonthlyIncome > 0;

  const launchPreview = async () => {
    if (!canRunPreview) {
      toast.error('Add client name, preferred area, and gross monthly income.');
      return;
    }
    await previewMutation.mutateAsync(previewPayload);
    setStep(3);
  };

  const createReferralFromPreview = async () => {
    if (!canRunPreview) {
      toast.error('Complete required fields first.');
      return;
    }
    await createReferralMutation.mutateAsync(previewPayload);
  };

  const previewData = previewMutation.data;
  const previewPreferredMatches = previewData?.matches?.preferred || [];
  const previewNearbyMatches = previewData?.matches?.nearby || [];
  const previewOtherMatches = previewData?.matches?.other || [];
  const previewConfidenceScore = Number(previewData?.qualification?.confidenceScore || 0);
  const previewConfidenceLevel = normalizeConfidenceLevel(
    previewData?.qualification?.confidenceLevel,
    previewConfidenceScore,
  );
  const previewConfidenceHint =
    previewData?.qualification?.confidenceHint || confidenceLevelHint(previewConfidenceLevel);

  const referrals = listQuery.data || [];
  const latestReferral = detailQuery.data?.referral;
  const latestAssessment = detailQuery.data?.assessments?.[0];
  const latestConfidenceScore = Number(latestAssessment?.confidenceScore || 0);
  const latestConfidenceLevel = normalizeConfidenceLevel(
    latestAssessment?.confidenceLevel,
    latestConfidenceScore,
  );
  const latestConfidenceHint =
    latestAssessment?.confidenceHint || confidenceLevelHint(latestConfidenceLevel);

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-white/95 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Referral Qualification Layer
              </CardTitle>
              <CardDescription>
                Quick Qual in under 60 seconds, then move verified referrals into distribution deals.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {!showFullList && (
                <Button variant="outline" onClick={() => setLocation('/agent/referrals')}>
                  Open Workspace
                </Button>
              )}
              <Button onClick={() => setSheetOpen(true)}>New Referral + Quick Qual</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading referrals...
            </div>
          ) : referrals.length === 0 ? (
            <p className="text-sm text-slate-500">No referrals yet. Start with a Quick Qual.</p>
          ) : (
            <div className="space-y-2">
              {referrals.map((row: any) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {row.clientName} <span className="text-slate-400">#{row.referenceCode}</span>
                    </p>
                    <p className="text-xs text-slate-500">{row.affordabilityLabel}</p>
                    <p className="text-xs text-slate-500">
                      {confidenceLevelLabel(
                        normalizeConfidenceLevel(row.confidenceLevel, Number(row.latestConfidenceScore || 0)),
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusChipClass(row.status)}>
                      {row.statusLabel}
                    </Badge>
                    {showFullList && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReferralId(Number(row.id))}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showFullList && latestReferral && (
        <Card className="border-slate-200 bg-white/95 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {latestReferral.clientName} ({latestReferral.referenceCode})
                </CardTitle>
                <CardDescription>
                  Status: {latestReferral.statusLabel} | Preferred areas:{' '}
                  {(latestReferral.preferredAreas || []).join(', ') || 'None'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    generatePdfMutation.mutate({
                      referralId: Number(latestReferral.id),
                      assessmentId: latestAssessment ? Number(latestAssessment.id) : undefined,
                    })
                  }
                  disabled={generatePdfMutation.isPending}
                >
                  <FileText className="mr-1 h-4 w-4" /> Generate PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    sendUploadLinkMutation.mutate({
                      referralId: Number(latestReferral.id),
                      assessmentId: latestAssessment ? Number(latestAssessment.id) : undefined,
                    })
                  }
                  disabled={sendUploadLinkMutation.isPending}
                >
                  <Link2 className="mr-1 h-4 w-4" /> Send Upload Link
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestAssessment && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Estimated affordability</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {formatCurrency(latestAssessment.affordabilityMin)} -{' '}
                  {formatCurrency(latestAssessment.affordabilityMax)}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={latestConfidenceScore} className="h-2" />
                  <span className="text-xs text-slate-600">
                    Confidence {latestConfidenceScore}% ({confidenceLevelLabel(latestConfidenceLevel)})
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">{latestConfidenceHint}</p>
              </div>
            )}

            <Tabs defaultValue="preferred">
              <TabsList>
                <TabsTrigger value="preferred">
                  Preferred ({latestAssessment?.matches?.preferred?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="nearby">
                  Nearby ({latestAssessment?.matches?.nearby?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="other">
                  Other ({latestAssessment?.matches?.other?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preferred" className="space-y-2">
                {(latestAssessment?.matches?.preferred || []).map((match: any) => (
                  <MatchCard
                    key={`${match.developmentId}-${match.rankPosition}`}
                    match={match}
                    onSubmit={() =>
                      submitToDevelopmentMutation.mutate({
                        referralId: Number(latestReferral.id),
                        developmentId: Number(match.developmentId),
                        notes: `Submitted from referral qualification workspace (${latestReferral.referenceCode}).`,
                      })
                    }
                    disabled={submitToDevelopmentMutation.isPending || latestReferral.status === 'submitted'}
                  />
                ))}
              </TabsContent>

              <TabsContent value="nearby" className="space-y-2">
                {(latestAssessment?.matches?.nearby || []).map((match: any) => (
                  <MatchCard
                    key={`${match.developmentId}-${match.rankPosition}`}
                    match={match}
                    onSubmit={() =>
                      submitToDevelopmentMutation.mutate({
                        referralId: Number(latestReferral.id),
                        developmentId: Number(match.developmentId),
                        notes: `Submitted from nearby area match (${latestReferral.referenceCode}).`,
                      })
                    }
                    disabled={submitToDevelopmentMutation.isPending || latestReferral.status === 'submitted'}
                  />
                ))}
              </TabsContent>

              <TabsContent value="other" className="space-y-2">
                {(latestAssessment?.matches?.other || []).map((match: any) => (
                  <MatchCard
                    key={`${match.developmentId}-${match.rankPosition}`}
                    match={match}
                    onSubmit={() =>
                      submitToDevelopmentMutation.mutate({
                        referralId: Number(latestReferral.id),
                        developmentId: Number(match.developmentId),
                        notes: `Submitted from alternative area match (${latestReferral.referenceCode}).`,
                      })
                    }
                    disabled={submitToDevelopmentMutation.isPending || latestReferral.status === 'submitted'}
                  />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>New Referral + Quick Qual</SheetTitle>
            <SheetDescription>Step {step} of 3</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 p-4">
            {step === 1 && (
              <div className="space-y-3">
                <Input
                  placeholder="Client full name"
                  value={clientName}
                  onChange={event => setClientName(event.target.value)}
                />
                <Input
                  placeholder="Client email (optional)"
                  value={clientEmail}
                  onChange={event => setClientEmail(event.target.value)}
                />
                <Input
                  placeholder="Client phone (optional)"
                  value={clientPhone}
                  onChange={event => setClientPhone(event.target.value)}
                />
                <Input
                  placeholder="Preferred area(s), comma-separated"
                  value={preferredAreasText}
                  onChange={event => setPreferredAreasText(event.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSheetOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setStep(2)}>Next: Income</Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder="Gross monthly income"
                    value={grossMonthlyIncome}
                    onChange={event => setGrossMonthlyIncome(event.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Monthly debts (optional)"
                    value={monthlyDebts}
                    onChange={event => setMonthlyDebts(event.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Monthly expenses (optional)"
                    value={monthlyExpenses}
                    onChange={event => setMonthlyExpenses(event.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Dependents (optional)"
                    value={dependents}
                    onChange={event => setDependents(event.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Deposit amount (optional)"
                    value={depositAmount}
                    onChange={event => setDepositAmount(event.target.value)}
                  />
                  <Input
                    placeholder="Employment type (optional)"
                    value={employmentType}
                    onChange={event => setEmploymentType(event.target.value)}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder="Docs uploaded count (optional)"
                    value={docsUploaded}
                    onChange={event => setDocsUploaded(event.target.value)}
                  />
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3">
                    <Button
                      type="button"
                      variant={mode === 'quick_qual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMode('quick_qual')}
                    >
                      Quick Qual
                    </Button>
                    <Button
                      type="button"
                      variant={mode === 'verified_qual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMode('verified_qual')}
                    >
                      Verified Qual
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={launchPreview} disabled={previewMutation.isPending}>
                    {previewMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculating
                      </>
                    ) : (
                      'Preview Results'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                {previewData ? (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Estimated affordability</p>
                      <p className="text-3xl font-semibold text-slate-900">
                        {formatCurrency(previewData.qualification.affordabilityMin)} -{' '}
                        {formatCurrency(previewData.qualification.affordabilityMax)}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={previewConfidenceScore} />
                        <span className="text-xs text-slate-600">
                          Confidence {previewConfidenceScore}% ({confidenceLevelLabel(previewConfidenceLevel)})
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">{previewConfidenceHint}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-900">Improve accuracy</p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                        {(previewData.qualification.improveAccuracy || []).slice(0, 4).map((item: string) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <p className="text-sm font-medium text-slate-900">
                      Preferred area matches ({previewPreferredMatches.length})
                    </p>
                    <div className="space-y-2">
                      {previewPreferredMatches.map((match: any) => (
                        <MatchPreviewCard key={`${match.developmentId}-${match.rankPosition}`} match={match} />
                      ))}
                    </div>

                    <p className="text-sm font-medium text-slate-900">
                      Nearby area matches ({previewNearbyMatches.length})
                    </p>
                    <div className="space-y-2">
                      {previewNearbyMatches.map((match: any) => (
                        <MatchPreviewCard key={`${match.developmentId}-${match.rankPosition}`} match={match} />
                      ))}
                    </div>

                    <p className="text-sm font-medium text-slate-900">
                      Other area matches ({previewOtherMatches.length})
                    </p>
                    <div className="space-y-2">
                      {previewOtherMatches.map((match: any) => (
                        <MatchPreviewCard key={`${match.developmentId}-${match.rankPosition}`} match={match} />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Run preview to view results.</p>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button onClick={createReferralFromPreview} disabled={createReferralMutation.isPending}>
                    {createReferralMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating
                      </>
                    ) : (
                      'Create Referral'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MatchPreviewCard({ match }: { match: any }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-900">{match.developmentName}</p>
      <p className="text-xs text-slate-500">
        {match.areaLabel || 'Area not specified'} | Price from {formatCurrency(match.estimatedEntryPrice)}
      </p>
      <p className="mt-1 text-xs text-slate-600">
        {(match.matchReasons || []).slice(0, 2).join(' • ')}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled>
          Request viewing
        </Button>
        <Button size="sm" variant="outline" disabled>
          Send to client
        </Button>
        <Button size="sm" variant="outline" disabled>
          Collect documents
        </Button>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  onSubmit,
  disabled,
}: {
  match: any;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900">{match.developmentName}</p>
          <p className="text-xs text-slate-500">
            {match.areaLabel || 'Area not specified'} | Price from {formatCurrency(match.estimatedEntryPrice)}
          </p>
        </div>
        <Button size="sm" onClick={onSubmit} disabled={disabled}>
          Submit to Development
        </Button>
      </div>
      <p className="mt-1 text-xs text-slate-600">{(match.matchReasons || []).join(' • ')}</p>
    </div>
  );
}
