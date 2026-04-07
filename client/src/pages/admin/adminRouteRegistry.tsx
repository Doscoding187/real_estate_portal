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
  TrendingUp,
  User,
  Users,
} from 'lucide-react';

const OverviewPage = lazy(() => import('./OverviewPage'));
const EcosystemOverviewPage = lazy(() => import('./EcosystemOverviewPage'));
const AgenciesPage = lazy(() => import('./AgenciesPage'));
const UsersPage = lazy(() => import('./UsersPage'));
const DevelopersPage = lazy(() => import('./DevelopersPage'));
const PropertiesPage = lazy(() => import('./PropertiesPage'));
const RevenueCenterPage = lazy(() => import('./RevenueCenterPage'));
const LocationMonetizationPage = lazy(() => import('./LocationMonetizationPage'));
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
const DistributionNetworkPage = lazy(() => import('./DistributionNetworkPage'));
const SuperAdminPublisher = lazy(() => import('./publisher/SuperAdminPublisher'));
const PlanEditor = lazy(() => import('./PlanEditor'));
const PlatformSettings = lazy(() => import('./PlatformSettings'));
const AuditLogs = lazy(() => import('./AuditLogs'));
const CreateAgency = lazy(() => import('./CreateAgency'));
const ComingSoonModule = lazy(() => import('./ComingSoonModule'));
const LovableIntegrationHub = lazy(() => import('../LovableIntegrationHub'));

export type AdminNavGroupId = 'core' | 'ecosystem' | 'revenue' | 'insights' | 'system';

export type AdminNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
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
  adminDashboardAlias: { path: '/admin/dashboard', render: () => <Redirect to="/admin/overview" /> },

  overview: { path: '/admin/overview', render: () => <OverviewPage /> },
  ecosystem: { path: '/admin/ecosystem', render: () => <EcosystemOverviewPage /> },

  agenciesNew: { path: '/admin/agencies/new', render: () => <CreateAgency /> },
  agenciesCreate: { path: '/admin/agencies/create', render: () => <CreateAgency /> },
  agencies: { path: '/admin/agencies', render: () => <AgenciesPage /> },

  agents: { path: '/admin/agents', render: () => <UsersPage initialRole="agent" /> },
  users: { path: '/admin/users', render: () => <UsersPage /> },
  developers: { path: '/admin/developers', render: () => <DevelopersPage /> },

  properties: { path: '/admin/properties', render: () => <PropertiesPage /> },
  revenue: { path: '/admin/revenue', render: () => <RevenueCenterPage /> },
  monetization: { path: '/admin/monetization', render: () => <LocationMonetizationPage /> },
  subscriptions: { path: '/admin/subscriptions', render: () => <SubscriptionManagementPage /> },
  subscriptionManagementAlias: {
    path: '/admin/subscription-management',
    render: () => <Redirect to="/admin/subscriptions" />,
  },
  planEditor: { path: '/admin/plan-editor', render: () => <PlanEditor /> },
  revenueCenterAlias: { path: '/admin/revenue-center', render: () => <Redirect to="/admin/revenue" /> },

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
  distribution: { path: '/admin/distribution', render: () => <DistributionNetworkPage /> },
  distributionSubmodule: {
    path: '/admin/distribution/:submodule',
    render: () => <DistributionNetworkPage />,
  },
  publisher: { path: '/admin/publisher', render: () => <SuperAdminPublisher /> },

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
  ROUTES.monetization,
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
  ROUTES.distribution,
  ROUTES.distributionSubmodule,
  ROUTES.publisher,
];

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'core',
    title: 'CORE OPERATIONS',
    icon: Layers,
    items: [
      { label: 'Dashboard', path: ROUTES.overview.path, icon: LayoutDashboard },
      { label: 'Listings', path: ROUTES.properties.path, icon: Home },
      { label: 'Developments', path: ROUTES.developmentApprovals.path, icon: Building2 },
      { label: 'Approvals', path: ROUTES.approvals.path, icon: CheckCircle },
    ],
  },
  {
    id: 'ecosystem',
    title: 'ECOSYSTEM',
    icon: Globe,
    items: [
      { label: 'Overview', path: ROUTES.ecosystem.path, icon: LayoutDashboard },
      { label: 'Agencies', path: ROUTES.agencies.path, icon: Building2 },
      { label: 'Agents', path: ROUTES.agents.path, icon: Users },
      { label: 'Developers', path: ROUTES.developers.path, icon: Code },
      { label: 'Publisher / Emulator', path: ROUTES.publisher.path, icon: Building2 },
      { label: 'End Users', path: ROUTES.users.path, icon: User },
    ],
  },
  {
    id: 'revenue',
    title: 'REVENUE & GROWTH',
    icon: TrendingUp,
    items: [
      { label: 'Revenue Center', path: ROUTES.revenue.path, icon: DollarSign },
      { label: 'Subscriptions', path: ROUTES.subscriptions.path, icon: CreditCard },
      { label: 'Featured Placements', path: ROUTES.marketing.path, icon: Star },
      { label: 'Location Monetization', path: ROUTES.monetization.path, icon: DollarSign },
      { label: 'Partner Network', path: ROUTES.partners.path, icon: Handshake },
      {
        label: 'Distribution Network',
        path: ROUTES.distribution.path,
        icon: Briefcase,
      },
    ],
  },
  {
    id: 'insights',
    title: 'INSIGHTS',
    icon: Activity,
    items: [
      { label: 'Platform Analytics', path: ROUTES.analytics.path, icon: BarChart3 },
      { label: 'Discovery Ops', path: ROUTES.discoveryOps.path, icon: Activity },
      { label: 'Agent OS Readiness', path: ROUTES.agentOsReadiness.path, icon: CheckCircle },
      { label: 'Inventory Boundary', path: ROUTES.inventoryBoundary.path, icon: Layers },
      { label: 'Financial Tracking', path: ROUTES.revenue.path, icon: FileText },
    ],
  },
  {
    id: 'system',
    title: 'SYSTEM',
    icon: Settings,
    items: [
      { label: 'User & Role Management', path: ROUTES.users.path, icon: Users },
      { label: 'Content Manager', path: ROUTES.content.path, icon: FileText },
      { label: 'Communications', path: ROUTES.communications.path, icon: MessageSquare },
      { label: 'Settings & Integrations', path: ROUTES.settings.path, icon: Settings },
      { label: 'System & Security', path: ROUTES.system.path, icon: Shield },
    ],
  },
];

const sidebarPathGroupPairs = ADMIN_NAV_GROUPS.flatMap(group =>
  group.items.map(item => ({ groupId: group.id, path: item.path })),
).sort((a, b) => b.path.length - a.path.length);

export const getAdminNavGroupForPath = (location: string): AdminNavGroupId => {
  for (const pair of sidebarPathGroupPairs) {
    if (location === pair.path) return pair.groupId;
    if (location.startsWith(`${pair.path}/`)) return pair.groupId;
  }

  if (location === '/admin') return 'core';
  return 'core';
};
