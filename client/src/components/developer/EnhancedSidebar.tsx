/**
 * Enhanced Sidebar Component for Mission Control Dashboard
 * Features: Collapsible sections, notification badges, active state highlighting
 * Requirements: 1.1, 1.2, 1.3
 */

import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageSquare,
  CheckSquare,
  TrendingUp,
  Target,
  Megaphone,
  Settings,
  ChevronDown,
  ChevronRight,
  Bell,
  BarChart3,
  FileText,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

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
        path: '/developer',
      },
      {
        id: 'developments',
        label: 'Developments',
        icon: Building2,
        path: '/developer/developments',
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
    id: 'operations',
    label: 'OPERATIONS',
    collapsible: true,
    items: [
      {
        id: 'messages',
        label: 'Messages',
        icon: MessageSquare,
        path: '/developer/messages',
      },
      {
        id: 'tasks',
        label: 'Tasks',
        icon: CheckSquare,
        path: '/developer/tasks',
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: FileText,
        path: '/developer/reports',
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
      {
        id: 'campaigns',
        label: 'Campaigns',
        icon: Megaphone,
        path: '/developer/campaigns',
      },
      {
        id: 'performance',
        label: 'Performance',
        icon: Target,
        path: '/developer/performance',
      },
    ],
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    items: [
      {
        id: 'team',
        label: 'Team',
        icon: UserPlus,
        path: '/developer/settings/team',
      },
      {
        id: 'subscription',
        label: 'Subscription',
        icon: BarChart3,
        path: '/developer/settings/subscription',
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
  const [location] = useLocation();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Fetch unread notifications count
  const { data: notificationsData } = trpc.developer.getUnreadNotificationsCount.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const unreadCount = notificationsData?.count || 0;

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const isActive = (path: string) => {
    if (path === '/developer') {
      return location === path;
    }
    return location.startsWith(path);
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

  // Add notification badge to Messages
  const sectionsWithBadges = MENU_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.id === 'messages' && unreadCount > 0) {
        return { ...item, badge: unreadCount, badgeColor: 'blue' as const };
      }
      return item;
    }),
  }));

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r border-gray-200',
        'w-64 transition-all duration-300',
        className
      )}
    >
      {/* Logo/Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Mission Control</h1>
          <p className="text-xs text-gray-500">Developer Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {sectionsWithBadges.map((section) => {
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
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.label}
                  </h3>
                )}
              </div>

              {/* Menu Items */}
              {!isCollapsed && (
                <div className="space-y-1 px-3">
                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;

                    return (
                      <Link key={item.id} href={item.path}>
                        <a
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                            'group relative',
                            active
                              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 font-medium'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          {/* Active Indicator */}
                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full" />
                          )}

                          <Icon
                            className={cn(
                              'w-5 h-5 transition-colors',
                              active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                            )}
                          />
                          <span className="flex-1">{item.label}</span>

                          {/* Badge */}
                          {item.badge && item.badge > 0 && (
                            <span
                              className={cn(
                                'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold text-white',
                                getBadgeColor(item.badgeColor),
                                'animate-pulse'
                              )}
                            >
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </a>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Notifications Bell (Fixed at bottom) */}
      <div className="border-t border-gray-200 p-4">
        <Link href="/developer/notifications">
          <a
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
              'hover:bg-gray-50 relative',
              isActive('/developer/notifications')
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 font-medium'
                : 'text-gray-700'
            )}
          >
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </a>
        </Link>
      </div>
    </aside>
  );
}
