import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { CheckCircle2, Download, FileCheck2, Loader2, UserRound } from 'lucide-react';
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

type PartnerSubmitTransactionType = 'sale' | 'rent' | 'auction';
type BuyerRoute = 'bond' | 'cash' | 'investor';

export function normalizePartnerSubmitTransactionType(value: unknown): PartnerSubmitTransactionType {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (['rent', 'rental', 'for_rent', 'to_rent'].includes(normalized)) return 'rent';
  if (['auction', 'on_auction'].includes(normalized)) return 'auction';
  return 'sale';
}

export function getPartnerSubmitReferralCopy(transactionType: unknown) {
  const lane = normalizePartnerSubmitTransactionType(transactionType);

  if (lane === 'rent') {
    return {
      participantLabel: 'Renter',
      participantLower: 'renter',
      guidedLabel: 'Guided renter capture',
      pageTitle: 'Submit Renter',
      draftDescription: 'Drafts save locally in this browser while you prepare the renter profile.',
      noStockMessage: 'You can still prepare your renter and return in seconds once stock sync completes.',
      readyCountLabel: 'ready for renter submission.',
      wizardTitle: 'Renter Submission Wizard',
      preparingLabel: 'Preparing renter for',
      steps: ['Renter basics', 'Renter fit', 'Documents', 'Review'],
      nextSteps:
        'Next steps after submission: review, renter contact, qualification, viewing, lease application, lease signing, then referral reward progress.',
      namePlaceholder: 'Renter full name',
      phonePlaceholder: 'Renter phone',
      emailPlaceholder: 'Renter email',
      intentPlaceholder: 'Renter intent (long-term lease, relocation, family, immediate move-in)',
      routeLabel: 'Renter route',
      routeOptions: [
        { value: 'bond' as BuyerRoute, label: 'Employed renter' },
        { value: 'cash' as BuyerRoute, label: 'Deposit ready' },
        { value: 'investor' as BuyerRoute, label: 'Corporate renter' },
      ],
      budgetPlaceholder: 'Monthly rent range',
      snapshotPlaceholder: 'Rental snapshot (income, deposit, employer, move-in timing)',
      documentsTitle: 'Renter application documents',
      noDocumentsMessage: 'No renter document checklist is published yet.',
      developerDocumentsDescription:
        'Download these templates, get the renter to sign where needed, then upload the completed files on the referral detail page after submission.',
      supportingDocumentsDescription:
        'These files are for renter education and sharing. They do not block the application.',
      reviewTitle: 'Review renter submission',
      fitLabel: 'Renter fit',
      cannotSubmitTitle: 'This renter cannot be submitted yet',
      cannotSubmitDescription:
        'You can still continue preparing the renter profile while this is resolved.',
      submitButtonLabel: 'Submit Renter',
      submittingLabel: 'Submitting...',
      successMessage: 'Renter submitted successfully.',
      missingIdentityMessage: 'Provide at least renter name, phone, or email.',
    };
  }

  if (lane === 'auction') {
    return {
      participantLabel: 'Bidder',
      participantLower: 'bidder',
      guidedLabel: 'Guided bidder capture',
      pageTitle: 'Submit Bidder',
      draftDescription: 'Drafts save locally in this browser while you prepare the bidder profile.',
      noStockMessage: 'You can still prepare your bidder and return in seconds once stock sync completes.',
      readyCountLabel: 'ready for bidder submission.',
      wizardTitle: 'Bidder Submission Wizard',
      preparingLabel: 'Preparing bidder for',
      steps: ['Bidder basics', 'Bidder fit', 'Documents', 'Review'],
      nextSteps:
        'Next steps after submission: review, bidder contact, registration, auction readiness, auction terms, then referral reward progress.',
      namePlaceholder: 'Bidder full name',
      phonePlaceholder: 'Bidder phone',
      emailPlaceholder: 'Bidder email',
      intentPlaceholder: 'Bidder intent (cash bidder, investor, end-user, auction-ready)',
      routeLabel: 'Bidder route',
      routeOptions: [
        { value: 'bond' as BuyerRoute, label: 'Finance-backed bidder' },
        { value: 'cash' as BuyerRoute, label: 'Cash bidder' },
        { value: 'investor' as BuyerRoute, label: 'Investor bidder' },
      ],
      budgetPlaceholder: 'Bid range or ceiling',
      snapshotPlaceholder: 'Bidder snapshot (proof of funds, registration, deposit readiness)',
      documentsTitle: 'Bidder application documents',
      noDocumentsMessage: 'No bidder document checklist is published yet.',
      developerDocumentsDescription:
        'Download these templates, get the bidder to sign where needed, then upload the completed files on the referral detail page after submission.',
      supportingDocumentsDescription:
        'These files are for bidder education and sharing. They do not block auction readiness.',
      reviewTitle: 'Review bidder submission',
      fitLabel: 'Bidder fit',
      cannotSubmitTitle: 'This bidder cannot be submitted yet',
      cannotSubmitDescription:
        'You can still continue preparing the bidder profile while this is resolved.',
      submitButtonLabel: 'Submit Bidder',
      submittingLabel: 'Submitting...',
      successMessage: 'Bidder submitted successfully.',
      missingIdentityMessage: 'Provide at least bidder name, phone, or email.',
    };
  }

  return {
    participantLabel: 'Buyer',
    participantLower: 'buyer',
    guidedLabel: 'Guided buyer capture',
    pageTitle: 'Submit Buyer',
    draftDescription: 'Drafts save locally in this browser while you prepare the buyer profile.',
    noStockMessage: 'You can still prepare your buyer and return in seconds once stock sync completes.',
    readyCountLabel: 'ready for buyer submission.',
    wizardTitle: 'Buyer Submission Wizard',
    preparingLabel: 'Preparing buyer for',
    steps: ['Buyer basics', 'Buyer fit', 'Documents', 'Review'],
    nextSteps:
      'Next steps after submission: review, buyer contact, qualification, site visit, offer, sale, then referral reward progress.',
    namePlaceholder: 'Buyer full name',
    phonePlaceholder: 'Buyer phone',
    emailPlaceholder: 'Buyer email',
    intentPlaceholder: 'Buyer intent (first-time buyer, investor, family, cash buyer)',
    routeLabel: 'Buyer route',
    routeOptions: [
      { value: 'bond' as BuyerRoute, label: 'Bond finance' },
      { value: 'cash' as BuyerRoute, label: 'Cash buyer' },
      { value: 'investor' as BuyerRoute, label: 'Investor' },
    ],
    budgetPlaceholder: 'Budget or price range',
    snapshotPlaceholder: 'Affordability snapshot (income, deposit, pre-approval status)',
    documentsTitle: 'Buyer application documents',
    noDocumentsMessage: 'No buyer document checklist is published yet.',
    developerDocumentsDescription:
      'Download these templates, get the buyer to sign where needed, then upload the completed files on the referral detail page after submission.',
    supportingDocumentsDescription:
      'These files are for buyer education and sharing. They do not block the application.',
    reviewTitle: 'Review buyer submission',
    fitLabel: 'Buyer fit',
    cannotSubmitTitle: 'This buyer cannot be submitted yet',
    cannotSubmitDescription:
      'You can still continue preparing the buyer profile while this is resolved.',
    submitButtonLabel: 'Submit Buyer',
    submittingLabel: 'Submitting...',
    successMessage: 'Buyer submitted successfully.',
    missingIdentityMessage: 'Provide at least buyer name, phone, or email.',
  };
}

