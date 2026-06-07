import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

type ManagerAssignmentTransactionLane = 'all' | 'sale' | 'rent' | 'auction';

type ManagerDevelopmentAssignment = {
  developmentId: number;
  developmentName: string;
  transactionType?: string | null;
  city?: string | null;
  province?: string | null;
  assignedAt?: string | null;
  isPrimary?: boolean;
};

export function normalizeManagerAssignmentTransactionLane(
  transactionType: unknown,
): Exclude<ManagerAssignmentTransactionLane, 'all'> {
  const normalized = String(transactionType || '').trim().toLowerCase();
  if (['for_rent', 'rent', 'rental', 'to_rent', 'to-rent'].includes(normalized)) return 'rent';
  if (['auction', 'on_auction', 'on-auction'].includes(normalized)) return 'auction';
  return 'sale';
}

export function getManagerAssignmentTransactionLabel(transactionType: unknown): string {
  const lane = normalizeManagerAssignmentTransactionLane(transactionType);
  if (lane === 'rent') return 'Rental engine';
  if (lane === 'auction') return 'Auction engine';
  return 'Sale engine';
}

export function filterManagerDevelopmentAssignments(
  assignments: ManagerDevelopmentAssignment[],
  lane: ManagerAssignmentTransactionLane,
): ManagerDevelopmentAssignment[] {
  if (lane === 'all') return assignments;
  return assignments.filter(
    item => normalizeManagerAssignmentTransactionLane(item.transactionType) === lane,
  );
}

export default function ManagerDevelopmentOpsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [transactionFilter, setTransactionFilter] =
    useState<ManagerAssignmentTransactionLane>('all');

  const assignedDevelopmentsQuery = trpc.distribution.manager.getAssignedDevelopments.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);

  const assignments = useMemo(
    () => (assignedDevelopmentsQuery.data || []) as ManagerDevelopmentAssignment[],
    [assignedDevelopmentsQuery.data],
  );

  const transactionCounts = useMemo(() => {
    return assignments.reduce(
      (counts, item) => {
        const lane = normalizeManagerAssignmentTransactionLane(item.transactionType);
        counts[lane] += 1;
        return counts;
      },
      { sale: 0, rent: 0, auction: 0 },
    );
  }, [assignments]);

  const filteredAssignments = useMemo(
    () => filterManagerDevelopmentAssignments(assignments, transactionFilter),
    [assignments, transactionFilter],
  );

  if (loading || assignedDevelopmentsQuery.isLoading) {
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
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Manager Distribution Operations</CardTitle>
            <CardDescription>
              Review your assigned developments and process deal documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Assigned developments: {assignments.length}</Badge>
              <Badge variant="outline">Sale: {transactionCounts.sale}</Badge>
              <Badge variant="outline">Rental: {transactionCounts.rent}</Badge>
              <Badge variant="outline">Auction: {transactionCounts.auction}</Badge>
              <label className="ml-auto flex items-center gap-2 text-sm">
                Engine
                <select
                  className="h-9 rounded border border-input bg-background px-2"
                  data-testid="manager-development-transaction-filter"
                  value={transactionFilter}
                  onChange={event =>
                    setTransactionFilter(event.target.value as ManagerAssignmentTransactionLane)
                  }
                >
                  <option value="all">All engines</option>
                  <option value="sale">Sale engine</option>
                  <option value="rent">Rental engine</option>
                  <option value="auction">Auction engine</option>
                </select>
              </label>
            </div>
          </CardContent>
        </Card>

        {assignedDevelopmentsQuery.error ? (
          <Card>
            <CardContent className="py-8 text-sm text-red-600">
              {assignedDevelopmentsQuery.error.message}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {filteredAssignments.map((item: any) => (
            <Card key={`${item.developmentId}-${item.assignedAt}`}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{item.developmentName}</CardTitle>
                  <Badge variant="outline">
                    {getManagerAssignmentTransactionLabel(item.transactionType)}
                  </Badge>
                </div>
                <CardDescription>
                  {item.city || 'Unknown city'}, {item.province || 'Unknown province'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant={item.isPrimary ? 'default' : 'secondary'}>
                  {item.isPrimary ? 'Primary' : 'Assigned'}
                </Badge>
                <Button
                  onClick={() =>
                    setLocation(`/distribution/manager/developments/${Number(item.developmentId)}`)
                  }
                >
                  View Deals
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {!assignedDevelopmentsQuery.error && !assignments.length ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              No active development assignments found.
            </CardContent>
          </Card>
        ) : null}

        {!assignedDevelopmentsQuery.error && assignments.length > 0 && !filteredAssignments.length ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              No assigned developments found for this transaction engine.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
