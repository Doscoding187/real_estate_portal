import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Eye, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';

function lifecycleLabel(state: string): string {
  return (
    {
      live: 'Public',
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

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return 'Not reviewed yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not reviewed yet' : date.toLocaleString();
}

export default function PublisherDevelopments() {
  const [, setLocation] = useLocation();
  const { selectedBrandId, selectedBrand } = useDeveloperContext();
  const [searchTerm, setSearchTerm] = useState('');
  const utils = trpc.useUtils();

  const homeQuery = trpc.superAdminPublisher.getOperatingHome.useQuery(
    { cataloguePublisherId: selectedBrandId!, range: '30d' },
    { enabled: !!selectedBrandId, refetchOnWindowFocus: false },
  );
  const draftsQuery = trpc.superAdminPublisher.getDrafts.useQuery(
    { cataloguePublisherId: selectedBrandId! },
    { enabled: !!selectedBrandId, refetchOnWindowFocus: false },
  );
  const unpublishMutation = trpc.superAdminPublisher.unpublishDevelopment.useMutation({
    onSuccess: async () => {
      toast.success('Development unpublished; the curated record remains private and editable.');
      await homeQuery.refetch();
    },
    onError: error => toast.error(error.message || 'Failed to unpublish development'),
  });
  const publishMutation = trpc.superAdminPublisher.publishDevelopment.useMutation({
    onSuccess: async () => {
      toast.success('Approved development published.');
      await homeQuery.refetch();
      await utils.developer.getOperatingHome.invalidate();
    },
    onError: error => toast.error(error.message || 'Failed to publish development'),
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

  const handleCreateDevelopment = () => {
    if (!selectedBrandId) return;
    setLocation('/developer/create-development');
  };

  const handleUnpublish = (developmentId: number, name: string) => {
    if (!selectedBrandId) return;
    if (!window.confirm(`Unpublish "${name}"? The curated work will remain private and editable.`)) {
      return;
    }
    unpublishMutation.mutate({ cataloguePublisherId: selectedBrandId, developmentId });
  };

  const handlePublish = (developmentId: number) => {
    if (!selectedBrandId) return;
    publishMutation.mutate({ cataloguePublisherId: selectedBrandId, developmentId });
  };

  if (homeQuery.isLoading || draftsQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (homeQuery.error) {
    return (
      <Card>
        <CardContent className="space-y-3 py-12 text-center">
          <h3 className="text-lg font-semibold">Unable to load curated catalogue</h3>
          <p className="text-sm text-slate-600">{homeQuery.error.message}</p>
          <Button variant="outline" onClick={() => homeQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const home = homeQuery.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Platform-reference catalogue</p>
            <h1 className="text-2xl font-bold text-slate-900">{selectedBrand?.brandName}</h1>
            <p className="text-sm text-muted-foreground">
              Curated marketplace information held in Property Listify custody.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Source: {home?.publisher.sourceAttribution || 'Not recorded'} · Last verified:{' '}
              {formatTimestamp(home?.publication.lastVerifiedAt)}
            </p>
            <Badge className="mt-2" variant={home?.publisher.isVisible ? 'default' : 'secondary'}>
              {home?.publisher.isVisible ? 'Visible in marketplace' : 'Hidden from marketplace'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setLocation('/admin/development-approvals')}>
              Review queue
            </Button>
            <Button onClick={handleCreateDevelopment}>
              <Plus className="mr-2 h-4 w-4" />
              New curated development
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCard label="Developments" value={home?.portfolio.developmentCount} />
        <MetricCard label="Ready" value={home?.portfolio.readiness.readyDevelopmentCount} />
        <MetricCard label="Available units" value={home?.portfolio.inventory.availableUnits} />
        <MetricCard label="Enquiries" value={home?.portfolio.leads.capturedLeadCount} />
        <MetricCard label="Attention" value={home?.portfolio.attentionCount} />
      </div>

      {home?.portfolio.nextAction && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                Next action · {home.portfolio.nextAction.developmentName}
              </p>
              <p className="font-semibold text-amber-950">{home.portfolio.nextAction.label}</p>
              <p className="text-sm text-amber-900">{home.portfolio.nextAction.explanation}</p>
            </div>
            <Button onClick={() => setLocation(home.portfolio.nextAction!.href)}>
              Open action <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {(draftsQuery.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved private drafts</CardTitle>
            <CardDescription>Resume curated catalogue work without making it public.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {draftsQuery.data?.map((draft: any) => (
              <div key={draft.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{draft.draftName || 'Untitled curated draft'}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatTimestamp(draft.lastModified)} · {draft.progress ?? 0}% complete
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLocation(`/developer/create-development?draftId=${draft.id}`)}
                >
                  Resume draft
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search curated developments..."
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
                  {development.lifecycle.publicEligible && development.identity.slug && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation(`/development/${development.identity.slug}`)}
                    >
                      <Eye className="mr-2 h-3.5 w-3.5" />
                      Preview
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setLocation(
                        `/developer/create-development?id=${development.identity.id}&cataloguePublisherId=${selectedBrandId}`,
                      )
                    }
                  >
                    Edit
                  </Button>
                  {development.lifecycle.state === 'approved_private' && development.readiness.status === 'ready' && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(development.identity.id)}
                      disabled={publishMutation.isPending}
                    >
                      Publish
                    </Button>
                  )}
                  {development.lifecycle.publicEligible && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnpublish(development.identity.id, development.identity.name)}
                      disabled={unpublishMutation.isPending}
                    >
                      Unpublish
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                <Metric label="Blockers" value={development.readiness.blockerCount} />
                <Metric label="Unit types" value={development.inventory.activeUnitTypeCount} />
                <Metric label="Total units" value={development.inventory.totalUnits} />
                <Metric label="Available" value={development.inventory.availableUnits} />
                <Metric label="Enquiries" value={development.leads.capturedLeadCount} />
              </div>
              {development.attention.items.length > 0 && (
                <div className="space-y-2 rounded-md bg-amber-50 p-3 text-sm text-amber-950">
                  {development.attention.items.slice(0, 2).map(item => (
                    <button
                      key={`${development.identity.id}-${item.type}`}
                      className="flex w-full items-start gap-2 text-left"
                      onClick={() => setLocation(item.href)}
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <span>{item.explanation}</span>
                    </button>
                  ))}
                </div>
              )}
              {development.lifecycle.latestReview?.feedback && (
                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-950">
                  Review note: {development.lifecycle.latestReview.feedback}
                </div>
              )}
              {development.nextAction && (
                <div className="flex items-start gap-2 rounded-md border p-3 text-sm">
                  {development.readiness.status === 'ready' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <span>{development.nextAction.explanation}</span>
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
              ? 'No curated developments yet. Create a private draft to get started.'
              : 'No curated developments match your search.'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{numberLabel(value)}</p>
      </CardContent>
    </Card>
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
