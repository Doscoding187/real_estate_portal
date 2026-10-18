import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Download, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { ListingNavbar } from '@/components/ListingNavbar';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ManagerDealChecklistPanel } from '@/components/distribution/manager/ManagerDealChecklistPanel';

type DealDocumentStatus = 'pending' | 'received' | 'verified' | 'rejected' | 'unavailable';
type EditableDealDocumentStatus = Exclude<DealDocumentStatus, 'unavailable'>;
type WorkflowStepStatus = 'in_progress' | 'waiting' | 'completed' | 'not_applicable';
type WorkflowStepDraft = { status: WorkflowStepStatus | ''; partnerUpdate: string };

function computeChecklistSummary(checklist: any) {
  const requiredDocuments = (checklist.requiredDocuments || []) as Array<any>;
  const requiredOnly = requiredDocuments.filter(document => Boolean(document.isRequired));
  const requiredCount = requiredOnly.length;
  const verifiedRequiredCount = requiredOnly.filter(
    document => document.status === 'verified',
  ).length;
  const allRequiredVerified = requiredCount > 0 && verifiedRequiredCount >= requiredCount;
  const blockers: string[] = [];
  if (requiredCount === 0) {
    blockers.push('No required documents are configured for this development.');
  } else if (!allRequiredVerified) {
    const remaining = requiredCount - verifiedRequiredCount;
    blockers.push(
      `${remaining} required document${remaining === 1 ? '' : 's'} still need verification.`,
    );
  }

  return {
    requiredCount,
    verifiedRequiredCount,
    allRequiredVerified,
    payoutReady: allRequiredVerified,
    blockers,
  };
}

