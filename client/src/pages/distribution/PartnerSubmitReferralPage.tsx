import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { CheckCircle2, FileCheck2, Loader2, UserRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PayoutRulesDisclosure } from '@/components/distribution/partner/PayoutRulesDisclosure';
import { toast } from 'sonner';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';

type EligibilityReason = {
  code?: string;
  message: string;
};

export default function PartnerSubmitReferralPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<number | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerIntent, setBuyerIntent] = useState('');
  const [preferredArea, setPreferredArea] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [affordabilitySnapshot, setAffordabilitySnapshot] = useState('');
  const [notes, setNotes] = useState('');
  const [clientReference, setClientReference] = useState('');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [eligibilityBlockers, setEligibilityBlockers] = useState<string[]>([]);
  const [duplicateDealId, setDuplicateDealId] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preselectedDevelopmentId = Number(params.get('developmentId') || 0);
    const preselectedAssessmentId = String(params.get('assessmentId') || '').trim();
    if (preselectedDevelopmentId > 0) {
      setSelectedDevelopmentId(preselectedDevelopmentId);
    }
    setAssessmentId(preselectedAssessmentId || null);
  }, []);

  useEffect(() => {
    const rawDraft = window.localStorage.getItem('distribution-submit-buyer-draft');
    if (!rawDraft) return;
    try {
      const draft = JSON.parse(rawDraft) as Record<string, string>;
      setBuyerName(draft.buyerName || '');
      setBuyerPhone(draft.buyerPhone || '');
      setBuyerEmail(draft.buyerEmail || '');
      setBuyerIntent(draft.buyerIntent || '');
      setPreferredArea(draft.preferredArea || '');
      setBudgetRange(draft.budgetRange || '');
      setAffordabilitySnapshot(draft.affordabilitySnapshot || '');
      setNotes(draft.notes || '');
      setClientReference(draft.clientReference || '');
    } catch {
      window.localStorage.removeItem('distribution-submit-buyer-draft');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      'distribution-submit-buyer-draft',
      JSON.stringify({
        buyerName,
        buyerPhone,
        buyerEmail,
        buyerIntent,
        preferredArea,
        budgetRange,
        affordabilitySnapshot,
        notes,
        clientReference,
      }),
    );
  }, [
    affordabilitySnapshot,
    budgetRange,
    buyerEmail,
    buyerIntent,
    buyerName,
    buyerPhone,
    clientReference,
    notes,
    preferredArea,
  ]);

  const eligibleDevelopmentsQuery =
    trpc.distribution.partner.listEligibleDevelopmentsForSubmission.useQuery(undefined, {
      enabled: isAuthenticated,
      retry: false,
    });

  const submitReferralMutation = trpc.distribution.partner.submitReferral.useMutation({
    onSuccess: result => {
      window.localStorage.removeItem('distribution-submit-buyer-draft');
      toast.success('Buyer submitted successfully.');
      setLocation(`/distribution/partner/referrals/${Number(result.dealId)}`);
    },
    onError: error => {
      const errorData = (error as any)?.data || {};
      const errorCode = String(errorData.errorCode || '');
      if (errorCode === 'PROGRAM_NOT_ELIGIBLE') {
        const reasons = Array.isArray(errorData.reasons) ? (errorData.reasons as EligibilityReason[]) : [];
        setEligibilityBlockers(reasons.map(reason => friendlyBlockerMessage(reason)).filter(Boolean));
        setDuplicateDealId(null);
        return;
      }
      if (errorCode === 'DUPLICATE_REFERRAL') {
        const existingDealId = Number(errorData.existingDealId || 0);
        setDuplicateDealId(existingDealId > 0 ? existingDealId : null);
        setEligibilityBlockers([]);
        return;
      }
      setEligibilityBlockers([error.message || 'Unable to submit referral.']);
      setDuplicateDealId(null);
    },
  });

  const availableItems = eligibleDevelopmentsQuery.data?.items || [];
  const referralReadyItems = useMemo(
    () =>
      availableItems.filter(
        item => item.opportunity?.status === 'ready' || (Boolean(item.program?.isActive) && Boolean(item.program?.isReferralEnabled)),
      ),
    [availableItems],
  );

  useEffect(() => {
    if (!availableItems.length) {
      setSelectedDevelopmentId(null);
      return;
    }
    if (!selectedDevelopmentId) {
      const defaultItem = referralReadyItems[0] || availableItems[0];
      setSelectedDevelopmentId(Number(defaultItem.developmentId));
      return;
    }
    const stillAvailable = availableItems.some(
      item => Number(item.developmentId) === Number(selectedDevelopmentId),
    );
    if (!stillAvailable) {
      const defaultItem = referralReadyItems[0] || availableItems[0];
      setSelectedDevelopmentId(Number(defaultItem.developmentId));
    }
  }, [availableItems, referralReadyItems, selectedDevelopmentId]);

  const selectedDevelopment = useMemo(
    () =>
      availableItems.find(
        item => Number(item.developmentId) === Number(selectedDevelopmentId || 0),
      ) || null,
    [availableItems, selectedDevelopmentId],
  );
  const selectedRequiredDocuments = selectedDevelopment?.requiredDocuments || [];
  const selectedIsReady =
    selectedDevelopment?.opportunity?.status === 'ready' ||
    (Boolean(selectedDevelopment?.program?.isActive) &&
      Boolean(selectedDevelopment?.program?.isReferralEnabled));
  const buyerNotes = [
    buyerIntent ? `Intent: ${buyerIntent}` : '',
    preferredArea ? `Preferred area: ${preferredArea}` : '',
    budgetRange ? `Budget: ${budgetRange}` : '',
    affordabilitySnapshot ? `Affordability: ${affordabilitySnapshot}` : '',
    notes.trim(),
  ]
    .filter(Boolean)
    .join('\n');
  const steps = ['Buyer basics', 'Buyer fit', 'Documents', 'Review'];

  function friendlyBlockerMessage(reason: EligibilityReason) {
    const code = String(reason.code || '').toUpperCase();
    if (code === 'REQUIRED_DOCS_MISSING') {
      return 'Application documents are still being prepared for this opportunity.';
    }
    if (code === 'NO_MANAGER_ASSIGNED') {
      return 'This opportunity is not accepting referrals yet.';
    }
    if (code === 'REFERRALS_DISABLED') {
      return 'Referrals are currently closed for this opportunity.';
    }
    if (code === 'PROGRAM_INACTIVE') {
      return 'This opportunity is not accepting referrals yet.';
    }
    if (code === 'SUBMISSIONS_CLOSED') {
      return 'Referral submissions are currently closed for this opportunity.';
    }
    return reason.message || 'This opportunity is not accepting referrals right now.';
  }

  if (loading || eligibleDevelopmentsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-6 md:px-7">
        <Card className="mb-5 overflow-hidden border-primary/15 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[var(--brand-blue)] via-[var(--info)] to-[var(--brand-blue-hover)] px-6 py-5 text-white">
            <p className="text-[10px] font-semibold uppercase text-blue-100">Guided buyer capture</p>
            <h1 className="mt-1 text-[28px] font-semibold">Submit Buyer</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[#ece6da]">
              Choose a ready opportunity, capture what matters, and see what happens next.
            </p>
          </div>
          <CardHeader>
            <CardDescription>
              Drafts save locally in this browser while you prepare the buyer profile.
            </CardDescription>
          </CardHeader>
        </Card>

        {eligibleDevelopmentsQuery.error ? (
          <Card className="mb-4">
            <CardContent className="py-6 text-sm text-red-600">
              {eligibleDevelopmentsQuery.error.message}
            </CardContent>
          </Card>
        ) : null}

        {!eligibleDevelopmentsQuery.error && !availableItems.length ? (
          <Card className="mb-4">
            <CardContent className="space-y-3 py-6">
              <p className="text-sm text-slate-700">
                We could not find developments linked to your referral network yet.
              </p>
              <p className="text-xs text-slate-500">
                You can still prepare your buyer and return in seconds once stock sync completes.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setLocation('/distribution/partner/developments')}
                >
                  Browse Developments
                </Button>
                <Button
                  size="sm"
                  variant="conversion"
                  onClick={() => setLocation('/distribution/partner/accelerator')}
                >
                  Run Pre-Qualification
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {availableItems.length ? (
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <Card className="h-fit border-primary/15 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Available Developments</CardTitle>
                <CardDescription>
                  {referralReadyItems.length} ready for buyer submission.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {availableItems.map(item => {
                  const isSelected =
                    Number(item.developmentId) === Number(selectedDevelopmentId || 0);
                  const isReady =
                    Boolean(item.program?.isActive) && Boolean(item.program?.isReferralEnabled);
                  return (
                    <button
                      key={item.developmentId}
                      className={`w-full rounded-md border px-3 py-3 text-left text-sm transition ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-primary/15 bg-primary/5 hover:border-primary/20'
                      }`}
                      onClick={() => {
                        setSelectedDevelopmentId(Number(item.developmentId));
                        setEligibilityBlockers([]);
                        setDuplicateDealId(null);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{item.developmentName}</p>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : isReady
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isReady ? 'Ready' : 'Coming soon'}
                        </span>
                      </div>
                      <p className={`text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                        {[item.city, item.province].filter(Boolean).join(', ') || 'Location unavailable'}
                      </p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <PayoutRulesDisclosure developmentId={selectedDevelopmentId} />

              <Card className="border-primary/15 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserRound className="h-4 w-4 text-primary" />
                    Buyer Submission Wizard
                  </CardTitle>
                  <CardDescription>
                    {selectedDevelopment
                      ? `Preparing buyer for ${selectedDevelopment.developmentName}`
                      : 'Select a ready opportunity first'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-4">
                    {steps.map((step, index) => (
                      <button
                        key={step}
                        type="button"
                        className={`rounded-md border px-2 py-2 text-xs font-medium ${
                          index === currentStep
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-primary/15 bg-primary/5 text-muted-foreground'
                        }`}
                        onClick={() => setCurrentStep(index)}
                      >
                        {index + 1}. {step}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-md border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
                    <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                    Next steps after submission: review, buyer contact, qualification, site visit, offer,
                    sale, then referral reward progress.
                  </div>
                  {selectedDevelopment &&
                  !selectedIsReady ? (
                    <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      {selectedDevelopment.opportunity?.friendlyMessage ||
                        'This opportunity is not accepting referrals yet.'}
                    </div>
                  ) : null}
                  {assessmentId ? (
                    <div className="rounded border border-primary/20 bg-primary/5 p-2 text-xs text-blue-700">
                      This referral will attach affordability assessment <code>{assessmentId}</code>.
                    </div>
                  ) : null}
                  {currentStep === 0 ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="Buyer full name"
                        value={buyerName}
                        onChange={event => setBuyerName(event.target.value)}
                      />
                      <Input
                        placeholder="Buyer phone"
                        value={buyerPhone}
                        onChange={event => setBuyerPhone(event.target.value)}
                      />
                      <Input
                        placeholder="Buyer email"
                        value={buyerEmail}
                        onChange={event => setBuyerEmail(event.target.value)}
                      />
                    </div>
                  ) : null}

                  {currentStep === 1 ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="Buyer intent (first-time buyer, investor, family, cash buyer)"
                        value={buyerIntent}
                        onChange={event => setBuyerIntent(event.target.value)}
                      />
                      <Input
                        placeholder="Preferred area or suburb"
                        value={preferredArea}
                        onChange={event => setPreferredArea(event.target.value)}
                      />
                      <Input
                        placeholder="Budget or price range"
                        value={budgetRange}
                        onChange={event => setBudgetRange(event.target.value)}
                      />
                      <Input
                        placeholder="Affordability snapshot (income, deposit, pre-approval status)"
                        value={affordabilitySnapshot}
                        onChange={event => setAffordabilitySnapshot(event.target.value)}
                      />
                    </div>
                  ) : null}

                  {currentStep === 2 ? (
                    <div className="space-y-3">
                      <div className="rounded-md border border-primary/15 bg-primary/5 p-3 text-sm">
                        <p className="flex items-center gap-2 font-medium text-foreground">
                          <FileCheck2 className="h-4 w-4 text-primary" />
                          Application documents
                        </p>
                        {selectedRequiredDocuments.length ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                            {selectedRequiredDocuments.map((document: any) => (
                              <li key={document.templateId}>{document.documentLabel}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-slate-600">
                            No application document checklist is published yet.
                          </p>
                        )}
                      </div>
                      <Input
                        placeholder="Client reference (optional duplicate-safe key)"
                        value={clientReference}
                        onChange={event => setClientReference(event.target.value)}
                      />
                      <Textarea
                        placeholder="Anything the manager should know?"
                        rows={4}
                        value={notes}
                        onChange={event => setNotes(event.target.value)}
                      />
                    </div>
                  ) : null}

                  {currentStep === 3 ? (
                    <div className="rounded-md border border-primary/15 bg-primary/5 p-3 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">Review buyer submission</p>
                      <p className="mt-2">Buyer: {buyerName || buyerPhone || buyerEmail || 'Not captured yet'}</p>
                      <p>Opportunity: {selectedDevelopment?.developmentName || 'Not selected yet'}</p>
                      <p>Buyer fit: {[buyerIntent, preferredArea, budgetRange].filter(Boolean).join(' | ') || 'Not captured yet'}</p>
                      <p>Application documents: {selectedRequiredDocuments.length || 0}</p>
                    </div>
                  ) : null}

                  {eligibilityBlockers.length ? (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <p className="font-semibold">This buyer cannot be submitted yet</p>
                      <p className="mt-1 text-xs text-red-600">
                        You can still continue preparing the buyer profile while this is resolved.
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {eligibilityBlockers.map(reason => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {duplicateDealId ? (
                    <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      A matching referral already exists for this development.
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/distribution/partner/referrals/${duplicateDealId}`)}
                        >
                          View existing referral
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={currentStep === 0}
                      onClick={() => setCurrentStep(step => Math.max(0, step - 1))}
                    >
                      Back
                    </Button>
                    <Button
                      variant="outline"
                      disabled={currentStep === steps.length - 1}
                      onClick={() => setCurrentStep(step => Math.min(steps.length - 1, step + 1))}
                    >
                      Next
                    </Button>
                  </div>

                  <Button
                    variant="conversion"
                    className="w-full"
                    disabled={submitReferralMutation.isPending || !selectedDevelopmentId || !selectedIsReady}
                    onClick={() => {
                      if (!selectedDevelopmentId) {
                        toast.error('Select a ready opportunity to continue.');
                        return;
                      }
                      if (!buyerName.trim() && !buyerPhone.trim() && !buyerEmail.trim()) {
                        toast.error('Provide at least buyer name, phone, or email.');
                        return;
                      }

                      setEligibilityBlockers([]);
                      setDuplicateDealId(null);
                      submitReferralMutation.mutate({
                        developmentId: Number(selectedDevelopmentId),
                        buyerName: buyerName.trim() || undefined,
                        buyerPhone: buyerPhone.trim() || undefined,
                        buyerEmail: buyerEmail.trim() || undefined,
                        notes: buyerNotes || undefined,
                        clientReference: clientReference.trim() || undefined,
                        assessmentId: assessmentId || undefined,
                      });
                    }}
                  >
                    {submitReferralMutation.isPending ? 'Submitting...' : 'Submit Buyer'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </main>
    </ReferralAppShell>
  );
}
