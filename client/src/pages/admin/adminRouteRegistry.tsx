import { lazy, type ReactNode } from 'react';
import { Redirect } from 'wouter';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle,
  Code,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Handshake,
  Home,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  Star,
  User,
  Users,
} from 'lucide-react';

const OverviewPage = lazy(() => import('./OverviewPage'));
const EcosystemOverviewPage = lazy(() => import('./EcosystemOverviewPage'));
const AgencyList = lazy(() => import('./AgencyList'));
const UsersPage = lazy(() => import('./UsersPage'));
const DevelopersPage = lazy(() => import('./DevelopersPage'));
const PropertiesPage = lazy(() => import('./PropertiesPage'));
const RevenueCenterPage = lazy(() => import('./RevenueCenterPage'));
const SubscriptionManagementPage = lazy(() => import('./SubscriptionManagementPage'));
const MarketingCampaignsPage = lazy(() => import('./MarketingCampaignsPage'));
const CreateCampaignWizard = lazy(() => import('./CreateCampaignWizard'));
const CampaignDetailsPage = lazy(() => import('./CampaignDetailsPage'));
const CampaignInsights = lazy(() => import('./CampaignInsights'));
const AnalyticsPage = lazy(() => import('./AnalyticsPage'));
const DiscoveryOpsPage = lazy(() => import('./DiscoveryOpsPage'));
const AgentOsReadinessPage = lazy(() => import('./AgentOsReadinessPage'));
const AgentInventoryBoundaryPage = lazy(() => import('./AgentInventoryBoundaryPage'));
const UnifiedApprovalsPage = lazy(() => import('./UnifiedApprovalsPage'));
const ListingOversight = lazy(() => import('./ListingOversight'));
const AgentApprovals = lazy(() => import('./AgentApprovals'));
const DevelopmentOversight = lazy(() => import('./DevelopmentOversight'));
const PartnerNetworkPage = lazy(() => import('./PartnerNetworkPage'));
const ServicesReviewWorkspace = lazy(() => import('./ServicesReviewWorkspace'));
const DistributionNetworkPage = lazy(() => import('./DistributionNetworkPage'));
const SuperAdminPublisher = lazy(() => import('./publisher/SuperAdminPublisher'));
const PublisherDevelopmentWizard = lazy(() => import('./publisher/PublisherDevelopmentWizard'));
const PlanEditor = lazy(() => import('./PlanEditor'));
const PlatformSettings = lazy(() => import('./PlatformSettings'));
const AuditLogs = lazy(() => import('./AuditLogs'));
const CreateAgency = lazy(() => import('./CreateAgency'));
const ComingSoonModule = lazy(() => import('./ComingSoonModule'));
const LovableIntegrationHub = lazy(() => import('../LovableIntegrationHub'));

export type AdminNavGroupId = 'today' | 'catalogue' | 'people' | 'system' | 'hidden';

/** Which real queue feeds an item's count badge. */
export type AdminNavBadgeKey = 'payments' | 'approvals';

export type AdminNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Count badge fed by a real pending-work query. */
  badge?: AdminNavBadgeKey;
  /** Launch focus: hidden from the sidebar, route stays reachable by URL. Remove the flag to restore. */
  launchHidden?: boolean;
};

export type AdminNavGroup = {
  id: AdminNavGroupId;
  title: string;
  icon: LucideIcon;
  items: AdminNavItem[];
};

export type AdminDashboardRoute = {
  path: string;
  render: () => ReactNode;
};

