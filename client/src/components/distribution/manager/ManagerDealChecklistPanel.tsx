import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type DealDocumentStatus = 'pending' | 'received' | 'verified' | 'rejected';
type ManualReadinessReviewType = 'rental_lease_readiness' | 'auction_bidder_readiness';
type ManualReadinessReviewStatus = 'pending' | 'accepted' | 'rejected';

type DealChecklist = {
  dealId: number;
  dealRef: string;
  buyerName: string | null;
  developmentId: number;
  developmentName: string;
  transactionType?: string | null;
  programId: number | null;
  payoutMilestone: string | null;
  currencyCode: string | null;
  commissionSummary: {
    commissionModel: string | null;
    defaultCommissionPercent: number | null;
    defaultCommissionAmount: number | null;
  };
  requiredDocuments: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    templateFileUrl?: string | null;
    templateFileName?: string | null;
    isRequired: boolean;
    sortOrder: number;
    isActive: boolean;
    status: DealDocumentStatus;
    receivedAt: string | null;
    verifiedAt: string | null;
    submittedFileUrl?: string | null;
    submittedFileName?: string | null;
    submittedAt?: string | null;
    receivedBy: { userId: number; name?: string } | null;
    verifiedBy: { userId: number; name?: string } | null;
    submittedBy?: { userId: number; name?: string } | null;
    notes: string | null;
  }>;
  computed: {
    requiredCount: number;
    verifiedRequiredCount: number;
    allRequiredVerified: boolean;
    payoutReady: boolean;
    blockers: string[];
    programmeSemantics?: {
      transactionLane: 'sale' | 'rent' | 'auction';
      expectedRoles: string[];
      configuredRoles: string[];
      missingRoles: string[];
      wrongLaneWarnings: string[];
      documentRoles: Array<{
        templateId: number;
        documentLabel: string;
        documentCode: string;
        readinessRole: string;
        appliesToLane: boolean;
        blocksPayoutAutomation: boolean;
      }>;
      automationAllowed: false;
      automationBlockedReason: string;
      transactionRuleModel?: {
        payoutTriggers: string[];
        requiredConditions: string[];
        implementationStatus: 'shared_sale_shell' | 'transaction_specific_rules_required';
        draftRule?: {
          source: 'payout_milestone_notes';
          lane: 'sale' | 'rent' | 'auction';
          trigger: string;
          requiredConditions: string[];
          automationStatus: 'disabled';
        } | null;
      };
    };
    manualReadinessReviews?: Array<{
      reviewType: ManualReadinessReviewType;
      label: string;
      description: string;
      requiredRoles: string[];
      status: ManualReadinessReviewStatus;
      notes: string | null;
      reviewedAt: string | null;
      reviewedBy: { userId: number; name?: string } | null;
      blockers: string[];
    }>;
  };
};

function formatCommission(checklist: DealChecklist) {
  const summary = checklist.commissionSummary;
  if (summary.commissionModel === 'flat_percentage' && summary.defaultCommissionPercent) {
    return `${summary.defaultCommissionPercent}%`;
  }
  if (summary.commissionModel === 'flat_amount' && summary.defaultCommissionAmount) {
    const currency = checklist.currencyCode || 'ZAR';
    return `${currency} ${summary.defaultCommissionAmount}`;
  }
  return 'Not configured';
}

function formatActor(actor: { userId: number; name?: string } | null) {
  if (!actor) return 'Unassigned';
  return actor.name || `User #${actor.userId}`;
}

