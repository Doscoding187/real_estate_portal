import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type ManagerDistributionTransactionLane = 'sale' | 'rent' | 'auction';

export function normalizeManagerDistributionTransactionLane(
  transactionType: unknown,
): ManagerDistributionTransactionLane {
  const normalized = String(transactionType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'rent' || normalized === 'for_rent' || normalized === 'to_rent') {
    return 'rent';
  }
  if (normalized === 'auction' || normalized === 'on_auction') return 'auction';
  return 'sale';
}

export function getManagerDistributionDealCopy(transactionType: unknown) {
  const lane = normalizeManagerDistributionTransactionLane(transactionType);

  if (lane === 'rent') {
    return {
      transactionType: lane,
      laneLabel: 'Rental referral',
      participantLabel: 'Renter',
      unknownParticipant: 'Renter unknown',
      stageContext: 'Lease/referral stage',
      rewardContext: 'Rental reward',
    };
  }

  if (lane === 'auction') {
    return {
      transactionType: lane,
      laneLabel: 'Auction referral',
      participantLabel: 'Bidder',
      unknownParticipant: 'Bidder unknown',
      stageContext: 'Auction/referral stage',
      rewardContext: 'Auction reward',
    };
  }

  return {
    transactionType: lane,
    laneLabel: 'Sale referral',
    participantLabel: 'Buyer',
    unknownParticipant: 'Buyer unknown',
    stageContext: 'Sale/referral stage',
    rewardContext: 'Sale reward',
  };
}

export function getManagerDistributionStageActionLabel(stage: string, transactionType: unknown) {
  const lane = normalizeManagerDistributionTransactionLane(transactionType);

  const labels: Record<ManagerDistributionTransactionLane, Record<string, string>> = {
    sale: {
      application_submitted: 'Application submitted',
      contract_signed: 'Contract signed',
      bond_approved: 'Bond approved',
      commission_pending: 'Reward pending',
      cancelled: 'Cancel referral',
    },
    rent: {
      application_submitted: 'Rental application submitted',
      contract_signed: 'Lease signed',
      bond_approved: 'Lease conditions met',
      commission_pending: 'Rental reward pending',
      cancelled: 'Cancel rental referral',
    },
    auction: {
      application_submitted: 'Bidder registered',
      contract_signed: 'Auction terms accepted',
      bond_approved: 'Bidder approved',
      commission_pending: 'Auction reward pending',
      cancelled: 'Cancel auction referral',
    },
  };

  return labels[lane][stage] || stage;
}