const ROUTES = {
  adminRoot: { path: '/admin', render: () => <OverviewPage /> },
  adminDashboardAlias: {
    path: '/admin/dashboard',
    render: () => <Redirect to="/admin/overview" />,
  },

  overview: { path: '/admin/overview', render: () => <OverviewPage /> },
  ecosystem: { path: '/admin/ecosystem', render: () => <EcosystemOverviewPage /> },

  agenciesNew: { path: '/admin/agencies/new', render: () => <CreateAgency /> },
  agenciesCreate: { path: '/admin/agencies/create', render: () => <CreateAgency /> },
  agencies: { path: '/admin/agencies', render: () => <AgencyList /> },

  agents: { path: '/admin/agents', render: () => <UsersPage initialRole="agent" /> },
  users: { path: '/admin/users', render: () => <UsersPage /> },
  developers: { path: '/admin/developers', render: () => <DevelopersPage /> },

  properties: { path: '/admin/properties', render: () => <PropertiesPage /> },
  revenue: { path: '/admin/revenue', render: () => <RevenueCenterPage /> },
  finance: {
    path: '/admin/finance',
    render: () => <SubscriptionManagementPage initialTab="verification" />,
  },
  subscriptions: { path: '/admin/subscriptions', render: () => <SubscriptionManagementPage /> },
  subscriptionManagementAlias: {
    path: '/admin/subscription-management',
    render: () => <Redirect to="/admin/subscriptions" />,
  },
  planEditor: { path: '/admin/plan-editor', render: () => <PlanEditor /> },
  revenueCenterAlias: {
    path: '/admin/revenue-center',
    render: () => <Redirect to="/admin/revenue" />,
  },

  marketing: { path: '/admin/marketing', render: () => <MarketingCampaignsPage /> },
  marketingCreate: { path: '/admin/marketing/create', render: () => <CreateCampaignWizard /> },
  marketingCampaignInsights: {
    path: '/admin/marketing/campaign/:id',
    render: () => <CampaignInsights />,
  },
  marketingDetails: { path: '/admin/marketing/:id', render: () => <CampaignDetailsPage /> },

  analytics: { path: '/admin/analytics', render: () => <AnalyticsPage /> },
  discoveryOps: { path: '/admin/discovery-ops', render: () => <DiscoveryOpsPage /> },
  agentOsReadiness: { path: '/admin/agent-os-readiness', render: () => <AgentOsReadinessPage /> },
  inventoryBoundary: {
    path: '/admin/agent-inventory-boundary',
    render: () => <AgentInventoryBoundaryPage />,
  },

  lovableHub: { path: '/admin/lovable-hub', render: () => <LovableIntegrationHub /> },

  approvals: { path: '/admin/approvals', render: () => <UnifiedApprovalsPage /> },
  listingApprovals: { path: '/admin/listing-approvals', render: () => <ListingOversight /> },
  agentApprovals: { path: '/admin/agent-approvals', render: () => <AgentApprovals /> },
  developmentApprovals: {
    path: '/admin/development-approvals',
    render: () => <DevelopmentOversight />,
  },

  partners: { path: '/admin/partners', render: () => <PartnerNetworkPage /> },
  servicesReview: {
    path: '/admin/services-review',
    render: () => <ServicesReviewWorkspace />,
  },
  distribution: { path: '/admin/distribution', render: () => <DistributionNetworkPage /> },
  distributionSubmodule: {
    path: '/admin/distribution/:submodule',
    render: () => <DistributionNetworkPage />,
  },
  publisher: { path: '/admin/publisher', render: () => <SuperAdminPublisher /> },

  publisherDevelopmentWizard: {
    path: '/admin/publisher/developments/new',
    render: () => <PublisherDevelopmentWizard />,
  },

  content: {
    path: '/admin/content',
    render: () => <ComingSoonModule title="Content Manager" />,
  },
  communications: {
    path: '/admin/communications',
    render: () => <ComingSoonModule title="Communications" />,
  },
  settings: { path: '/admin/settings', render: () => <PlatformSettings /> },
  system: { path: '/admin/system', render: () => <AuditLogs /> },
} satisfies Record<string, AdminDashboardRoute>;

