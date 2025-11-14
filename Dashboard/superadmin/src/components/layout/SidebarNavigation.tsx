import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

const SidebarNavigation: React.FC = () => {
  const location = useLocation();

  const navigationGroups = [
    {
      title: 'DASHBOARD',
      items: [{ name: 'Overview', href: '/', icon: LayoutDashboard }],
    },
    {
      title: 'REVENUE & ANALYTICS',
      items: [
        { name: 'Revenue Center', href: '/revenue', icon: TrendingUp },
        { name: 'Analytics & Reports', href: '/analytics', icon: BarChart },
        { name: 'Marketing Campaigns', href: '/marketing', icon: Megaphone },
        { name: 'Partner Network', href: '/partners', icon: Handshake },
        { name: 'Developers', href: '/developers', icon: Code },
      ],
    },
    {
      title: 'ECOSYSTEM MANAGEMENT',
      items: [
        { name: 'Agencies', href: '/agencies', icon: Building2 },
        { name: 'Agents', href: '/agents', icon: Users },
        { name: 'End Users', href: '/end-users', icon: User },
        { name: 'Property Listings', href: '/properties', icon: Home },
        { name: 'Featured Placements', href: '/placements', icon: Star },
      ],
    },
    {
      title: 'PLATFORM MANAGEMENT',
      items: [
        {
          name: 'Subscription Management',
          href: '/subscriptions',
          icon: CreditCard,
        },
        { name: 'Financial Tracking', href: '/financials', icon: BarChart3 },
        { name: 'Content Manager', href: '/content', icon: FileText },
        {
          name: 'Communications',
          href: '/communications',
          icon: MessageSquare,
        },
        { name: 'User & Role Management', href: '/users', icon: Users },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Settings & Integrations', href: '/settings', icon: Settings },
        { name: 'System & Security', href: '/system', icon: Shield },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-full">
      <div className="flex-1 overflow-y-auto pt-6 pb-6">
        <div className="flex flex-col px-6">
          {navigationGroups.map(group => (
            <div key={group.title} className="mb-6">
              <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="mt-2 space-y-1">
                {group.items.map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      <span className="truncate">{item.name}</span>
                    </Link>
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
