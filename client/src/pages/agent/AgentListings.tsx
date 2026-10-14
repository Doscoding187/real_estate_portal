import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  Home,
  Building2,
  List,
  LayoutGrid,
  Clock3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentListingInventoryCard } from '@/components/agent/AgentListingInventoryCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { AgentJourneyStatusErrorState } from '@/components/agent/AgentJourneyStatusErrorState';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import {
  getAgentJourneyAction,
  getAgentProfileCompletionDescription,
  isAgentProfileJourneyStep,
} from '@/lib/agentJourney';
import { calculateListingReadiness } from '@/lib/readiness';
import {
  getPrivateListingActionIds,
  getPublicAgentListingActionIds,
} from '@/lib/agentListingActionIds';
import { cn } from '@/lib/utils';

type ListingTab = 'active' | 'pending' | 'draft' | 'rejected' | 'sold' | 'archived';
const PAGE_SIZE = 12;
type SortOrder = 'newest' | 'oldest' | 'title' | 'price_low' | 'price_high';

type ListingStatusFilter = 'pending_review' | 'draft' | 'rejected';

function listingTabFromLocation(location: string): ListingTab {
  // Wouter may expose the pathname without its search string, while the
  // browser URL remains the canonical source for a deep-linked tab.
  const search =
    typeof window !== 'undefined'
      ? window.location.search
      : location.includes('?')
        ? location.slice(location.indexOf('?'))
        : '';
  const requestedTab = new URLSearchParams(search).get('tab');

  return requestedTab === 'pending' ||
    requestedTab === 'draft' ||
    requestedTab === 'rejected' ||
    requestedTab === 'sold' ||
    requestedTab === 'archived'
    ? requestedTab
    : 'active';
}