export const ADMIN_DASHBOARD_ROUTES: AdminDashboardRoute[] = [
  ROUTES.adminRoot,
  ROUTES.adminDashboardAlias,
  ROUTES.ecosystem,
  ROUTES.overview,
  ROUTES.agenciesNew,
  ROUTES.agenciesCreate,
  ROUTES.agencies,
  ROUTES.agents,
  ROUTES.users,
  ROUTES.content,
  ROUTES.communications,
  ROUTES.settings,
  ROUTES.system,
  ROUTES.developers,
  ROUTES.properties,
  ROUTES.revenue,
  ROUTES.revenueCenterAlias,
  ROUTES.finance,
  ROUTES.subscriptions,
  ROUTES.subscriptionManagementAlias,
  ROUTES.planEditor,
  ROUTES.marketingCreate,
  ROUTES.marketingCampaignInsights,
  ROUTES.marketingDetails,
  ROUTES.marketing,
  ROUTES.analytics,
  ROUTES.discoveryOps,
  ROUTES.agentOsReadiness,
  ROUTES.inventoryBoundary,
  ROUTES.lovableHub,
  ROUTES.approvals,
  ROUTES.listingApprovals,
  ROUTES.agentApprovals,
  ROUTES.developmentApprovals,
  ROUTES.partners,
  ROUTES.servicesReview,
  ROUTES.distribution,
  ROUTES.distributionSubmodule,
  ROUTES.publisher,
  ROUTES.publisherDevelopmentWizard,
];

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'today',
    title: 'TODAY',
    icon: Layers,
    items: [
      { label: 'Dashboard', path: ROUTES.overview.path, icon: LayoutDashboard },
      { label: 'Approvals', path: ROUTES.approvals.path, icon: CheckCircle, badge: 'approvals' },
      // Finance opens on the EFT verification tab; Subscriptions is a tab of the same page.
      { label: 'Finance', path: ROUTES.finance.path, icon: FileText, badge: 'payments' },
    ],
  },
  {
    id: 'catalogue',
    title: 'CATALOGUE',
    icon: Building2,
    items: [
      { label: 'Publisher', path: ROUTES.publisher.path, icon: Building2 },
      { label: 'Developments', path: ROUTES.developmentApprovals.path, icon: Building2 },
      { label: 'Listings', path: ROUTES.properties.path, icon: Home },
    ],
  },
  {
    id: 'people',
    title: 'PEOPLE',
    icon: Globe,
    items: [
      { label: 'Users', path: ROUTES.users.path, icon: User },
      { label: 'Agents', path: ROUTES.agents.path, icon: Users },
      { label: 'Agencies', path: ROUTES.agencies.path, icon: Building2 },
      { label: 'Developers', path: ROUTES.developers.path, icon: Code },
      // Leads: the platform-custody enquiry queue lives on the Ecosystem overview page.
      { label: 'Leads', path: ROUTES.ecosystem.path, icon: MessageSquare },
    ],
  },
  {
    id: 'system',
    title: 'SYSTEM',
    icon: Settings,
    items: [
      { label: 'Settings & Integrations', path: ROUTES.settings.path, icon: Settings },
      { label: 'System & Security', path: ROUTES.system.path, icon: Shield },
    ],
  },
  {
    id: 'hidden',
    title: 'HIDDEN FOR LAUNCH',
    icon: Activity,
    items: [
      { label: 'Subscriptions', path: ROUTES.subscriptions.path, icon: CreditCard, launchHidden: true },
      { label: 'Revenue Center', path: ROUTES.revenue.path, icon: DollarSign, launchHidden: true },
      { label: 'Featured Placements', path: ROUTES.marketing.path, icon: Star, launchHidden: true },
      { label: 'Partner Network', path: ROUTES.partners.path, icon: Handshake, launchHidden: true },
      {
        label: 'Distribution Network',
        path: ROUTES.distribution.path,
        icon: Briefcase,
        launchHidden: true,
      },
      { label: 'Platform Analytics', path: ROUTES.analytics.path, icon: BarChart3, launchHidden: true },
      { label: 'Discovery Ops', path: ROUTES.discoveryOps.path, icon: Activity, launchHidden: true },
      {
        label: 'Agent OS Readiness',
        path: ROUTES.agentOsReadiness.path,
        icon: CheckCircle,
        launchHidden: true,
      },
      {
        label: 'Inventory Boundary',
        path: ROUTES.inventoryBoundary.path,
        icon: Layers,
        launchHidden: true,
      },
      { label: 'Content Manager', path: ROUTES.content.path, icon: FileText, launchHidden: true },
      {
        label: 'Communications',
        path: ROUTES.communications.path,
        icon: MessageSquare,
        launchHidden: true,
      },
    ],
  },
];

/** Sidebar groups for the launch: hidden items and emptied groups removed. */
export const ADMIN_VISIBLE_NAV_GROUPS: AdminNavGroup[] = ADMIN_NAV_GROUPS.map(group => ({
  ...group,
  items: group.items.filter(item => !item.launchHidden),
})).filter(group => group.items.length > 0);

const sidebarPathGroupPairs = ADMIN_NAV_GROUPS.flatMap(group =>
  group.items.map(item => ({ groupId: group.id, path: item.path })),
).sort((a, b) => b.path.length - a.path.length);

export const getAdminNavGroupForPath = (location: string): AdminNavGroupId => {
  for (const pair of sidebarPathGroupPairs) {
    if (location === pair.path) return pair.groupId;
    if (location.startsWith(`${pair.path}/`)) return pair.groupId;
  }

  return 'today';
};

/** Review and dedicated approval routes belong to the Approvals navigation item. */
export function getAdminNavItemForPath(location: string): string | undefined {
  const pathname = location.split('?')[0];
  if (
    ['/admin/listing-approvals', '/admin/agent-approvals', '/admin/services-review'].includes(
      pathname,
    ) ||
    pathname.startsWith('/admin/review/')
  )
    return ROUTES.approvals.path;
  if (pathname === ROUTES.subscriptions.path || pathname === ROUTES.planEditor.path)
    return ROUTES.finance.path;
  if (pathname === '/admin' || pathname === '/admin/dashboard') return ROUTES.overview.path;
  return sidebarPathGroupPairs.find(
    pair => pathname === pair.path || pathname.startsWith(`${pair.path}/`),
  )?.path;
}
