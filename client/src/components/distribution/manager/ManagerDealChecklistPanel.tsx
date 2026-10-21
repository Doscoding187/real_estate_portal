import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type DealDocumentStatus = 'pending' | 'received' | 'verified' | 'rejected' | 'unavailable';
type EditableDealDocumentStatus = Exclude<DealDocumentStatus, 'unavailable'>;

type DealChecklist = {
  dealId: number;
  dealRef: string;
  buyerName: string | null;
  developmentId: number;
  developmentName: string;
  programId: number | null;
  payoutMilestone: string | null;
  payoutMilestoneNotes?: string | null;
  currencyCode: string | null;
  qualification?: {
    checkFitId: string | null;
    policyVersion: string | null;
    prospectName?: string | null;
    coApplicantName?: string | null;
    estimatedPurchasePrice: number | null;
    assumptions: Record<string, unknown> | null;
    outputs: Record<string, unknown> | null;
  } | null;
  commissionSummary: {
    commissionModel: string | null;
    defaultCommissionPercent: number | null;
    defaultCommissionAmount: number | null;
    referrerCommissionType?: 'flat' | 'percentage' | null;
    referrerCommissionValue?: number | null;
    referrerCommissionBasis?: 'sale_price' | 'base_price' | null;
    payoutBasisAmount?: number | null;
    canRecordPayoutBasis?: boolean;
  };
  requiredDocuments: Array<{
    templateId: number | null;
    documentCode: string;
    documentLabel: string;
    isRequired: boolean;
    sortOrder: number;
    isActive: boolean;
    status: DealDocumentStatus;
    receivedAt: string | null;
    verifiedAt: string | null;
    submittedAt?: string | null;
    submittedFileName?: string | null;
    hasFile?: boolean;
    receivedBy: { userId: number; name?: string } | null;
    verifiedBy: { userId: number; name?: string } | null;
    submittedBy?: { userId: number; name?: string } | null;
    notes: string | null;
    delivery?: {
      deliveryId: number;
      deliveryVersion: number;
      deliveredAt: string;
      deliveredBy: { userId: number; name?: string } | null;
      acknowledgedAt: string | null;
      acknowledgedBy: { userId: number; name?: string } | null;
      acknowledgementNote: string | null;
      isCurrentFile: boolean;
    } | null;
  }>;
  computed: {
    requiredCount: number;
    verifiedRequiredCount: number;
    allRequiredVerified: boolean;
    payoutMilestoneSupported?: boolean;
    payoutReady: boolean;
    blockers: string[];
  };
};

function formatReferralPayout(checklist: DealChecklist) {
  const summary = checklist.commissionSummary;
  if (summary.referrerCommissionType === 'percentage' && summary.referrerCommissionValue) {
    const basis = summary.referrerCommissionBasis?.replace(/_/g, ' ');
    return `${summary.referrerCommissionValue}% of ${basis || 'basis not configured'}`;
  }
  if (summary.referrerCommissionType === 'flat' && summary.referrerCommissionValue) {
    const currency = checklist.currencyCode || 'ZAR';
    return `${currency} ${Math.round(summary.referrerCommissionValue).toLocaleString('en-ZA')}`;
  }
  return 'Not configured';
}

