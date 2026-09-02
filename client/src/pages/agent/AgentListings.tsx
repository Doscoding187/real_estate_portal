import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Home, Building2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { EntityStatusCard } from '@/components/dashboard/EntityStatusCard';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { AgentJourneyStatusErrorState } from '@/components/agent/AgentJourneyStatusErrorState';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { getAgentJourneyAction, isAgentProfileJourneyStep } from '@/lib/agentJourney';
import { calculateListingReadiness } from '@/lib/readiness';
import { cn } from '@/lib/utils';

type ListingTab = 'active' | 'pending' | 'draft' | 'sold' | 'archived';
type ListingStatusFilter = 'pending_review' | 'draft';

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
  } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ListingTab>(() => listingTabFromLocation(location));

  useEffect(() => {
    setActiveTab(listingTabFromLocation(location));
  }, [location]);

  // Map tabs to status for API
  const getListingStatusForTab = (tab: ListingTab): ListingStatusFilter => {
    return tab === 'pending' ? 'pending_review' : 'draft';
  };

  const isDraftOrPending = activeTab === 'draft' || activeTab === 'pending';
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
    title: listing.title,
    address: listing.address,
    city: listing.city,
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
    rejectionReasons: listing.rejectionReasons,
    rejectionNote: listing.rejectionNote,
    readiness: calculateListingReadiness(listing),
    views: 0,
    enquiries: 0,
  });

  const normalizeAgentListing = (listing: AgentListing) => ({
    ...listing,
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
      listing.city?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const listingAccessLocked = !statusLoading && !status?.entitlements?.canPublishListings;
  const journeyAction = getAgentJourneyAction(status);
  const needsProfileCompletion = isAgentProfileJourneyStep(status);
  const startListing = () => {
    if (statusLoading || journeyAction.waiting) return;
    setLocation(listingAccessLocked ? journeyAction.href : '/listings/create');
  };

  return (
    <AgentAppShell>
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200/80 bg-white/92 px-6 backdrop-blur-xl transition-all duration-300">
        <div className="flex-1">
          <h1 className={agentPageStyles.title}>My Listings</h1>
        </div>
        <div className="flex items-center gap-3">
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

            {/* Controls */}
            <div
              className={cn(
                agentPageStyles.controls,
                'flex flex-col items-center justify-between gap-4 sm:flex-row',
              )}
            >
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search listings..."
                  className="rounded-full border-slate-200 bg-[#f7f6f3] pl-10"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={value => setActiveTab(value as ListingTab)}
              className="w-full"
            >
              <TabsList
                className={cn(agentPageStyles.tabsList, 'mb-6 grid w-full max-w-3xl grid-cols-5')}
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
                <TabsTrigger value="sold" className={agentPageStyles.tabTrigger}>
                  Sold
                </TabsTrigger>
                <TabsTrigger value="archived" className={agentPageStyles.tabTrigger}>
                  Archived
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value={activeTab}
                className="space-y-6 animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
              >
                {listingAccessLocked && !isDraftOrPending ? (
                  <AgentFeatureLockedState
                    title={
                      needsProfileCompletion
                        ? 'Complete your profile before listing'
                        : journeyAction.title
                    }
                    description={
                      needsProfileCompletion
                        ? 'Complete the remaining professional profile details, then activate Launch Access to publish and manage inventory.'
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
                  <div className="flex flex-col gap-4">
                    {filteredListings?.map(listing => (
                      <EntityStatusCard
                        key={listing.id}
                        type="listing"
                        data={listing}
                        readiness={listing.readiness}
                        onEdit={id => setLocation(`/listings/create?id=${id}&edit=true`)}
                        onDelete={id => handleDelete(id)}
                        onView={id => setLocation(`/property/${id}`)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </AgentAppShell>
  );
}
