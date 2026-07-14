import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  HelpCircle,
  Home,
  LayoutDashboard,
  MapPinned,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  AgencyStats,
  CommissionStats,
  ConversionStats,
  Tone,
  WorkspaceId,
} from './types';

export const EMPTY_STATS: AgencyStats = {
  totalListings: 0,
  totalSales: 0,
  totalLeads: 0,
  totalAgents: 0,
  activeListings: 0,
  pendingListings: 0,
  recentLeads: 0,
  recentSales: 0,
};

export const EMPTY_CONVERSION: ConversionStats = {
  total: 0,
  converted: 0,
  conversionRate: 0,
  byStatus: [],
};

export const EMPTY_COMMISSION: CommissionStats = {
  totalEarnings: 0,
  paidCommissions: 0,
  pendingCommissions: 0,
  monthlyBreakdown: [],
};

export const WORKSPACE_TITLES: Record<
  WorkspaceId,
  { title: string; eyebrow: string; icon: LucideIcon }
> = {
  overview: { title: 'Overview', eyebrow: 'Command centre', icon: LayoutDashboard },
  attention: { title: 'Attention', eyebrow: 'Priority queue', icon: Bell },
  'my-day': { title: 'My Day', eyebrow: 'Calendar and operations', icon: CalendarDays },
  leads: { title: 'Leads', eyebrow: 'Pipeline and CRM', icon: MessageSquare },
  listings: { title: 'Listings', eyebrow: 'Inventory readiness', icon: Home },
  performance: { title: 'Listing Performance', eyebrow: 'Seller reporting', icon: BarChart3 },
  canvassing: { title: 'Canvassing', eyebrow: 'Seller acquisition', icon: MapPinned },
  viewings: { title: 'Viewings', eyebrow: 'Follow-through', icon: ClipboardCheck },
  transactions: { title: 'Transactions', eyebrow: 'Offers and deals', icon: BriefcaseBusiness },
  commission: { title: 'Commission', eyebrow: 'Commercial pipeline', icon: CircleDollarSign },
  team: { title: 'Team', eyebrow: 'People and workload', icon: Users },
  growth: { title: 'Growth', eyebrow: 'Demand and acquisition', icon: Sparkles },
  reporting: { title: 'Reporting', eyebrow: 'Performance analysis', icon: BarChart3 },
  compliance: { title: 'Compliance', eyebrow: 'Readiness controls', icon: ShieldCheck },
  billing: { title: 'Billing', eyebrow: 'Subscription status', icon: CreditCard },
  settings: { title: 'Settings', eyebrow: 'Workspace preferences', icon: Settings },
  help: { title: 'Help', eyebrow: 'Support', icon: HelpCircle },
};

export const NAV_GROUPS: Array<{
  title: string;
  items: Array<{ id: WorkspaceId; label: string; icon: LucideIcon }>;
}> = [
  {
    title: 'Command Centre',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'attention', label: 'Attention', icon: Bell },
      { id: 'my-day', label: 'My Day', icon: CalendarDays },
    ],
  },
  {
    title: 'Business Pipeline',
    items: [
      { id: 'leads', label: 'Leads', icon: MessageSquare },
      { id: 'viewings', label: 'Viewings', icon: ClipboardCheck },
      { id: 'transactions', label: 'Transactions', icon: BriefcaseBusiness },
      { id: 'commission', label: 'Commission', icon: CircleDollarSign },
    ],
  },
  {
    title: 'Inventory and Growth',
    items: [
      { id: 'listings', label: 'Listings', icon: Home },
      { id: 'performance', label: 'Listing Performance', icon: BarChart3 },
      { id: 'canvassing', label: 'Canvassing', icon: MapPinned },
      { id: 'growth', label: 'Growth', icon: Sparkles },
      { id: 'reporting', label: 'Reporting', icon: BarChart3 },
    ],
  },
  {
    title: 'Team and Operations',
    items: [
      { id: 'team', label: 'Team', icon: Users },
      { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
      { id: 'billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    title: 'Utilities',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'help', label: 'Help', icon: HelpCircle },
    ],
  },
];

export const PIPELINE_STAGES = [
  { key: 'new', label: 'New', tone: 'sky' as Tone },
  { key: 'contacted', label: 'Contacted', tone: 'teal' as Tone },
  { key: 'qualified', label: 'Qualified', tone: 'emerald' as Tone },
  { key: 'viewing_scheduled', label: 'Viewing', tone: 'amber' as Tone },
  { key: 'offer_sent', label: 'Offer', tone: 'amber' as Tone },
  { key: 'converted', label: 'Won', tone: 'emerald' as Tone },
  { key: 'closed', label: 'Closed', tone: 'emerald' as Tone },
  { key: 'lost', label: 'Lost', tone: 'rose' as Tone },
];

export const DETAIL_WORKSPACES = new Set<WorkspaceId>([
  'attention',
  'my-day',
  'leads',
  'viewings',
  'transactions',
  'growth',
  'reporting',
]);

export function workspaceFromPath(path: string): WorkspaceId {
  const segment = path.split('?')[0].replace(/^\/agency\/?/, '').split('/')[0];
  if (!segment || segment === 'dashboard') return 'overview';
  if (segment === 'agents' || segment === 'invite') return 'team';
  if (segment === 'subscription') return 'billing';
  if (segment in WORKSPACE_TITLES) return segment as WorkspaceId;
  return 'overview';
}