export function getPartnerSubmitRouteCopy(route: BuyerRoute, transactionType: unknown) {
  const lane = normalizePartnerSubmitTransactionType(transactionType);
  if (lane === 'rent') {
    if (route === 'cash') {
      return 'Deposit-ready renters usually need ID, proof of income, bank statements, and deposit confirmation before lease approval.';
    }
    if (route === 'investor') {
      return 'Corporate renters usually need company details, authorized contact information, affordability evidence, and lease mandate confirmation.';
    }
    return 'Employed renters usually need ID, proof of income, bank statements, references, and deposit readiness before the manager can qualify them.';
  }
  if (lane === 'auction') {
    if (route === 'cash') {
      return 'Cash bidders usually need ID, FICA, proof of funds, registration confirmation, and deposit readiness before auction approval.';
    }
    if (route === 'investor') {
      return 'Investor bidders usually need entity details, FICA, proof of funds or finance backing, and signed auction terms.';
    }
    return 'Finance-backed bidders usually need ID, proof of affordability, deposit readiness, and auction registration evidence before bidding.';
  }
  if (route === 'cash') {
    return 'Cash buyers usually need ID, proof of address, and proof of funds or bank confirmation. Developer forms still need to be signed and returned.';
  }
  if (route === 'investor') {
    return 'Investor buyers usually need affordability or proof-of-funds evidence plus the signed developer application pack.';
  }
  return 'Bond buyers usually need income proof, bank statements, and pre-approval or an affordability note before the manager can qualify them.';
}

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
  const [buyerRoute, setBuyerRoute] = useState<BuyerRoute>('bond');
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
      toast.success(getPartnerSubmitReferralCopy(selectedDevelopment?.transactionType).successMessage);
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
  const transactionCopy = getPartnerSubmitReferralCopy(selectedDevelopment?.transactionType);
  const selectedRequiredDocuments = selectedDevelopment?.requiredDocuments || [];
  const selectedBuyerDocuments = selectedRequiredDocuments.filter(
    (document: any) => document.category !== 'developer_document',
  );
  const selectedDeveloperApplicationDocuments = selectedRequiredDocuments.filter(
    (document: any) => document.category === 'developer_document',
  );
  const selectedSupportingDocuments = selectedDevelopment?.sourceDocuments || [];
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
  const steps = transactionCopy.steps;
  const routeCopy = getPartnerSubmitRouteCopy(buyerRoute, selectedDevelopment?.transactionType);

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
            <p className="text-[10px] font-semibold uppercase text-blue-100">
              {transactionCopy.guidedLabel}
            </p>
            <h1 className="mt-1 text-[28px] font-semibold">{transactionCopy.pageTitle}</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[#ece6da]">
              Choose a ready opportunity, capture what matters, and see what happens next.
            </p>
          </div>
          <CardHeader>
            <CardDescription>
              {transactionCopy.draftDescription}
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
                {transactionCopy.noStockMessage}
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
                  {referralReadyItems.length} {transactionCopy.readyCountLabel}
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
                    {transactionCopy.wizardTitle}
                  </CardTitle>
                  <CardDescription>
                    {selectedDevelopment
                      ? `${transactionCopy.preparingLabel} ${selectedDevelopment.developmentName}`
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
                    {transactionCopy.nextSteps}
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
                        placeholder={transactionCopy.namePlaceholder}
                        value={buyerName}
                        onChange={event => setBuyerName(event.target.value)}
                      />
                      <Input
                        placeholder={transactionCopy.phonePlaceholder}
                        value={buyerPhone}
                        onChange={event => setBuyerPhone(event.target.value)}
                      />
                      <Input
                        placeholder={transactionCopy.emailPlaceholder}
                        value={buyerEmail}
                        onChange={event => setBuyerEmail(event.target.value)}
                      />
                    </div>
                  ) : null}

                  {currentStep === 1 ? (
                    <div className="space-y-3">
                      <Input
                        placeholder={transactionCopy.intentPlaceholder}
                        value={buyerIntent}
                        onChange={event => setBuyerIntent(event.target.value)}
                      />
                      <div className="rounded-md border border-primary/15 bg-primary/5 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          {transactionCopy.routeLabel}
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          {transactionCopy.routeOptions.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                                buyerRoute === option.value
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-primary/15 bg-white text-foreground'
                              }`}
                              onClick={() => setBuyerRoute(option.value)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{routeCopy}</p>
                      </div>
                      <Input
                        placeholder="Preferred area or suburb"
                        value={preferredArea}
                        onChange={event => setPreferredArea(event.target.value)}
                      />
                      <Input
                        placeholder={transactionCopy.budgetPlaceholder}
                        value={budgetRange}
                        onChange={event => setBudgetRange(event.target.value)}
                      />
                      <Input
                        placeholder={transactionCopy.snapshotPlaceholder}
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
                          {transactionCopy.documentsTitle}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{routeCopy}</p>
                        {selectedBuyerDocuments.length ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                            {selectedBuyerDocuments.map((document: any) => (
                              <li key={document.templateId}>{document.documentLabel}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-slate-600">
                            {transactionCopy.noDocumentsMessage}
                          </p>
                        )}
                      </div>
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                        <p className="flex items-center gap-2 font-medium text-amber-950">
                          <FileCheck2 className="h-4 w-4 text-amber-700" />
                          Developer application documents
                        </p>
                        <p className="mt-1 text-xs text-amber-800">
                          {transactionCopy.developerDocumentsDescription}
                        </p>
                        {selectedDeveloperApplicationDocuments.length ? (
                          <div className="mt-2 space-y-2">
                            {selectedDeveloperApplicationDocuments.map((document: any) => (
                              <div
                                key={document.templateId}
                                className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-white px-2 py-2 text-xs"
                              >
                                <span className="font-medium text-foreground">{document.documentLabel}</span>
                                {document.templateFileUrl ? (
                                  <a
                                    href={document.templateFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Download template
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">Template pending</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-amber-800">
                            No developer application templates have been published yet.
                          </p>
                        )}
                      </div>
                      <div className="rounded-md border border-primary/15 bg-white p-3 text-sm">
                        <p className="flex items-center gap-2 font-medium text-foreground">
                          <Download className="h-4 w-4 text-primary" />
                          Supporting documents
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {transactionCopy.supportingDocumentsDescription}
                        </p>
                        {selectedSupportingDocuments.length ? (
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {selectedSupportingDocuments.map((document: any) => (
                              <a
                                key={document.templateId}
                                href={document.fileUrl || '#'}
                                target={document.fileUrl ? '_blank' : undefined}
                                rel="noreferrer"
                                className={`rounded border border-primary/15 px-2 py-2 text-xs ${
                                  document.fileUrl
                                    ? 'text-primary hover:bg-primary/5'
                                    : 'pointer-events-none text-muted-foreground'
                                }`}
                              >
                                {document.documentLabel}
                                <span className="block text-[10px] text-muted-foreground">
                                  {document.fileName || 'File pending upload'}
                                </span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">
                            No supporting files have been uploaded yet.
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
                      <p className="font-medium text-foreground">{transactionCopy.reviewTitle}</p>
                      <p className="mt-2">
                        {transactionCopy.participantLabel}:{' '}
                        {buyerName || buyerPhone || buyerEmail || 'Not captured yet'}
                      </p>
                      <p>Opportunity: {selectedDevelopment?.developmentName || 'Not selected yet'}</p>
                      <p>
                        {transactionCopy.fitLabel}:{' '}
                        {[buyerRoute, buyerIntent, preferredArea, budgetRange].filter(Boolean).join(' | ') || 'Not captured yet'}
                      </p>
                      <p>{transactionCopy.participantLabel} documents: {selectedBuyerDocuments.length || 0}</p>
                      <p>Developer application documents: {selectedDeveloperApplicationDocuments.length || 0}</p>
                      <p>Supporting files: {selectedSupportingDocuments.length || 0}</p>
                    </div>
                  ) : null}

                  {eligibilityBlockers.length ? (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <p className="font-semibold">{transactionCopy.cannotSubmitTitle}</p>
                      <p className="mt-1 text-xs text-red-600">
                        {transactionCopy.cannotSubmitDescription}
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
                        toast.error(transactionCopy.missingIdentityMessage);
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
                    {submitReferralMutation.isPending
                      ? transactionCopy.submittingLabel
                      : transactionCopy.submitButtonLabel}
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
