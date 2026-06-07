import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type DealDocumentStatus = 'pending' | 'received' | 'verified' | 'rejected';

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
      readinessLabel: 'Referral Review Readiness',
      readyLabel: 'Referral Review Ready',
      notReadyLabel: 'Referral Review Not Ready',
      documentTitle: 'Rental Applicant Document Checklist',
      documentDescription: 'Update received and verification status for rental applicant documents.',
      readinessNote:
        'Rental referral readiness uses verified documents and current milestone checks. Lease, deposit, and rental commission rules still require the distribution programme to support them explicitly.',
    };
  }
  if (lane === 'auction') {
    return {
      engineLabel: 'Auction engine',
      participantLabel: 'Bidder',
      readinessLabel: 'Bidder Review Readiness',
      readyLabel: 'Bidder Review Ready',
      notReadyLabel: 'Bidder Review Not Ready',
      documentTitle: 'Bidder Document Checklist',
      documentDescription: 'Update received and verification status for bidder documents.',
      readinessNote:
        'Auction referral readiness uses verified documents and current milestone checks. Bidder registration, proof-of-funds, auction terms, and auction commission rules still require explicit programme support.',
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

export function ManagerDealChecklistPanel({
  checklist,
  savingTemplateId,
  isBatchSaving,
  onUpdateDocumentStatus,
  onMarkAllRequiredReceived,
  onMarkAllRequiredVerified,
}: {
  checklist: DealChecklist;
  savingTemplateId: number | null;
  isBatchSaving?: boolean;
  onUpdateDocumentStatus: (input: {
    templateId: number;
    status: DealDocumentStatus;
    notes?: string | null;
    submittedFileUrl?: string | null;
    submittedFileName?: string | null;
  }) => Promise<void>;
  onMarkAllRequiredReceived?: () => Promise<void>;
  onMarkAllRequiredVerified?: () => Promise<void>;
}) {
  const [notesByTemplateId, setNotesByTemplateId] = useState<Record<number, string>>({});
  const [fileUrlByTemplateId, setFileUrlByTemplateId] = useState<Record<number, string>>({});
  const [fileNameByTemplateId, setFileNameByTemplateId] = useState<Record<number, string>>({});
  const transactionCopy = getChecklistTransactionCopy(checklist.transactionType);

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