function formatActor(actor: { userId: number; name?: string } | null) {
  if (!actor) return 'Unassigned';
  return actor.name || `User #${actor.userId}`;
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function ManagerDealChecklistPanel({
  checklist,
  savingTemplateId,
  uploadingTemplateId,
  downloadingTemplateId,
  deliveringTemplateId,
  isBatchSaving,
  isSavingPayoutBasis,
  onRecordPayoutBasis,
  onUpdateDocumentStatus,
  onUploadDocument,
  onDownloadDocument,
  onDeliverDocument,
  onMarkAllRequiredReceived,
  onMarkAllRequiredVerified,
}: {
  checklist: DealChecklist;
  savingTemplateId: number | null;
  uploadingTemplateId?: number | null;
  downloadingTemplateId?: number | null;
  deliveringTemplateId?: number | null;
  isBatchSaving?: boolean;
  isSavingPayoutBasis?: boolean;
  onRecordPayoutBasis?: (amount: number) => Promise<void>;
  onUpdateDocumentStatus: (input: {
    templateId: number;
    status: EditableDealDocumentStatus;
    notes?: string | null;
  }) => Promise<void>;
  onUploadDocument?: (input: { templateId: number; file: File }) => Promise<void>;
  onDownloadDocument?: (templateId: number) => Promise<void>;
  onDeliverDocument?: (templateId: number) => Promise<void>;
  onMarkAllRequiredReceived?: () => Promise<void>;
  onMarkAllRequiredVerified?: () => Promise<void>;
}) {
  const [notesByTemplateId, setNotesByTemplateId] = useState<Record<string, string>>({});
  const [payoutBasisAmount, setPayoutBasisAmount] = useState('');

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const row of checklist.requiredDocuments) {
      next[String(row.templateId ?? `unavailable:${row.documentCode}:${row.sortOrder}`)] = row.notes || '';
    }
    setNotesByTemplateId(next);
  }, [checklist.requiredDocuments]);

  useEffect(() => {
    setPayoutBasisAmount(
      checklist.commissionSummary.payoutBasisAmount == null
        ? ''
        : String(checklist.commissionSummary.payoutBasisAmount),
    );
  }, [checklist.commissionSummary.payoutBasisAmount]);

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
            {checklist.buyerName ? `Buyer: ${checklist.buyerName}` : 'Buyer details unavailable'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Referral payout</p>
            <p className="font-medium">{formatReferralPayout(checklist)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Payout Milestone</p>
            <p className="font-medium">
              {checklist.payoutMilestone?.replace(/_/g, ' ') || 'Not configured'}
            </p>
            {checklist.payoutMilestoneNotes ? (
              <p className="mt-1 text-xs text-slate-600">{checklist.payoutMilestoneNotes}</p>
            ) : null}
            {checklist.computed.payoutMilestoneSupported === false ? (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Manual administrator confirmation required
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-slate-500">Currency</p>
            <p className="font-medium">{checklist.currencyCode || 'Not configured'}</p>
          </div>
        </CardContent>
      </Card>

      {checklist.qualification ? (
        <Card className="border-sky-200">
          <CardHeader>
            <CardTitle>Referrer check fit</CardTitle>
            <CardDescription>
              The pre-qualification the referrer recorded before submitting this referral. It is an
              estimate on the referrer's own statement, not a credit decision and not a final
              affordability assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Indicative purchase price</p>
              <p className="font-medium">
                {checklist.qualification.estimatedPurchasePrice == null
                  ? 'Not recorded'
                  : `${checklist.currencyCode || 'ZAR'} ${Math.round(
                      checklist.qualification.estimatedPurchasePrice,
                    ).toLocaleString('en-ZA')}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Prospect as recorded by the referrer</p>
              <p className="font-medium">
                {[checklist.qualification.prospectName, checklist.qualification.coApplicantName]
                  .filter(Boolean)
                  .join(' and ') || 'Not recorded'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Combined gross monthly income</p>
              <p className="font-medium">
                {Number(checklist.qualification.outputs?.combinedGrossIncomeMonthly || 0).toLocaleString(
                  'en-ZA',
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Assumptions</p>
              <p className="font-medium">
                {Number(checklist.qualification.assumptions?.annualInterestRate || 0)}% ·{' '}
                {Number(checklist.qualification.assumptions?.termMonths || 0)} months ·{' '}
                {Math.round(
                  Number(checklist.qualification.assumptions?.repaymentAllowanceRatio || 0) * 100,
                )}
                % of gross
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <p className="rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        Files are stored in private Distribution storage and are available only to authorized
        partners, assigned managers, and the approved Developer organisation receiving a verified
        delivery.
      </p>

      {checklist.commissionSummary.referrerCommissionType === 'percentage' ? (
        <Card className="border-sky-200">
          <CardHeader>
            <CardTitle>Percentage payout calculation basis</CardTitle>
            <CardDescription>
              Record the{' '}
              {checklist.commissionSummary.referrerCommissionBasis?.replace(/_/g, ' ') ||
                'configured price basis'}{' '}
              amount from the applicable transaction documents. The assigned Distribution team uses
              it to calculate the referral payout terms frozen for this referral.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 space-y-1">
              <Label htmlFor="payout-basis-amount">
                Recorded amount ({checklist.currencyCode || 'ZAR'})
              </Label>
              <Input
                id="payout-basis-amount"
                type="number"
                min="1"
                step="1"
                value={payoutBasisAmount}
                disabled={
                  !checklist.commissionSummary.canRecordPayoutBasis || Boolean(isSavingPayoutBasis)
                }
                onChange={event => setPayoutBasisAmount(event.target.value)}
              />
            </div>
            {checklist.commissionSummary.canRecordPayoutBasis ? (
              <Button
                disabled={
                  Boolean(isSavingPayoutBasis) ||
                  !Number.isInteger(Number(payoutBasisAmount)) ||
                  Number(payoutBasisAmount) <= 0
                }
                onClick={() => void onRecordPayoutBasis?.(Number(payoutBasisAmount))}
              >
                {isSavingPayoutBasis
                  ? 'Saving…'
                  : checklist.commissionSummary.payoutBasisAmount
                    ? 'Update payout basis'
                    : 'Record payout basis'}
              </Button>
            ) : (
              <p className="text-xs text-slate-600">
                {checklist.commissionSummary.payoutBasisAmount
                  ? 'The payout basis is recorded and locked.'
                  : 'The payout basis cannot be recorded at this stage. Ask the Distribution manager to review this referral.'}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className={checklist.computed.payoutReady ? 'border-emerald-300' : 'border-amber-300'}>
        <CardHeader>
          <CardTitle
            className={checklist.computed.payoutReady ? 'text-emerald-700' : 'text-amber-700'}
          >
            {checklist.computed.payoutReady ? 'Payout Ready' : 'Payout Not Ready'}
          </CardTitle>
          <CardDescription>
            Required documents verified by our team: {checklist.computed.verifiedRequiredCount}/
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
            Payout readiness uses the Distribution team’s document checks and a recorded transaction
            milestone. Developer delivery and acknowledgement are recorded separately and do not
            change payout readiness. Unsupported milestones need a documented administrator
            confirmation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Checklist</CardTitle>
          <CardDescription>
            Update received and verification status per required document.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 rounded border bg-slate-50 p-2">
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(isBatchSaving)}
              onClick={() => void onMarkAllRequiredReceived?.()}
            >
              Mark All Required as Received by Our Team
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(isBatchSaving)}
              onClick={() => void onMarkAllRequiredVerified?.()}
            >
              Mark All Required as Verified by Our Team
            </Button>
            {isBatchSaving ? (
              <p className="self-center text-xs text-blue-600">Applying batch update...</p>
            ) : null}
          </div>
          {orderedDocuments.map(document => (
            <div
              key={`${document.documentCode}-${document.sortOrder}-${document.templateId ?? 'unavailable'}`}
              className="rounded border p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{document.documentLabel}</p>
                  <p className="text-xs text-slate-500">{document.documentCode}</p>
                </div>
                <Badge variant={document.isRequired ? 'default' : 'secondary'}>
                  {document.isRequired ? 'Required' : 'Optional'}
                </Badge>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`status-${document.templateId ?? document.documentCode}`}>Status</Label>
                  <select
                    id={`status-${document.templateId ?? document.documentCode}`}
                    className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
                    value={document.status}
                    disabled={
                      document.templateId === null ||
                      !document.isActive ||
                      document.status === 'unavailable' ||
                      savingTemplateId === document.templateId ||
                      Boolean(isBatchSaving)
                    }
                    onChange={event => {
                      if (document.templateId === null) return;
                      void onUpdateDocumentStatus({
                        templateId: document.templateId,
                        status: event.target.value as EditableDealDocumentStatus,
                        notes:
                          notesByTemplateId[String(document.templateId)] || null,
                      });
                    }}
                  >
                    <option value="pending">pending</option>
                    <option value="received">Received by our team</option>
                    <option value="verified">Verified by our team</option>
                    <option value="rejected">Update needed</option>
                    {document.status === 'unavailable' ? (
                      <option value="unavailable">Saved requirement unavailable</option>
                    ) : null}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`notes-${document.templateId ?? document.documentCode}`}>Notes</Label>
                  <Input
                    id={`notes-${document.templateId ?? document.documentCode}`}
                    value={
                      notesByTemplateId[
                        String(document.templateId ?? `unavailable:${document.documentCode}:${document.sortOrder}`)
                      ] || ''
                    }
                    disabled={
                      document.templateId === null ||
                      !document.isActive ||
                      document.status === 'unavailable' ||
                      savingTemplateId === document.templateId ||
                      Boolean(isBatchSaving)
                    }
                    onChange={event => {
                      const key = String(
                        document.templateId ?? `unavailable:${document.documentCode}:${document.sortOrder}`,
                      );
                      setNotesByTemplateId(current => ({ ...current, [key]: event.target.value }));
                    }}
                    onBlur={() => {
                      if (document.templateId === null || document.status === 'unavailable') return;
                      void onUpdateDocumentStatus({
                        templateId: document.templateId,
                        status: document.status,
                        notes: notesByTemplateId[String(document.templateId)] || null,
                      });
                    }}
                  />
                </div>
              </div>
              {document.status === 'unavailable' ? (
                <p className="mt-2 text-xs text-amber-700">
                  This saved requirement cannot be matched to its document record. It remains a blocker until an administrator reviews it.
                </p>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border bg-slate-50 p-3">
                    <div>
                      <p className="text-xs font-medium text-slate-600">Secure document</p>
                      <p className="text-sm text-slate-900">
                        {document.hasFile
                          ? document.submittedFileName || 'Attached file'
                          : 'No file attached'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {document.hasFile && document.templateId !== null && onDownloadDocument ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={downloadingTemplateId === document.templateId}
                          onClick={() => void onDownloadDocument?.(document.templateId as number)}
                        >
                          {downloadingTemplateId === document.templateId ? 'Opening…' : 'Download'}
                        </Button>
                      ) : null}
                      {onUploadDocument &&
                      document.templateId !== null &&
                      document.isActive &&
                      document.status !== 'verified' ? (
                        <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50">
                          {uploadingTemplateId === document.templateId
                            ? 'Uploading…'
                            : document.hasFile
                              ? 'Replace file'
                              : 'Attach file'}
                          <input
                            type="file"
                            className="sr-only"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            disabled={uploadingTemplateId === document.templateId}
                            onChange={event => {
                              const file = event.target.files?.[0];
                              event.target.value = '';
                              if (file && document.templateId !== null) {
                                void onUploadDocument({ templateId: document.templateId, file });
                              }
                            }}
                          />
                        </label>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border bg-white px-3 py-2">
                    <div className="text-xs text-slate-600">
                      {document.delivery ? (
                        <>
                          <p className="font-medium text-slate-800">
                            Delivered {formatDateTime(document.delivery.deliveredAt)} to the
                            Developer
                          </p>
                          {document.delivery.acknowledgedAt ? (
                            <p className="mt-1 text-emerald-700">
                              Acknowledged {formatDateTime(document.delivery.acknowledgedAt)} by{' '}
                              {formatActor(document.delivery.acknowledgedBy)}
                            </p>
                          ) : (
                            <p className="mt-1 text-amber-700">
                              Awaiting Developer acknowledgement.
                            </p>
                          )}
                          {!document.delivery.isCurrentFile ? (
                            <p className="mt-1 text-amber-700">
                              The current verified file has changed since this delivery.
                            </p>
                          ) : null}
                          {document.delivery.acknowledgementNote ? (
                            <p className="mt-1 text-slate-600">
                              Note: {document.delivery.acknowledgementNote}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <p>Not delivered to the Developer yet.</p>
                      )}
                    </div>
                    {document.templateId !== null &&
                    document.hasFile &&
                    document.status === 'verified' &&
                    (!document.delivery || !document.delivery.isCurrentFile) &&
                    onDeliverDocument ? (
                      <Button
                        size="sm"
                        disabled={deliveringTemplateId === document.templateId}
                        onClick={() => void onDeliverDocument(document.templateId as number)}
                      >
                        {deliveringTemplateId === document.templateId
                          ? 'Delivering…'
                          : document.delivery
                            ? 'Deliver updated file'
                            : 'Deliver to Developer'}
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
              <div className="mt-3 grid gap-1 text-xs text-slate-500 md:grid-cols-2">
                <p>
                  Received: {document.receivedAt || 'Pending'} | {formatActor(document.receivedBy)}
                </p>
                <p>
                  Verified: {document.verifiedAt || 'Pending'} | {formatActor(document.verifiedBy)}
                </p>
                <p className="md:col-span-2">
                  Document submission: {document.submittedAt || 'No secure file recorded'} |{' '}
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
