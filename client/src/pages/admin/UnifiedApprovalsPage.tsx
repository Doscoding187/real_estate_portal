import { useLocation, useSearch } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AgentApprovals from './AgentApprovals';
import ListingOversight from './ListingOversight';
import DevelopmentOversight from './DevelopmentOversight';
import LandReviewWorkspace from './LandReviewWorkspace';
import { isLandVerticalAvailable } from '@shared/landLaunchPolicy';
import { CheckCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const CountPill = ({ count }: { count: number | undefined }) =>
  count && count > 0 ? (
    <span className="ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-bold inline-flex items-center justify-center">
      {count}
    </span>
  ) : null;

const UnifiedApprovalsPage = () => {
  const [, setLocation] = useLocation();
  const requestedTab = new URLSearchParams(useSearch()).get('tab');
  // Land is hidden entirely (tab, count, deep link) while the Land gate is off.
  const landOn = isLandVerticalAvailable();
  const activeTab =
    requestedTab === 'agents' ||
    requestedTab === 'developments' ||
    (requestedTab === 'land' && landOn)
      ? requestedTab
      : 'listings';
  // Same counts as the sidebar badge, so the tab and the badge always agree.
  const { data: counts } = trpc.admin.getAdminActionItems.useQuery(undefined, {
    refetchInterval: 30000,
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-7 w-7 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
          <p className="text-sm text-slate-600">
            Agents, listings and developments waiting for a decision.
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={tab => setLocation(`/admin/approvals?tab=${tab}`)}
        className="w-full"
      >
        <TabsList className={`grid w-full max-w-3xl ${landOn ? 'grid-cols-4' : 'grid-cols-3 max-w-2xl'}`}>
          <TabsTrigger value="agents" aria-label="Agent Approvals">
            Agent Approvals
            <CountPill count={counts?.pendingAgentApprovals} />
          </TabsTrigger>
          <TabsTrigger value="listings" aria-label="Listing Approvals">
            Listing Approvals
            <CountPill count={counts?.pendingListingApprovals} />
          </TabsTrigger>
          <TabsTrigger value="developments" aria-label="Development Approvals">
            Development Approvals
            <CountPill count={counts?.pendingDevelopmentApprovals} />
          </TabsTrigger>
          {landOn && (
            <TabsTrigger value="land" aria-label="Land Approvals">
              Land Approvals
              <CountPill count={counts?.pendingLandApprovals} />
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="agents" className="mt-6">
          <AgentApprovals />
        </TabsContent>
        <TabsContent value="listings" className="mt-6">
          <ListingOversight />
        </TabsContent>
        <TabsContent value="developments" className="mt-6">
          <DevelopmentOversight />
        </TabsContent>
        {landOn && (
          <TabsContent value="land" className="mt-6">
            <LandReviewWorkspace embedded />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default UnifiedApprovalsPage;
