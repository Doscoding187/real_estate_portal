import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { ListingNavbar } from '@/components/ListingNavbar';
import { trpc } from '@/lib/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ManagerDealChecklistPanel } from '@/components/distribution/manager/ManagerDealChecklistPanel';

type DealDocumentStatus = 'pending' | 'received' | 'verified' | 'rejected';

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
    blockers.push('No required document templates are configured for this development.');
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
  const [localChecklist, setLocalChecklist] = useState<any | null>(null);

  const dealId = Number(params?.dealId || 0);
  const checklistQuery = trpc.distribution.manager.getDealChecklist.useQuery(
    { dealId },
    {
      enabled: isAuthenticated && match && dealId > 0,
      retry: false,
    },
  );

  const updateDocumentStatusMutation = trpc.distribution.manager.updateDealDocumentStatus.useMutation();

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
    status: DealDocumentStatus;
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
          onUpdateDocumentStatus={handleUpdateDocumentStatus}
        />
      </div>
    </div>
  );
}
