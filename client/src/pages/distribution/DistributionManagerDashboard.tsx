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
      toast.success('Deal stage updated');
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
              Manage showings, validate outcomes, and drive deal progression for assigned programs.
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
              <CardDescription>Open Pipeline Deals</CardDescription>
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
              {(validationQueueQuery.data || []).slice(0, 20).map((row: any) => (
                <div key={row.id} className="rounded border p-3 space-y-2">
                  <p className="font-medium">
                    {row.developmentName} - {row.buyerName}
                  </p>
                  <p className="text-xs text-slate-500">Current stage: {row.currentStage}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        validateMutation.mutate({
                          dealId: Number(row.id),
                          outcome: 'completed_proceeding',
                        })
                      }
                    >
                      Proceeding
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        validateMutation.mutate({
                          dealId: Number(row.id),
                          outcome: 'completed_not_proceeding',
                        })
                      }
                    >
                      Not Proceeding
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        validateMutation.mutate({ dealId: Number(row.id), outcome: 'no_show' })
                      }
                    >
                      No Show
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline & Stage Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(pipelineQuery.data || []).slice(0, 24).map((deal: any) => (
                <div key={deal.id} className="rounded border p-3 space-y-2">
                  <button
                    className="text-left w-full"
                    onClick={() => setSelectedDealId(Number(deal.id))}
                  >
                    <p className="font-medium">
                      {deal.developmentName} - {deal.buyerName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Stage: {deal.currentStage} | Commission: {deal.commissionStatus}
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
                        {stage}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {selectedDealId && (
          <Card>
            <CardHeader>
              <CardTitle>Deal Timeline</CardTitle>
              <CardDescription>Deal #{selectedDealId}</CardDescription>
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