export default function ManagerDealChecklistPage() {
  const [match, params] = useRoute('/distribution/manager/deals/:dealId');
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [savingTemplateId, setSavingTemplateId] = useState<number | null>(null);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [localChecklist, setLocalChecklist] = useState<any | null>(null);
  const [workflowDrafts, setWorkflowDrafts] = useState<Record<string, WorkflowStepDraft>>({});

  const dealId = Number(params?.dealId || 0);
  const checklistQuery = trpc.distribution.manager.getDealChecklist.useQuery(
    { dealId },
    {
      enabled: isAuthenticated && match && dealId > 0,
      retry: false,
    },
  );
  const intakeEvidenceQuery = trpc.distribution.manager.listDealReferralIntakeEvidence.useQuery(
    { dealId },
    { enabled: isAuthenticated && match && dealId > 0, retry: false },
  );
  const workflowProgressQuery = trpc.distribution.manager.getReferralWorkflowProgress.useQuery(
    { dealId },
    { enabled: isAuthenticated && match && dealId > 0, retry: false },
  );

  const updateDocumentStatusMutation = trpc.distribution.manager.updateDealDocumentStatus.useMutation();
  const downloadIntakeEvidenceMutation = trpc.distribution.manager.downloadDealReferralIntakeEvidence.useMutation();
  const recordPayoutBasisMutation = trpc.distribution.manager.recordDealPayoutBasis.useMutation();
  const updateWorkflowStepMutation = trpc.distribution.manager.updateReferralWorkflowStep.useMutation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
    if (!match) {
      setLocation('/distribution/manager/developments');
    }
  }, [isAuthenticated, loading, match, setLocation]);

  useEffect(() => {
    if (checklistQuery.data) {
      setLocalChecklist(checklistQuery.data);
    }
  }, [checklistQuery.data]);

  async function handleUpdateDocumentStatus(input: {
    templateId: number;
    status: EditableDealDocumentStatus;
    notes?: string | null;
  }) {
    if (!localChecklist) return;
    const previousChecklist = localChecklist;
    setSavingTemplateId(input.templateId);

    setLocalChecklist((current: any) => {
      if (!current) return current;
      const updatedDocuments = (current.requiredDocuments || []).map((row: any) =>
        Number(row.templateId) === Number(input.templateId)
          ? {
              ...row,
              status: input.status,
              notes: typeof input.notes === 'undefined' ? row.notes : input.notes,
            }
          : row,
      );
      return {
        ...current,
        requiredDocuments: updatedDocuments,
        computed: computeChecklistSummary({
          ...current,
          requiredDocuments: updatedDocuments,
        }),
      };
    });

    try {
      const updatedChecklist = await updateDocumentStatusMutation.mutateAsync({
        dealId,
        templateId: input.templateId,
        status: input.status,
        notes: input.notes,
      });
      setLocalChecklist(updatedChecklist);
    } catch (error: any) {
      setLocalChecklist(previousChecklist);
      toast.error(error?.message || 'Failed to update document status');
      throw error;
    } finally {
      setSavingTemplateId(null);
    }
  }

  async function handleBatchUpdateRequired(status: 'received' | 'verified') {
    if (!localChecklist) return;
    const requiredDocuments = (localChecklist.requiredDocuments || []).filter((document: any) =>
      Boolean(document.isRequired),
    );
    if (!requiredDocuments.length) {
      toast.error('No required documents configured for this deal.');
      return;
    }
    if (requiredDocuments.some((document: any) => !document.templateId || document.status === 'unavailable')) {
      toast.error('One or more saved document requirements cannot be updated. Ask an administrator to review the checklist.');
      return;
    }

    if (status === 'verified') {
      const confirmed = window.confirm(
        `Mark all ${requiredDocuments.length} required documents as verified?`,
      );
      if (!confirmed) return;
    }

    setIsBatchSaving(true);
    try {
      let latestChecklist = localChecklist;
      for (const document of requiredDocuments) {
        latestChecklist = await updateDocumentStatusMutation.mutateAsync({
          dealId,
          templateId: Number(document.templateId),
          status,
          notes: document.notes || null,
        });
      }
      setLocalChecklist(latestChecklist);
      toast.success(
        status === 'verified'
          ? 'All required documents marked as verified.'
          : 'All required documents marked as received.',
      );
    } catch (error: any) {
      toast.error(error?.message || 'Failed to apply batch document update');
      await checklistQuery.refetch();
    } finally {
      setIsBatchSaving(false);
    }
  }

  async function downloadIntakeEvidence(evidenceUuid: string) {
    try {
      const result = await downloadIntakeEvidenceMutation.mutateAsync({ dealId, evidenceUuid });
      const binary = atob(result.base64Content);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `referral-evidence-${evidenceUuid}`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      toast.error(error?.message || 'Could not retrieve private referral evidence.');
    }
  }

  async function handleRecordPayoutBasis(amount: number) {
    try {
      const updatedChecklist = await recordPayoutBasisMutation.mutateAsync({ dealId, amount });
      setLocalChecklist(updatedChecklist);
      toast.success('Referral payout calculation basis recorded.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to record referral payout calculation basis.');
    }
  }

  async function handleSaveWorkflowStep(stepKey: string) {
    const draft = workflowDrafts[stepKey];
    if (!draft?.status) {
      toast.error('Choose a process status before saving.');
      return;
    }
    try {
      await updateWorkflowStepMutation.mutateAsync({
        dealId,
        stepKey,
        status: draft.status,
        partnerUpdate: draft.partnerUpdate.trim() || null,
      });
      setWorkflowDrafts(current => {
        const next = { ...current };
        delete next[stepKey];
        return next;
      });
      await workflowProgressQuery.refetch();
      toast.success('Referral progress updated.');
    } catch (error: any) {
      toast.error(error?.message || 'Could not update this process step.');
    }
  }

  if (loading || checklistQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (checklistQuery.error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-24">
          <Card>
            <CardContent className="py-8 text-sm text-red-600">{checklistQuery.error.message}</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!localChecklist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-24">
        <div className="mb-4 flex items-center gap-2">
          <Button variant="outline" onClick={() => setLocation('/distribution/manager/developments')}>
            Back to Developments
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation(`/distribution/manager/developments/${localChecklist.developmentId}`)}
          >
            Back to Deals
          </Button>
        </div>

        <ManagerDealChecklistPanel
          checklist={localChecklist}
          savingTemplateId={savingTemplateId}
          isBatchSaving={isBatchSaving}
          isSavingPayoutBasis={recordPayoutBasisMutation.isPending}
          onRecordPayoutBasis={handleRecordPayoutBasis}
          onUpdateDocumentStatus={handleUpdateDocumentStatus}
          onMarkAllRequiredReceived={() => handleBatchUpdateRequired('received')}
          onMarkAllRequiredVerified={() => handleBatchUpdateRequired('verified')}
        />

        <Card className="mt-5 border-primary/15 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Opportunity process updates</CardTitle>
            <CardDescription>
              Update the steps saved for this referral. Status and the short update are visible to the referrer; they do not change inventory, deal stages, or payout eligibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflowProgressQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading saved process…</p>
            ) : workflowProgressQuery.error ? (
              <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {workflowProgressQuery.error.message}
              </p>
            ) : workflowProgressQuery.data && !workflowProgressQuery.data.verified ? (
              <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                The saved process terms could not be verified. Progress updates are disabled for this referral.
              </p>
            ) : workflowProgressQuery.data?.steps.length ? (
              workflowProgressQuery.data.steps.map(step => {
                const saved = workflowProgressQuery.data.progress.find(item => item.stepKey === step.stepKey);
                const draft = workflowDrafts[step.stepKey];
                const selectedStatus = draft?.status ?? (saved?.status === 'not_started' ? '' : saved?.status || '');
                const partnerUpdate = draft?.partnerUpdate ?? saved?.partnerUpdate ?? '';
                return (
                  <div key={step.stepKey} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{step.stepOrder}. {step.stepLabel}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {step.isBlocking ? 'Required process step' : 'Optional process step'}
                          {step.ownerRole ? ` · Owner: ${step.ownerRole.replace(/_/g, ' ')}` : ''}
                        </p>
                        {step.partnerInstructions ? (
                          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{step.partnerInstructions}</p>
                        ) : null}
                      </div>
                      {saved?.updatedAt ? (
                        <span className="text-xs text-slate-500">Updated {new Date(saved.updatedAt).toLocaleString()}</span>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
                      <label className="space-y-1 text-sm font-medium text-slate-700">
                        Status
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={selectedStatus}
                          onChange={event => setWorkflowDrafts(current => ({
                            ...current,
                            [step.stepKey]: {
                              status: event.target.value as WorkflowStepStatus | '',
                              partnerUpdate: current[step.stepKey]?.partnerUpdate ?? saved?.partnerUpdate ?? '',
                            },
                          }))}
                        >
                          <option value="">Choose an update</option>
                          <option value="in_progress">In progress</option>
                          <option value="waiting">Waiting</option>
                          <option value="completed">Completed</option>
                          <option value="not_applicable" disabled={step.isBlocking}>Not needed</option>
                        </select>
                      </label>
                      <label className="space-y-1 text-sm font-medium text-slate-700">
                        Update for the referrer
                        <textarea
                          className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
                          maxLength={500}
                          rows={2}
                          placeholder="Share a brief progress update. Don’t include private documents, ID numbers, or financial account details."
                          value={partnerUpdate}
                          onChange={event => setWorkflowDrafts(current => ({
                            ...current,
                            [step.stepKey]: {
                              status: current[step.stepKey]?.status ?? (saved?.status === 'not_started' ? '' : saved?.status || ''),
                              partnerUpdate: event.target.value,
                            },
                          }))}
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        disabled={!selectedStatus || updateWorkflowStepMutation.isPending}
                        onClick={() => void handleSaveWorkflowStep(step.stepKey)}
                      >
                        {updateWorkflowStepMutation.isPending ? 'Saving…' : 'Save progress update'}
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                No process steps were saved for this referral.
              </p>
            )}
          </CardContent>
        </Card>

        {intakeEvidenceQuery.data?.length ? (
          <Card className="mt-5 border-sky-200">
            <CardContent className="space-y-3 py-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-sky-700" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-slate-900">Private referral permission and identity evidence</h2>
                  <p className="mt-1 text-xs text-slate-600">Visible only to the assigned Distribution manager. These files are kept separate from Developer sales resources.</p>
                </div>
              </div>
              <div className="divide-y rounded border bg-white">
                {intakeEvidenceQuery.data.map(item => (
                  <div key={item.evidenceUuid} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{item.evidenceType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{item.reviewStatus} · {Math.ceil(item.byteSize / 1024)} KB</p>
                    </div>
                    {item.storageStatus === 'stored' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadIntakeEvidenceMutation.isPending}
                        onClick={() => void downloadIntakeEvidence(item.evidenceUuid)}
                      >
                        <Download className="mr-2 h-4 w-4" /> Open privately
                      </Button>
                    ) : <span className="text-xs text-slate-500">No longer available</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
