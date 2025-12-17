import React from 'react';
import { useLocation } from 'wouter';
import {
  LayoutDashboard,
  Building2,
  Users,
  Home,
  CreditCard,
  BarChart3,
  MessageSquare,
  FileText,
  Settings,
  Shield,
  TrendingUp,
  BarChart,
  Megaphone,
  Handshake,
  Code,
  User,
  Star,
  DollarSign,
  CheckCircle,
} from 'lucide-react';

const SidebarNavigation: React.FC = () => {
  const [location, setLocation] = useLocation();

  const navigationGroups = [
    {
      title: 'DASHBOARD',
      items: [{ name: 'Overview', path: '/admin/overview', icon: LayoutDashboard }],
    },
    {
      title: 'REVENUE & ANALYTICS',
      items: [
        { name: 'Revenue Center', path: '/admin/revenue', icon: TrendingUp },
        { name: 'Location Monetization', path: '/admin/monetization', icon: DollarSign },
        { name: 'Marketing Campaigns', path: '/admin/marketing', icon: Megaphone },
        { name: 'Partner Network', path: '/admin/partners', icon: Handshake },
      ],
    },
    {
      title: 'ECOSYSTEM MANAGEMENT',
      items: [
        { name: 'Agencies', path: '/admin/agencies', icon: Building2 },
        { name: 'Agents', path: '/admin/agents', icon: Users },
        { name: 'Agent Approvals', path: '/admin/agent-approvals', icon: CheckCircle },
        { name: 'Developers', path: '/admin/developers', icon: Code },
        { name: 'End Users', path: '/admin/end-users', icon: User },
        { name: 'Property Listings', path: '/admin/properties', icon: Home },
        { name: 'Listing Approvals', path: '/admin/listing-approvals', icon: CheckCircle },
        { name: 'Development Approvals', path: '/admin/development-approvals', icon: CheckCircle },
        { name: 'Featured Placements', path: '/admin/placements', icon: Star },
      ],
    },
    {
      title: 'PLATFORM MANAGEMENT',
      items: [
        {
          name: 'Subscription Management',
          path: '/admin/subscriptions',
          icon: CreditCard,
        },
        { name: 'Plan Editor', path: '/admin/plan-editor', icon: FileText },
        { name: 'Platform Analytics', path: '/admin/analytics', icon: BarChart3 },
        { name: 'Financial Tracking', path: '/admin/financials', icon: DollarSign },
        { name: 'Content Manager', path: '/admin/content', icon: FileText },
        {
          name: 'Communications',
          path: '/admin/communications',
          icon: MessageSquare,
        },
        { name: 'User & Role Management', path: '/admin/users', icon: Users },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Settings & Integrations', path: '/admin/settings', icon: Settings },
        { name: 'System & Security', path: '/admin/system', icon: Shield },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-xl border-r border-white/40 w-full">
      <div className="flex-1 overflow-y-auto pt-6 pb-6">
        <div className="flex flex-col px-6">
          {navigationGroups.map(group => (
            <div key={group.title} className="mb-6">
              <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="mt-2 space-y-1">
                {group.items.map(item => {
                  const isActive = location === item.path;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setLocation(item.path)}
                      className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 w-full text-left ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                      }`}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SidebarNavigation;
