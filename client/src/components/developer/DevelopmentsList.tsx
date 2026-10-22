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

type DevelopmentView = 'active' | 'history' | 'all';
type DevelopmentFilter = 'all' | 'ready' | 'available' | 'attention';

const DEVELOPMENT_VIEWS: Array<{ value: DevelopmentView; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'history', label: 'Sold-out history' },
  { value: 'all', label: 'All developments' },
];

const DEVELOPMENT_FILTERS: Array<{ value: DevelopmentFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready to progress' },
  { value: 'available', label: 'Available inventory' },
  { value: 'attention', label: 'Needs attention' },
];

function matchesDevelopmentView(
  development: { market: { status: string }; inventory: { availableUnits: number | null } },
  view: DevelopmentView,
): boolean {
  const hasMarketableInventory = (development.inventory.availableUnits ?? 0) > 0;
  if (view === 'history') {
    return development.market.status === 'sold-out' && !hasMarketableInventory;
  }
  if (view === 'active') {
    return development.market.status !== 'sold-out' || hasMarketableInventory;
  }
  return true;
}

function matchesDevelopmentFilter(
  development: {
    readiness: { status: string };
    inventory: { availableUnits: number | null };
    attention: { totalCount: number };
  },
  filter: DevelopmentFilter,
): boolean {
  if (filter === 'ready') return development.readiness.status === 'ready';
  if (filter === 'available') return (development.inventory.availableUnits ?? 0) > 0;
  if (filter === 'attention') return development.attention.totalCount > 0;
  return true;
}

function getRouteParams(location: string): URLSearchParams {
  const search = location.includes('?') ? location.slice(location.indexOf('?') + 1) : '';
  return new URLSearchParams(search);
}

function getDevelopmentView(location: string): DevelopmentView {
  const candidate = getRouteParams(location).get('view');
  return DEVELOPMENT_VIEWS.some(view => view.value === candidate)
    ? (candidate as DevelopmentView)
    : 'active';
}

function getDevelopmentFilter(location: string): DevelopmentFilter {
  const candidate = getRouteParams(location).get('filter');
  return DEVELOPMENT_FILTERS.some(filter => filter.value === candidate)
    ? (candidate as DevelopmentFilter)
    : 'all';
}

function routeWithParam(
  location: string,
  key: 'view' | 'filter',
  value: string,
  defaultValue: string,
) {
  const params = getRouteParams(location);
  if (value === defaultValue) params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  return `/developer/developments${query ? `?${query}` : ''}`;
}

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

function marketStatusLabel(
  status: string,
  availableUnits: number | null,
  transactionType: string,
): string {
  if (status === 'sold-out' && (availableUnits ?? 0) > 0) {
    if (transactionType === 'for_rent') return 'Rental availability';
    if (transactionType === 'mixed') return 'Sale and rent availability';
    return 'For sale';
  }
  return (
    {
      'launching-soon': 'Launching soon',
      selling: 'Selling',
      'sold-out': 'Sold out',
    }[status] ?? status
  );
}

function transactionTypeLabel(transactionType: string): string {
  return (
    {
      for_sale: 'For sale',
      for_rent: 'For rent',
      auction: 'Auction',
      mixed: 'For sale and rent',
    }[transactionType] ?? transactionType
  );
}

export default function DevelopmentsList() {
  const [location, setLocation] = useLocation();
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

  const developmentRows = homeQuery.data?.developments;
  const developments = useMemo(() => developmentRows ?? [], [developmentRows]);
  const activeView = getDevelopmentView(location);
  const activeFilter = getDevelopmentFilter(location);
  const setView = (view: DevelopmentView) =>
    setLocation(routeWithParam(location, 'view', view, 'active'));
  const setFilter = (filter: DevelopmentFilter) =>
    setLocation(routeWithParam(location, 'filter', filter, 'all'));
  const viewDevelopments = useMemo(
    () => developments.filter(development => matchesDevelopmentView(development, activeView)),
    [activeView, developments],
  );
  const filteredDevelopments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return viewDevelopments.filter(development => {
      if (!matchesDevelopmentFilter(development, activeFilter)) return false;
      if (!query) return true;
      const location = development.identity.location;
      return [development.identity.name, location.city, location.province]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query));
    });
  }, [activeFilter, searchTerm, viewDevelopments]);
  const viewCounts = useMemo(
    () => ({
      active: developments.filter(development => matchesDevelopmentView(development, 'active'))
        .length,
      history: developments.filter(development => matchesDevelopmentView(development, 'history'))
        .length,
      all: developments.length,
    }),
    [developments],
  );
  const filterCounts = useMemo(
    () => ({
      all: viewDevelopments.length,
      ready: viewDevelopments.filter(development => matchesDevelopmentFilter(development, 'ready'))
        .length,
      available: viewDevelopments.filter(development =>
        matchesDevelopmentFilter(development, 'available'),
      ).length,
      attention: viewDevelopments.filter(development =>
        matchesDevelopmentFilter(development, 'attention'),
      ).length,
    }),
    [viewDevelopments],
  );

  const handleDelete = (id: number, name: string) => {
    if (
      !window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)
    ) {
      return;
    }
    deleteMutation.mutate({ id });
  };

  const canDelete = (development: (typeof developments)[number]) => {
    const state = development.lifecycle.state;
    const isPrivateLifecycle =
      state === 'draft_ready_to_submit' ||
      state === 'draft_action_required' ||
      state === 'rejected' ||
      state === 'approved_private';
    return isPrivateLifecycle && development.leads.capturedLeadCount === 0;
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

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Portfolio view">
          <span className="mr-1 text-sm font-medium text-slate-700">Portfolio</span>
          {DEVELOPMENT_VIEWS.map(view => (
            <Button
              key={view.value}
              type="button"
              size="sm"
              variant={activeView === view.value ? 'default' : 'outline'}
              aria-pressed={activeView === view.value}
              onClick={() => setView(view.value)}
            >
              {view.label}{' '}
              <span aria-label={`${viewCounts[view.value]} matching`}>
                ({viewCounts[view.value]})
              </span>
            </Button>
          ))}
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter developments"
        >
          <span className="mr-1 text-sm font-medium text-slate-700">Show</span>
          {DEVELOPMENT_FILTERS.map(filter => (
            <Button
              key={filter.value}
              type="button"
              size="sm"
              variant={activeFilter === filter.value ? 'default' : 'outline'}
              aria-pressed={activeFilter === filter.value}
              onClick={() => setFilter(filter.value)}
            >
              {filter.label}{' '}
              <span aria-label={`${filterCounts[filter.value]} matching`}>
                ({filterCounts[filter.value]})
              </span>
            </Button>
          ))}
        </div>
      </div>

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
                      {marketStatusLabel(
                        development.market.status,
                        development.inventory.availableUnits,
                        development.market.transactionType,
                      )}
                    </Badge>
                    <Badge variant="outline">
                      {transactionTypeLabel(development.market.transactionType)}
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
                  {canDelete(development) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${development.identity.name}`}
                      title="Delete private development"
                      disabled={deleteMutation.isPending}
                      onClick={() =>
                        handleDelete(development.identity.id, development.identity.name)
                      }
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  )}
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
              : viewDevelopments.length === 0 && activeView === 'active'
                ? 'No active developments yet. Sold-out developments are available in Sold-out history.'
                : viewDevelopments.length === 0 && activeView === 'history'
                  ? 'No sold-out developments are in this portfolio yet.'
                  : activeFilter !== 'all'
                    ? `No developments match “${DEVELOPMENT_FILTERS.find(filter => filter.value === activeFilter)?.label}” and your search.`
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
