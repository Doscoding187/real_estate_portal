// @ts-nocheck
/**
 * Enhanced Sidebar Component for Mission Control Dashboard
 * Features: Collapsible sections, notification badges, active state highlighting
 * Tab-based navigation (no page routing)
 */

import { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronRight,
  BarChart3,
  FileEdit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
  badgeColor?: 'blue' | 'green' | 'red' | 'yellow';
}

interface MenuSection {
  id: string;
  label: string;
  items: MenuItem[];
  collapsible?: boolean;
}

const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'main',
    label: 'MAIN',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        icon: LayoutDashboard,
        path: '/developer/dashboard',
      },
      {
        id: 'developments',
        label: 'Developments',
        icon: Building2,
        path: '/developer/developments',
      },
      {
        id: 'drafts',
        label: 'My Drafts',
        icon: FileEdit,
        path: '/developer/drafts',
      },
      {
        id: 'leads',
        label: 'Leads',
        icon: Users,
        path: '/developer/leads',
      },
    ],
  },
  {
    id: 'growth',
    label: 'GROWTH',
    collapsible: true,
    items: [
      {
        id: 'analytics',
        label: 'Analytics',
        icon: TrendingUp,
        path: '/developer/analytics',
      },
    ],
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    items: [
      {
        id: 'subscription',
        label: 'Subscription',
        icon: BarChart3,
        path: '/developer/subscription',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        path: '/developer/settings',
      },
    ],
  },
];

interface EnhancedSidebarProps {
  className?: string;
}

export function EnhancedSidebar({ className }: EnhancedSidebarProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Fetch developer profile - now works with brand emulation for super admins
  const { data: developerProfile } = trpc.developer.getProfile.useQuery(undefined, {
    retry: false,
  });

  // Live lead awareness belongs on the real operating surface. It is derived
  // from the canonical lead state, not a fake notification feed.
  const { data: newLeadCountData } = trpc.developer.getNewLeadCount.useQuery(undefined, {
    refetchInterval: 30000,
    retry: false,
  });

  const newLeadCount = newLeadCountData?.count || 0;
  const developerName = isSuperAdmin ? 'Super Admin' : developerProfile?.name || 'Developer';
  const developerInitials = developerName.substring(0, 2).toUpperCase();

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getBadgeColor = (color?: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500';
      case 'green':
        return 'bg-green-500';
      case 'red':
        return 'bg-red-500';
      case 'yellow':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  // Show the queue count where a developer can actually act on it.
  const sectionsWithBadges = MENU_SECTIONS.map(section => ({
    ...section,
    items: section.items.map(item => {
      if (item.id === 'leads' && newLeadCount > 0) {
        return { ...item, badge: newLeadCount, badgeColor: 'blue' as const };
      }
      return item;
    }),
  }));

  // Determine active item based on current URL location
  const isItemActive = (path: string) => {
    if (path === '/developer' || path === '/developer/dashboard') {
      // handle root path matching
      return location === '/developer' || location === '/developer/dashboard';
    }
    return location.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r border-gray-100',
        'w-64 transition-all duration-300 shadow-soft',
        className,
      )}
    >
      {/* Logo/Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-600 flex items-center justify-center shadow-soft">
          <span className="text-white font-bold text-sm">{developerInitials}</span>
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">{developerName}</p>
          <p className="text-xs text-gray-500">Mission Control</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {sectionsWithBadges.map(section => {
          const isCollapsed = collapsedSections.has(section.id);

          return (
            <div key={section.id} className="mb-6">
              {/* Section Header */}
              <div className="px-6 mb-2">
                {section.collapsible ? (
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                  >
                    <span>{section.label}</span>
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.label}
                  </p>
                )}
              </div>

              {/* Menu Items */}
              {!isCollapsed && (
                <div className="space-y-1 px-3">
                  {section.items.map(item => {
                    const isActive = isItemActive(item.path);
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setLocation(item.path)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left',
                          'group relative',
                          isActive
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 font-medium shadow-soft'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                        )}
                      >
                        {/* Active Indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full shadow-soft" />
                        )}

                        <Icon
                          className={cn(
                            'w-5 h-5 transition-colors',
                            isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600',
                          )}
                        />
                        <span className="flex-1">{item.label}</span>

                        {/* Badge */}
                        {item.badge && item.badge > 0 && (
                          <span
                            className={cn(
                              'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold text-white',
                              getBadgeColor(item.badgeColor),
                              'animate-pulse',
                            )}
                          >
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