function formatReadinessRole(role: string) {
  return role
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatRuleStatus(status: string | undefined) {
  if (status === 'shared_sale_shell') return 'Shared Sale shell baseline';
  if (status === 'transaction_specific_rules_required') return 'Transaction-specific rules required';
  return 'Rule model unavailable';
}

type ChecklistTransactionLane = 'sale' | 'rent' | 'auction';

export function normalizeChecklistTransactionLane(transactionType: unknown): ChecklistTransactionLane {
  const normalized = String(transactionType || '').trim().toLowerCase();
  if (['for_rent', 'rent', 'rental', 'to_rent', 'to-rent'].includes(normalized)) return 'rent';
  if (['auction', 'on_auction', 'on-auction'].includes(normalized)) return 'auction';
  return 'sale';
}

export function getChecklistTransactionCopy(transactionType: unknown) {
  const lane = normalizeChecklistTransactionLane(transactionType);
  if (lane === 'rent') {
    return {
      engineLabel: 'Rental engine',
      participantLabel: 'Rental applicant',
      readinessLabel: 'Rental Checklist Readiness',
      readyLabel: 'Checklist Ready for Manual Review',
      notReadyLabel: 'Checklist Not Ready for Manual Review',
      documentTitle: 'Rental Applicant Document Checklist',
      documentDescription: 'Update received and verification status for rental applicant documents.',
      readinessNote:
        'This confirms verified documents and current milestone checks only. Lease, deposit, payout, and reward movement still require explicit Rental programme rules and manual review.',
    };
  }
  if (lane === 'auction') {
    return {
      engineLabel: 'Auction engine',
      participantLabel: 'Bidder',
      readinessLabel: 'Auction Checklist Readiness',
      readyLabel: 'Checklist Ready for Manual Review',
      notReadyLabel: 'Checklist Not Ready for Manual Review',
      documentTitle: 'Bidder Document Checklist',
      documentDescription: 'Update received and verification status for bidder documents.',
      readinessNote:
        'This confirms verified documents and current milestone checks only. Bidder approval, auction terms, payout, and reward movement still require explicit Auction programme rules and manual review.',
    };
  }
  return {
    engineLabel: 'Sale engine',
    participantLabel: 'Buyer',
    readinessLabel: 'Payout Readiness',
    readyLabel: 'Payout Ready',
    notReadyLabel: 'Payout Not Ready',
    documentTitle: 'Buyer Document Checklist',
    documentDescription: 'Update received and verification status for buyer documents.',
    readinessNote:
      'Payout readiness uses verified documents and any milestone checks the system can prove today. Unsupported milestones still require manual confirmation.',
  };
}

export function getChecklistProgrammeSemanticsCopy(transactionType: unknown) {
  const lane = normalizeChecklistTransactionLane(transactionType);

  if (lane === 'rent') {
    return {
      heading: 'Rental programme semantics',
      statusLabel: 'Readiness metadata not configured',
      description:
        'This checklist can verify renter documents, but Rental reward automation still needs explicit lease, deposit, and payout rules.',
      requiredReadiness: ['Lease signed', 'Deposit received', 'Rental documents verified'],
      missingMetadata:
        'Document templates do not yet identify Rental readiness roles such as lease, deposit, or payout blocking.',
      guardrail:
        'Do not move or pay a Rental reward from a let outcome until those programme rules are configured and reviewed.',
    };
  }

  if (lane === 'auction') {
    return {
      heading: 'Auction programme semantics',
      statusLabel: 'Readiness metadata not configured',
      description:
        'This checklist can verify bidder documents, but Auction reward automation still needs explicit bidder, auction-term, and outcome rules.',
      requiredReadiness: ['Bidder approved', 'Auction terms accepted', 'Winning bidder confirmed'],
      missingMetadata:
        'Document templates do not yet identify Auction readiness roles such as registration, proof of funds, legal pack, or payout blocking.',
      guardrail:
        'Do not move or pay an Auction reward from an auction outcome until those programme rules are configured and reviewed.',
    };
  }

  return {
    heading: 'Sale programme semantics',
    statusLabel: 'Current baseline',
    description:
      'Sale remains the current baseline for configured document verification and payout milestone checks.',
    requiredReadiness: ['Buyer documents verified', 'Configured sale milestone satisfied'],
    missingMetadata:
      'Template lane/readiness metadata is still future work, but existing Sale milestones are broadly coherent.',
    guardrail:
      'Reward readiness still follows the configured programme terms and manager review.',
  };
}

export function ManagerDealChecklistPanel({
  checklist,
  savingTemplateId,
  savingReviewType,
  isBatchSaving,
  onUpdateDocumentStatus,
  onUpdateManualReadinessReview,
  onMarkAllRequiredReceived,
  onMarkAllRequiredVerified,
}: {
  checklist: DealChecklist;
  savingTemplateId: number | null;
  savingReviewType?: string | null;
  isBatchSaving?: boolean;
  onUpdateDocumentStatus: (input: {
    templateId: number;
    status: DealDocumentStatus;
    notes?: string | null;
    submittedFileUrl?: string | null;
    submittedFileName?: string | null;
  }) => Promise<void>;
  onUpdateManualReadinessReview?: (input: {
    reviewType: ManualReadinessReviewType;
    status: Exclude<ManualReadinessReviewStatus, 'pending'>;
    notes?: string | null;
  }) => Promise<void>;
  onMarkAllRequiredReceived?: () => Promise<void>;
  onMarkAllRequiredVerified?: () => Promise<void>;
}) {
  const [notesByTemplateId, setNotesByTemplateId] = useState<Record<number, string>>({});
  const [fileUrlByTemplateId, setFileUrlByTemplateId] = useState<Record<number, string>>({});
  const [fileNameByTemplateId, setFileNameByTemplateId] = useState<Record<number, string>>({});
  const [reviewNotesByType, setReviewNotesByType] = useState<Record<string, string>>({});
  const transactionCopy = getChecklistTransactionCopy(checklist.transactionType);
  const semanticsCopy = getChecklistProgrammeSemanticsCopy(checklist.transactionType);
  const semanticsReadModel = checklist.computed.programmeSemantics;
  const transactionRuleModel = semanticsReadModel?.transactionRuleModel;
  const missingReadinessRoles = semanticsReadModel?.missingRoles || [];
  const configuredReadinessRoles = semanticsReadModel?.configuredRoles || [];

  useEffect(() => {
    const next: Record<number, string> = {};
    for (const row of checklist.requiredDocuments) {
      next[row.templateId] = row.notes || '';
    }
    setNotesByTemplateId(next);
    const nextUrls: Record<number, string> = {};
    const nextNames: Record<number, string> = {};
    for (const row of checklist.requiredDocuments) {
      nextUrls[row.templateId] = row.submittedFileUrl || '';
      nextNames[row.templateId] = row.submittedFileName || '';
    }
    setFileUrlByTemplateId(nextUrls);
    setFileNameByTemplateId(nextNames);
  }, [checklist.requiredDocuments]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const review of checklist.computed.manualReadinessReviews || []) {
      next[review.reviewType] = review.notes || '';
    }
    setReviewNotesByType(next);
  }, [checklist.computed.manualReadinessReviews]);

  const orderedDocuments = useMemo(
    () =>
      [...checklist.requiredDocuments].sort(
        (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0),
      ),
    [checklist.requiredDocuments],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {checklist.developmentName} | {checklist.dealRef}
          </CardTitle>
          <CardDescription>
            {checklist.buyerName
              ? `${transactionCopy.participantLabel}: ${checklist.buyerName}`
              : `${transactionCopy.participantLabel} details unavailable`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Transaction Engine</p>
            <p className="font-medium">{transactionCopy.engineLabel}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Commission</p>
            <p className="font-medium">{formatCommission(checklist)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Payout Milestone</p>
            <p className="font-medium">{checklist.payoutMilestone || 'Not configured'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Currency</p>
            <p className="font-medium">{checklist.currencyCode || 'Not configured'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className={checklist.computed.payoutReady ? 'border-emerald-300' : 'border-amber-300'}>
        <CardHeader>
          <CardDescription>{transactionCopy.readinessLabel}</CardDescription>
          <CardTitle className={checklist.computed.payoutReady ? 'text-emerald-700' : 'text-amber-700'}>
            {checklist.computed.payoutReady
              ? transactionCopy.readyLabel
              : transactionCopy.notReadyLabel}
          </CardTitle>
          <CardDescription>
            Verified required documents: {checklist.computed.verifiedRequiredCount}/
            {checklist.computed.requiredCount}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {!checklist.computed.payoutReady &&
            checklist.computed.blockers.map(blocker => (
              <p key={blocker} className="text-amber-700">
                - {blocker}
              </p>
            ))}
          <p className="text-xs text-slate-500">
            {transactionCopy.readinessNote}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>{semanticsCopy.statusLabel}</CardDescription>
          <CardTitle className="text-base">{semanticsCopy.heading}</CardTitle>
          <CardDescription>{semanticsCopy.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500">Required readiness before automation</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
              {(semanticsReadModel?.expectedRoles || semanticsCopy.requiredReadiness).map(item => (
                <li key={item}>{formatReadinessRole(item)}</li>
              ))}
            </ul>
          </div>
          {configuredReadinessRoles.length ? (
            <div>
              <p className="text-xs font-semibold text-slate-500">Configured from current templates</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                {configuredReadinessRoles.map(item => (
                  <li key={item}>{formatReadinessRole(item)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {missingReadinessRoles.length ? (
            <div>
              <p className="text-xs font-semibold text-slate-500">Missing readiness metadata</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-amber-800">
                {missingReadinessRoles.map(item => (
                  <li key={item}>{formatReadinessRole(item)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {semanticsReadModel?.wrongLaneWarnings.length ? (
            <div>
              <p className="text-xs font-semibold text-slate-500">Wrong-lane template warnings</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-amber-800">
                {semanticsReadModel.wrongLaneWarnings.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {transactionRuleModel ? (
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Transaction rule model</p>
              <p className="mt-1 text-sm font-medium">
                {formatRuleStatus(transactionRuleModel.implementationStatus)}
              </p>
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-500">Payout trigger vocabulary</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  {transactionRuleModel.payoutTriggers.map(trigger => (
                    <li key={trigger}>{formatReadinessRole(trigger)}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-500">Required conditions before automation</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  {transactionRuleModel.requiredConditions.map(condition => (
                    <li key={condition}>{condition}</li>
                  ))}
                </ul>
              </div>
              {transactionRuleModel.draftRule ? (
                <div className="mt-2 rounded border border-amber-200 bg-white p-2">
                  <p className="text-xs font-semibold text-amber-900">Saved draft rule notes</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Trigger: {formatReadinessRole(transactionRuleModel.draftRule.trigger)} |
                    Automation: {formatReadinessRole(transactionRuleModel.draftRule.automationStatus)}
                  </p>
                  {transactionRuleModel.draftRule.requiredConditions.length ? (
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-amber-800">
                      {transactionRuleModel.draftRule.requiredConditions.map(condition => (
                        <li key={condition}>{condition}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <p className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            {semanticsReadModel?.automationBlockedReason || semanticsCopy.missingMetadata}
          </p>
          <p className="text-xs text-slate-500">{semanticsCopy.guardrail}</p>
        </CardContent>
      </Card>

      {checklist.computed.manualReadinessReviews?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Manual Readiness Review</CardTitle>
            <CardDescription>
              Records manager readiness decisions without changing stage, payout, or reward status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.computed.manualReadinessReviews.map(review => {
              const isSavingReview = savingReviewType === review.reviewType;
              const canAccept = review.blockers.length === 0;

              return (
                <div key={review.reviewType} className="rounded border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{review.label}</p>
                      <p className="mt-1 text-xs text-slate-600">{review.description}</p>
                    </div>
                    <Badge
                      variant={
                        review.status === 'accepted'
                          ? 'default'
                          : review.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {formatReadinessRole(review.status)}
                    </Badge>
                  </div>

                  <div className="mt-2 text-xs text-slate-600">
                    Required roles: {review.requiredRoles.map(formatReadinessRole).join(', ')}
                  </div>
                  {review.blockers.length ? (
                    <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      {review.blockers.map(blocker => (
                        <p key={blocker}>- {blocker}</p>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-2 md:grid-cols-[minmax(200px,1fr)_auto_auto]">
                    <Input
                      value={reviewNotesByType[review.reviewType] || ''}
                      disabled={isSavingReview}
                      placeholder="Manual review note"
                      onChange={event =>
                        setReviewNotesByType(current => ({
                          ...current,
                          [review.reviewType]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSavingReview || !canAccept || !onUpdateManualReadinessReview}
                      onClick={() =>
                        void onUpdateManualReadinessReview?.({
                          reviewType: review.reviewType,
                          status: 'accepted',
                          notes: reviewNotesByType[review.reviewType] || null,
                        })
                      }
                    >
                      Accept readiness
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isSavingReview || !onUpdateManualReadinessReview}
                      onClick={() =>
                        void onUpdateManualReadinessReview?.({
                          reviewType: review.reviewType,
                          status: 'rejected',
                          notes: reviewNotesByType[review.reviewType] || null,
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Last reviewed: {review.reviewedAt || 'Pending'} |{' '}
                    {formatActor(review.reviewedBy)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{transactionCopy.documentTitle}</CardTitle>
          <CardDescription>{transactionCopy.documentDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 rounded border bg-slate-50 p-2">
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(isBatchSaving)}
              onClick={() => void onMarkAllRequiredReceived?.()}
            >
              Mark All Required as Received
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(isBatchSaving)}
              onClick={() => void onMarkAllRequiredVerified?.()}
            >
              Mark All Required as Verified
            </Button>
            {isBatchSaving ? <p className="self-center text-xs text-blue-600">Applying batch update...</p> : null}
          </div>
          {orderedDocuments.map(document => (
            <div key={document.templateId} className="rounded border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{document.documentLabel}</p>
                  <p className="text-xs text-slate-500">{document.documentCode}</p>
                  {document.templateFileUrl ? (
                    <a
                      href={document.templateFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Download document
                      {document.templateFileName ? ` (${document.templateFileName})` : ''}
                    </a>
                  ) : null}
                </div>
                <Badge variant={document.isRequired ? 'default' : 'secondary'}>
                  {document.isRequired ? 'Required' : 'Optional'}
                </Badge>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`status-${document.templateId}`}>Status</Label>
                  <select
                    id={`status-${document.templateId}`}
                    className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
                    value={document.status}
                    disabled={savingTemplateId === document.templateId || Boolean(isBatchSaving)}
                    onChange={event =>
                      void onUpdateDocumentStatus({
                        templateId: document.templateId,
                        status: event.target.value as DealDocumentStatus,
                        notes: notesByTemplateId[document.templateId] || null,
                      })
                    }
                  >
                    <option value="pending">pending</option>
                    <option value="received">received</option>
                    <option value="verified">verified</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`notes-${document.templateId}`}>Notes</Label>
                  <Input
                    id={`notes-${document.templateId}`}
                    value={notesByTemplateId[document.templateId] || ''}
                    disabled={savingTemplateId === document.templateId || Boolean(isBatchSaving)}
                    onChange={event =>
                      setNotesByTemplateId(current => ({
                        ...current,
                        [document.templateId]: event.target.value,
                      }))
                    }
                    onBlur={() =>
                      void onUpdateDocumentStatus({
                        templateId: document.templateId,
                        status: document.status,
                        notes: notesByTemplateId[document.templateId] || null,
                      })
                    }
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`file-url-${document.templateId}`}>Submitted file URL</Label>
                  <Input
                    id={`file-url-${document.templateId}`}
                    placeholder="https://..."
                    value={fileUrlByTemplateId[document.templateId] || ''}
                    disabled={savingTemplateId === document.templateId || Boolean(isBatchSaving)}
                    onChange={event =>
                      setFileUrlByTemplateId(current => ({
                        ...current,
                        [document.templateId]: event.target.value,
                      }))
                    }
                    onBlur={() =>
                      void onUpdateDocumentStatus({
                        templateId: document.templateId,
                        status: document.status,
                        notes: notesByTemplateId[document.templateId] || null,
                        submittedFileUrl: fileUrlByTemplateId[document.templateId] || null,
                        submittedFileName: fileNameByTemplateId[document.templateId] || null,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`file-name-${document.templateId}`}>Submitted file name</Label>
                  <Input
                    id={`file-name-${document.templateId}`}
                    placeholder="Document name"
                    value={fileNameByTemplateId[document.templateId] || ''}
                    disabled={savingTemplateId === document.templateId || Boolean(isBatchSaving)}
                    onChange={event =>
                      setFileNameByTemplateId(current => ({
                        ...current,
                        [document.templateId]: event.target.value,
                      }))
                    }
                    onBlur={() =>
                      void onUpdateDocumentStatus({
                        templateId: document.templateId,
                        status: document.status,
                        notes: notesByTemplateId[document.templateId] || null,
                        submittedFileUrl: fileUrlByTemplateId[document.templateId] || null,
                        submittedFileName: fileNameByTemplateId[document.templateId] || null,
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-1 text-xs text-slate-500 md:grid-cols-2">
                <p>
                  Received: {document.receivedAt || 'Pending'} | {formatActor(document.receivedBy)}
                </p>
                <p>
                  Verified: {document.verifiedAt || 'Pending'} | {formatActor(document.verifiedBy)}
                </p>
                <p className="md:col-span-2">
                  Submitted file: {document.submittedAt || 'Pending'} |{' '}
                  {formatActor(document.submittedBy || null)}
                </p>
              </div>

              {savingTemplateId === document.templateId ? (
                <p className="mt-2 text-xs text-blue-600">Saving...</p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
