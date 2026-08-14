import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { invalidateDeveloperOperatingHomeRanges } from '@/lib/developmentHomeInvalidation';
import { trpc } from '@/lib/trpc';

function lifecycleLabel(state: string): string {
  return (
    {
      live: 'Live',
      approved_private: 'Approved · private',
      in_review: 'In review',
      changes_required: 'Changes requested',
      rejected: 'Rejected',
      draft_ready_to_submit: 'Ready to submit',
      draft_action_required: 'Draft · action required',
    }[state] ?? state
  );
}

function lifecycleVariant(state: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (state === 'live') return 'default';
  if (state === 'rejected') return 'destructive';
  if (state === 'changes_required' || state === 'draft_action_required') return 'secondary';
  return 'outline';
}

function numberLabel(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat().format(value);
}

export default function DevelopmentsList() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState('');
  const homeQuery = trpc.developer.getOperatingHome.useQuery(
    { range: '30d' },
    { refetchOnWindowFocus: false },
  );

  const deleteMutation = trpc.developer.deleteDevelopment.useMutation({
    onSuccess: async () => {
      toast.success('Development deleted successfully');
      await invalidateDeveloperOperatingHomeRanges(input =>
        utils.developer.getOperatingHome.invalidate(input),
      );
      await utils.developer.getDevelopments.invalidate();
    },
    onError: error => toast.error(error.message || 'Failed to delete development'),
  });

  const developments = homeQuery.data?.developments ?? [];
  const filteredDevelopments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return developments;
    return developments.filter(development => {
      const location = development.identity.location;
      return [development.identity.name, location.city, location.province]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query));
    });
  }, [developments, searchTerm]);

  const handleDelete = (id: number, name: string) => {
    if (
      !window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)
    ) {
      return;
    }
    deleteMutation.mutate({ id });
  };

  if (homeQuery.isLoading) {
    return <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />;
  }

  if (homeQuery.error) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <h3 className="text-lg font-semibold">Unable to load developments</h3>
          <p className="text-sm text-slate-600">{homeQuery.error.message}</p>
          <Button variant="outline" onClick={() => homeQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Developments</h1>
            <p className="text-sm text-muted-foreground">
              Manage private drafts, review progress, inventory, and publication actions.
            </p>
          </div>
          <Button onClick={() => setLocation('/developer/create-development')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Development
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search developments..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredDevelopments.map(development => (
          <Card key={development.identity.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="truncate">{development.identity.name}</CardTitle>
                    <Badge variant={lifecycleVariant(development.lifecycle.state)}>
                      {lifecycleLabel(development.lifecycle.state)}
                    </Badge>
                    <Badge variant="outline">
                      {development.readiness.status === 'ready' ? 'Ready' : 'Readiness blocked'}
                    </Badge>
                  </div>
                  <CardDescription>
                    {development.identity.location.city}, {development.identity.location.province}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {development.nextAction && (
                    <Button size="sm" onClick={() => setLocation(development.nextAction!.href)}>
                      {development.nextAction.label}
                      <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setLocation(`/developer/create-development?id=${development.identity.id}`)
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(development.identity.id, development.identity.name)}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                <Metric label="Blockers" value={development.readiness.blockerCount} />
                <Metric label="Total units" value={development.inventory.totalUnits} />
                <Metric label="Available" value={development.inventory.availableUnits} />
                <Metric label="Open leads" value={development.leads.openLeadCount} />
                <Metric label="SLA breaches" value={development.leads.slaBreachCount} />
              </div>
              {development.nextAction && (
                <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-950">
                  {development.readiness.status === 'ready' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <span>{development.nextAction.explanation}</span>
                </div>
              )}
              {development.lifecycle.latestReview?.feedback && (
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                  Review feedback: {development.lifecycle.latestReview.feedback}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDevelopments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {developments.length === 0
              ? 'No developments yet. Create a private draft to get started.'
              : 'No developments match your search.'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{numberLabel(value)}</p>
    </div>
  );
}
