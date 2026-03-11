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
    isRequired: boolean;
    sortOrder: number;
    isActive: boolean;
    status: DealDocumentStatus;
    receivedAt: string | null;
    verifiedAt: string | null;
    receivedBy: { userId: number; name?: string } | null;
    verifiedBy: { userId: number; name?: string } | null;
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
  }) => Promise<void>;
  onMarkAllRequiredReceived?: () => Promise<void>;
  onMarkAllRequiredVerified?: () => Promise<void>;
}) {
  const [notesByTemplateId, setNotesByTemplateId] = useState<Record<number, string>>({});

  useEffect(() => {
    const next: Record<number, string> = {};
    for (const row of checklist.requiredDocuments) {
      next[row.templateId] = row.notes || '';
    }
    setNotesByTemplateId(next);
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
            {checklist.buyerName ? `Buyer: ${checklist.buyerName}` : 'Buyer details unavailable'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
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
          <CardTitle className={checklist.computed.payoutReady ? 'text-emerald-700' : 'text-amber-700'}>
            {checklist.computed.payoutReady ? 'Payout Ready' : 'Payout Not Ready'}
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
            Payout readiness uses verified documents and any milestone checks the system can prove
            today. Unsupported milestones still require manual confirmation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Checklist</CardTitle>
          <CardDescription>Update received and verification status per required template.</CardDescription>
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

              <div className="mt-3 grid gap-1 text-xs text-slate-500 md:grid-cols-2">
                <p>
                  Received: {document.receivedAt || 'Pending'} | {formatActor(document.receivedBy)}
                </p>
                <p>
                  Verified: {document.verifiedAt || 'Pending'} | {formatActor(document.verifiedBy)}
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