export default function AgentListings() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const {
    status,
    isLoading: statusLoading,
    error: statusError,
    retry: retryStatus,
    agentLaunchAccessAvailable,
  } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [page, setPage] = useState(1);

  const [activeTab, setActiveTab] = useState<ListingTab>(() => listingTabFromLocation(location));

  useEffect(() => {
    setActiveTab(listingTabFromLocation(location));
  }, [location]);

  // Map tabs to status for API
  const getListingStatusForTab = (tab: ListingTab): ListingStatusFilter => {
    if (tab === 'pending') return 'pending_review';
    if (tab === 'rejected') return 'rejected';
    return 'draft';
  };

  const isDraftOrPending =
    activeTab === 'draft' || activeTab === 'pending' || activeTab === 'rejected';
  const dashboardUnlocked = !statusLoading && Boolean(status?.dashboardUnlocked);
  const operationalDataEnabled = !statusLoading && Boolean(status?.fullFeaturesUnlocked);

  const isListingInTab = (status: string | null | undefined, tab: ListingTab) => {
    const normalized = String(status || '').toLowerCase();

    switch (tab) {
      case 'active':
        return ['available', 'published', 'active'].includes(normalized);
      case 'sold':
        return normalized === 'sold';
      case 'archived':
        return normalized === 'archived';
      default:
        return true;
    }
  };

  // Fetch agent listings (for Active, Sold, Archived)
  const { data: agentListings, isLoading: isLoadingAgent } = trpc.agent.getMyListings.useQuery(
    {
      status: 'all',
      limit: 50,
    },
    {
      // Active inventory is operational data. Keep it behind the same
      // server-decided journey gate used by the rest of the workspace.
      enabled: !!user && operationalDataEnabled && !isDraftOrPending,
    },
  );

  // Fetch draft/pending listings (from listings table)
  const {
    data: draftListings,
    isLoading: isLoadingDraft,
    refetch: refetchDrafts,
  } = trpc.listing.myListings.useQuery(
    {
      status: getListingStatusForTab(activeTab),
      limit: 50,
    },
    {
      // Drafts and submissions are private authoring work, so an agent can
      // recover them while payment or profile approval is still pending.
      enabled: !!user && dashboardUnlocked && isDraftOrPending,
    },
  );

  const utils = trpc.useContext();

  // Mutations for properties (Active, Sold, Archived tabs)
  const deletePropertyMutation = trpc.agent.deleteProperty.useMutation({
    onSuccess: () => {
      console.log('Delete property success');
      utils.agent.getMyListings.invalidate();
    },
    onError: error => {
      console.error('Delete property error:', error);
      alert('Failed to delete property: ' + error.message);
    },
  });

  // Mutations for listings (Draft, Pending tabs)
  const deleteListingMutation = trpc.listing.delete.useMutation({
    onSuccess: () => {
      console.log('Delete listing success');
      utils.listing.myListings.invalidate();
      refetchDrafts();
    },
    onError: error => {
      console.error('Delete listing error:', error);
      alert('Failed to delete listing: ' + error.message);
    },
  });

  // Helper functions to use the correct mutation
  const handleDelete = (listingId: number) => {
    console.log('handleDelete called', { listingId, isDraftOrPending });
    if (
      confirm(
        'Are you sure you want to permanently delete this listing? This action cannot be undone.',
      )
    ) {
      if (isDraftOrPending) {
        deleteListingMutation.mutate({ id: listingId });
      } else {
        deletePropertyMutation.mutate({ id: listingId });
      }
    }
  };

  const isLoading = isDraftOrPending ? isLoadingDraft : isLoadingAgent;

  type DraftListing = NonNullable<typeof draftListings>[number];
  type AgentListing = NonNullable<typeof agentListings>[number];

  const normalizeDraftListing = (listing: DraftListing) => ({
    id: listing.id,
    listingId: listing.id,
    publicPropertyId: null,
    title: listing.title,
    action: listing.action,
    address: listing.address,
    city: listing.city,
    suburb: listing.suburb,
    province: listing.province,
    price:
      listing.pricing?.askingPrice ||
      listing.pricing?.monthlyRent ||
      listing.pricing?.startingBid ||
      0,
    bedrooms: listing.propertyDetails?.bedrooms || 0,
    bathrooms: listing.propertyDetails?.bathrooms || 0,
    houseAreaM2:
      listing.propertyDetails?.houseAreaM2 ||
      listing.propertyDetails?.unitSizeM2 ||
      listing.propertyDetails?.floorAreaM2 ||
      0,
    primaryImage: listing.primaryImage,
    status: listing.status === 'pending_review' ? 'pending' : listing.status,
    approvalStatus: listing.approvalStatus,
    readinessScore: listing.readinessScore,
    rejectionReason: listing.rejectionReason,
    rejectionReasons: listing.rejectionReasons,
    rejectionNote: listing.rejectionNote,
    readiness: calculateListingReadiness(listing),
    views: 0,
    enquiries: 0,
  });

  const normalizeAgentListing = (listing: AgentListing) => ({
    ...listing,
    listingId: listing.sourceListingId == null ? null : Number(listing.sourceListingId),
    publicPropertyId: Number(listing.id),
    price:
      listing.pricing?.askingPrice ||
      listing.pricing?.monthlyRent ||
      listing.pricing?.startingBid ||
      listing.price ||
      0,
    primaryImage: listing.primaryImage,
    readiness: calculateListingReadiness(listing),
  });

  // Normalize data
  const listings = isDraftOrPending
    ? draftListings?.map(normalizeDraftListing)
    : agentListings
        ?.filter(listing => isListingInTab(listing.status, activeTab))
        .map(normalizeAgentListing);

  const filteredListings = listings?.filter(
    listing =>
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.suburb?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.city?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const listingAccessLocked = !statusLoading && !status?.entitlements?.canPublishListings;
  // The existing APIs return the latest 50 records. Sort and paginate that
  // loaded set explicitly; do not imply an inventory-wide count or search.
  const sortedListings = [...(filteredListings ?? [])];
  if (sortOrder === 'oldest') sortedListings.reverse();
  if (sortOrder === 'title') sortedListings.sort((a, b) => a.title.localeCompare(b.title));
  if (sortOrder === 'price_low' || sortOrder === 'price_high') {
    sortedListings.sort(
      (a, b) => (Number(a.price) - Number(b.price)) * (sortOrder === 'price_low' ? 1 : -1),
    );
  }
  const pageCount = Math.max(1, Math.ceil(sortedListings.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageListings = sortedListings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const loadedCount = (isDraftOrPending ? draftListings : agentListings)?.length ?? 0;
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery, sortOrder]);

  const journeyAction = getAgentJourneyAction(status, { agentLaunchAccessAvailable });
  const needsProfileCompletion = isAgentProfileJourneyStep(status);
  const startListing = () => {
    if (statusLoading || journeyAction.waiting) return;
    setLocation(listingAccessLocked ? journeyAction.href : '/listings/create');
  };

  return (
    <AgentAppShell>
      {/* Header */}
      <header className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center gap-3 border-b border-slate-200/80 bg-white/92 px-4 py-3 backdrop-blur-xl transition-all duration-300 sm:px-6">
        <div className="flex-1">
          <h1 className={agentPageStyles.title}>My Listings</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation('/agent/commercial')}
            className={agentPageStyles.ghostButton}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Commercial inventory
          </Button>
          <Button
            onClick={startListing}
            disabled={statusLoading || journeyAction.waiting}
            className={agentPageStyles.primaryButton}
          >
            <Plus className="h-4 w-4 mr-2" />
            {listingAccessLocked ? journeyAction.label : 'Add New Listing'}
          </Button>
        </div>
      </header>

      <main className={agentPageStyles.container}>
        {statusLoading ? (
          <AgentFeatureLockedState
            title="Preparing your listings workspace"
            description="We are checking your onboarding and publishing access before loading inventory management."
            actionLabel="Loading"
            onAction={() => {}}
            isLoading
          />
        ) : statusError ? (
          <AgentJourneyStatusErrorState onRetry={retryStatus} />
        ) : !dashboardUnlocked ? (
          <AgentFeatureLockedState
            title={
              needsProfileCompletion
                ? 'Complete your profile before opening listings'
                : journeyAction.title
            }
            description={
              needsProfileCompletion
                ? 'Complete the remaining professional profile details to unlock your Agent workspace.'
                : journeyAction.description
            }
            actionLabel={journeyAction.waiting ? 'Return to dashboard' : journeyAction.label}
            onAction={() =>
              setLocation(journeyAction.waiting ? '/agent/dashboard' : journeyAction.href)
            }
          />
        ) : (
          <>
            {listingAccessLocked && isDraftOrPending ? (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
                <p className="font-medium">
                  Your private {activeTab === 'draft' ? 'drafts' : 'submissions'} are still here.
                </p>
                <p className="mt-1 text-amber-900/80">
                  {journeyAction.description} You can review or edit this work while access is being
                  completed.
                </p>
                {!journeyAction.waiting ? (
                  <Button
                    variant="outline"
                    className="mt-3 rounded-full border-amber-300 bg-white"
                    onClick={() => setLocation(journeyAction.href)}
                  >
                    {journeyAction.label}
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className={cn(agentPageStyles.controls, 'flex flex-wrap items-center gap-3')}>
              <div className="relative min-w-0 flex-1 basis-60">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label="Search loaded listings"
                  placeholder="Search by title or location…"
                  className="rounded-xl border-slate-200 bg-slate-50 pl-10"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={sortOrder} onValueChange={value => setSortOrder(value as SortOrder)}>
                <SelectTrigger aria-label="Sort listings" className="w-44 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="title">Title A–Z</SelectItem>
                  <SelectItem value="price_low">Price: low to high</SelectItem>
                  <SelectItem value="price_high">Price: high to low</SelectItem>
                </SelectContent>
              </Select>
              <div
                className="flex rounded-xl border border-slate-200 bg-slate-50 p-1"
                role="group"
                aria-label="Listing layout"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  aria-pressed={view === 'list'}
                  className={cn(
                    'gap-1.5 rounded-lg',
                    view === 'list' && 'bg-white text-[var(--primary)] shadow-sm',
                  )}
                  onClick={() => setView('list')}
                >
                  <List className="h-4 w-4" />
                  List
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-pressed={view === 'grid'}
                  className={cn(
                    'gap-1.5 rounded-lg',
                    view === 'grid' && 'bg-white text-[var(--primary)] shadow-sm',
                  )}
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Grid
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={value => setActiveTab(value as ListingTab)}
              className="w-full"
            >
              <TabsList
                className={cn(
                  agentPageStyles.tabsList,
                  'mb-4 flex w-full overflow-x-auto justify-start',
                )}
              >
                <TabsTrigger value="active" className={agentPageStyles.tabTrigger}>
                  Active
                </TabsTrigger>
                <TabsTrigger value="pending" className={agentPageStyles.tabTrigger}>
                  Pending
                </TabsTrigger>
                <TabsTrigger value="draft" className={agentPageStyles.tabTrigger}>
                  Drafts
                </TabsTrigger>
                <TabsTrigger value="rejected" className={agentPageStyles.tabTrigger}>
                  Changes needed
                </TabsTrigger>
                <TabsTrigger value="sold" className={agentPageStyles.tabTrigger}>
                  Sold
                </TabsTrigger>
                <TabsTrigger value="archived" className={agentPageStyles.tabTrigger}>
                  Archived
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value={activeTab}
                className="space-y-4 animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
              >
                {activeTab === 'pending' && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      <span className="font-medium">Awaiting admin review.</span> These listings are
                      private until approved and published.
                    </p>
                  </div>
                )}
                {!isLoading && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <p role="status">
                      {sortedListings.length === 0
                        ? '0 listings'
                        : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, sortedListings.length)} of ${sortedListings.length} ${loadedCount >= 50 ? 'loaded ' : ''}listings`}
                    </p>
                    {loadedCount >= 50 && (
                      <p>Latest 50 records loaded · search and sort apply to these records.</p>
                    )}
                  </div>
                )}
                {listingAccessLocked && !isDraftOrPending ? (
                  <AgentFeatureLockedState
                    title={
                      needsProfileCompletion
                        ? 'Complete your profile before listing'
                        : journeyAction.title
                    }
                    description={
                      needsProfileCompletion
                        ? getAgentProfileCompletionDescription({ agentLaunchAccessAvailable })
                        : journeyAction.description
                    }
                    actionLabel={
                      journeyAction.waiting ? 'Return to dashboard' : journeyAction.label
                    }
                    onAction={() =>
                      setLocation(journeyAction.waiting ? '/agent/dashboard' : journeyAction.href)
                    }
                  />
                ) : isLoading ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={cn(agentPageStyles.panel, 'flex gap-4 p-4')}>
                        <Skeleton className="h-32 w-48 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredListings?.length === 0 ? (
                  <div className="rounded-[15px] border border-dashed border-slate-200 bg-white py-20 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_0_1px_rgba(15,23,42,0.04)]">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <Home className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No listings found</h3>
                    <p className="text-slate-500 mt-1">
                      {searchQuery
                        ? 'Try adjusting your search terms'
                        : `You don't have any ${activeTab} listings yet`}
                    </p>
                    {!searchQuery && (activeTab === 'active' || activeTab === 'draft') && (
                      <Button
                        onClick={startListing}
                        disabled={statusLoading || journeyAction.waiting}
                        className={cn(agentPageStyles.primaryButton, 'mt-4')}
                      >
                        {listingAccessLocked ? journeyAction.label : 'Create Listing'}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div
                    className={
                      view === 'grid'
                        ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'
                        : 'flex flex-col gap-3'
                    }
                  >
                    {pageListings.map(listing => {
                      const privateActionIds = isDraftOrPending
                        ? getPrivateListingActionIds(listing.listingId)
                        : null;
                      const publicActionIds = isDraftOrPending
                        ? null
                        : getPublicAgentListingActionIds({
                            propertyId: listing.publicPropertyId,
                            sourceListingId: listing.listingId,
                          });
                      const editListingId =
                        privateActionIds?.editListingId ?? publicActionIds?.editListingId ?? null;
                      const deleteId =
                        privateActionIds?.deleteListingId ??
                        publicActionIds?.deletePropertyId ??
                        null;
                      const publicPropertyId = publicActionIds?.publicPropertyId ?? null;
                      const editUnavailableLabel =
                        !isDraftOrPending && editListingId == null
                          ? 'This public listing no longer has a source listing that can be edited.'
                          : undefined;

                      return (
                        <AgentListingInventoryCard
                          key={listing.id}
                          listing={listing}
                          view={view}
                          editUnavailableLabel={editUnavailableLabel}
                          onEdit={
                            editListingId == null
                              ? undefined
                              : () => setLocation(`/listings/create?id=${editListingId}&edit=true`)
                          }
                          onDelete={deleteId == null ? undefined : () => handleDelete(deleteId)}
                          onView={
                            publicPropertyId == null
                              ? undefined
                              : () => setLocation(`/property/${publicPropertyId}`)
                          }
                        />
                      );
                    })}
                  </div>
                )}
                {!isLoading && pageCount > 1 && (
                  <nav
                    aria-label="Listing pages"
                    className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4"
                  >
                    <p className="text-xs text-slate-500">
                      Page {currentPage} of {pageCount} · {PAGE_SIZE} per page
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === pageCount}
                        onClick={() => setPage(currentPage + 1)}
                      >
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </nav>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </AgentAppShell>
  );
}