export default function DistributionManagerDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);

  const assignmentsQuery = trpc.distribution.manager.myAssignments.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const selectedAssignment = useMemo(
    () =>
      (assignmentsQuery.data || []).find(
        (assignment: any) => Number(assignment.assignmentId) === Number(selectedAssignmentId),
      ) || null,
    [assignmentsQuery.data, selectedAssignmentId],
  );

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
  }, [isAuthenticated, loading, setLocation]);

  useEffect(() => {
    const assignments = assignmentsQuery.data || [];
    if (!assignments.length) return;
    if (!selectedAssignmentId) {
      setSelectedAssignmentId(Number(assignments[0].assignmentId));
    }
  }, [assignmentsQuery.data, selectedAssignmentId]);

  const pipelineQuery = trpc.distribution.manager.listPipeline.useQuery(
    {
      developmentId: selectedAssignment ? Number(selectedAssignment.developmentId) : undefined,
      limit: 150,
    },
    { enabled: Boolean(selectedAssignment) },
  );

  const viewingsQuery = trpc.distribution.manager.listViewings.useQuery(
    {
      programId: selectedAssignment ? Number(selectedAssignment.programId) : undefined,
      developmentId: selectedAssignment ? Number(selectedAssignment.developmentId) : undefined,
      includePast: false,
      limit: 150,
    },
    { enabled: Boolean(selectedAssignment) },
  );

  const validationQueueQuery = trpc.distribution.manager.listValidationQueue.useQuery(
    {
      programId: selectedAssignment ? Number(selectedAssignment.programId) : undefined,
      developmentId: selectedAssignment ? Number(selectedAssignment.developmentId) : undefined,
      limit: 150,
    },
    { enabled: Boolean(selectedAssignment) },
  );

  const timelineQuery = trpc.distribution.manager.dealTimeline.useQuery(
    { dealId: Number(selectedDealId) },
    { enabled: Boolean(selectedDealId) },
  );

  const validateMutation = trpc.distribution.manager.validateViewing.useMutation({
    onSuccess: () => {
      toast.success('Viewing validated');
      validationQueueQuery.refetch();
      pipelineQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });

  const advanceStageMutation = trpc.distribution.manager.advanceDealStage.useMutation({
    onSuccess: () => {
      toast.success('Referral stage updated');
      pipelineQuery.refetch();
      if (selectedDealId) timelineQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });

  if (loading || assignmentsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (assignmentsQuery.error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="mx-auto max-w-7xl px-4 pt-24">
          <Card>
            <CardHeader>
              <CardTitle>Manager access required</CardTitle>
              <CardDescription>{assignmentsQuery.error.message}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribution Manager Dashboard</CardTitle>
            <CardDescription>
              Manage buyer, renter, and bidder referrals for assigned programmes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="w-full md:w-[360px]">
              <Select
                value={selectedAssignmentId ? String(selectedAssignmentId) : undefined}
                onValueChange={value => setSelectedAssignmentId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignment" />
                </SelectTrigger>
                <SelectContent>
                  {(assignmentsQuery.data || []).map((assignment: any) => (
                    <SelectItem
                      key={assignment.assignmentId}
                      value={String(assignment.assignmentId)}
                    >
                      {assignment.developmentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary">Assignments: {(assignmentsQuery.data || []).length}</Badge>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Open Pipeline Referrals</CardDescription>
              <CardTitle>{(pipelineQuery.data || []).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Upcoming Viewings</CardDescription>
              <CardTitle>{(viewingsQuery.data || []).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Validation Queue</CardDescription>
              <CardTitle>{(validationQueueQuery.data || []).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Validation Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(validationQueueQuery.data || []).slice(0, 20).map((row: any) => {
                const dealCopy = getManagerDistributionDealCopy(row.transactionType);

                return (
                  <div key={row.dealId} className="rounded border p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {row.developmentName} - {row.buyerName || dealCopy.unknownParticipant}
                      </p>
                      <Badge variant="outline">{dealCopy.laneLabel}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {dealCopy.stageContext}: {row.currentStage}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          validateMutation.mutate({
                            dealId: Number(row.dealId),
                            outcome: 'completed_proceeding',
                          })
                        }
                      >
                        {dealCopy.participantLabel} proceeding
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          validateMutation.mutate({
                            dealId: Number(row.dealId),
                            outcome: 'completed_not_proceeding',
                          })
                        }
                      >
                        Not proceeding
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          validateMutation.mutate({
                            dealId: Number(row.dealId),
                            outcome: 'no_show',
                          })
                        }
                      >
                        No show
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referral Pipeline & Stage Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(pipelineQuery.data || []).slice(0, 24).map((deal: any) => {
                const dealCopy = getManagerDistributionDealCopy(deal.transactionType);

                return (
                  <div key={deal.id} className="rounded border p-3 space-y-2">
                    <button
                      className="text-left w-full"
                      onClick={() => setSelectedDealId(Number(deal.id))}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {deal.developmentName} - {deal.buyerName || dealCopy.unknownParticipant}
                        </p>
                        <Badge variant="outline">{dealCopy.laneLabel}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {dealCopy.stageContext}: {deal.currentStage} | {dealCopy.rewardContext}:{' '}
                        {deal.commissionStatus}
                      </p>
                    </button>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'application_submitted',
                        'contract_signed',
                        'bond_approved',
                        'commission_pending',
                        'cancelled',
                      ].map(stage => (
                        <Button
                          key={stage}
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            advanceStageMutation.mutate({
                              dealId: Number(deal.id),
                              toStage: stage as any,
                              notes: null,
                              rejectionReason: stage === 'cancelled' ? 'Cancelled by manager' : null,
                            })
                          }
                        >
                          {getManagerDistributionStageActionLabel(stage, deal.transactionType)}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {selectedDealId && (
          <Card>
            <CardHeader>
              <CardTitle>Referral Timeline</CardTitle>
              <CardDescription>Referral deal #{selectedDealId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(timelineQuery.data?.events || []).map((event: any) => (
                <div key={event.id} className="rounded border p-3">
                  <p className="font-medium">
                    {event.eventType} | {event.fromStage || 'start'} {'->'} {event.toStage || 'n/a'}
                  </p>
                  <p className="text-xs text-slate-500">{event.eventAt}</p>
                  {event.notes ? <p className="text-sm mt-1">{event.notes}</p> : null}
                </div>
              ))}
              {!timelineQuery.isLoading && !(timelineQuery.data?.events || []).length && (
                <p className="text-sm text-slate-500">No timeline events found for this deal.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
