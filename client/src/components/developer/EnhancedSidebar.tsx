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
  FileEdit,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
      },
      {
        id: 'developments',
        label: 'Developments',
        icon: Building2,
      },
      {
        id: 'drafts',
        label: 'My Drafts',
        icon: FileEdit,
      },
      {
        id: 'leads',
        label: 'Leads',
        icon: Users,
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
      },
      {
        id: 'tasks',
        label: 'Tasks',
        icon: CheckSquare,
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: FileText,
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
      },
      {
        id: 'explore',
        label: 'Explore Analytics',
        icon: Video,
      },
      {
        id: 'campaigns',
        label: 'Campaigns',
        icon: Megaphone,
      },
      {
        id: 'performance',
        label: 'Performance',
        icon: Target,
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
      },
      {
        id: 'subscription',
        label: 'Subscription',
        icon: BarChart3,
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
      },
    ],
  },
];

interface EnhancedSidebarProps {
  className?: string;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function EnhancedSidebar({ className, activeTab, onTabChange }: EnhancedSidebarProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Fetch developer profile
  const { data: developerProfile } = trpc.developer.getProfile.useQuery();

  // Fetch unread notifications count
  const { data: notificationsData } = trpc.developer.getUnreadNotificationsCount.useQuery(
    undefined,
    {
      refetchInterval: 30000,
      retry: false,
      onError: () => {
        console.log('Notification count temporarily unavailable');
      },
    }
  );

  const unreadCount = notificationsData?.count || 0;
  const developerName = developerProfile?.name || 'Developer';
  const developerInitials = developerName.substring(0, 2).toUpperCase();

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
        'flex flex-col h-full bg-white border-r border-gray-100',
        'w-64 transition-all duration-300 shadow-soft',
        className
      )}
    >
      {/* Logo/Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-soft">
          <span className="text-white font-bold text-sm">{developerInitials}</span>
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">{developerName}</h1>
          <p className="text-xs text-gray-500">Mission Control</p>
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
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left',
                          'group relative',
                          isActive
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 font-medium shadow-soft'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        {/* Active Indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full shadow-soft" />
                        )}

                        <Icon
                          className={cn(
                            'w-5 h-5 transition-colors',
                            isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Notifications Bell (Fixed at bottom) */}
      <div className="border-t border-gray-100 p-4">
        <button
          onClick={() => onTabChange('notifications')}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left',
            'hover:bg-gray-50 relative',
            activeTab === 'notifications'
              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 font-medium shadow-soft'
              : 'text-gray-700'
          )}
        >
          <Bell className="w-5 h-5" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-soft" />
          )}
        </button>
      </div>
    </aside>
  );
}
