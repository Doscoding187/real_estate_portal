import {
  Home,
  Building2,
  Users,
  BarChart3,
  DollarSign,
  Megaphone,
  Calendar,
  GraduationCap,
  Settings,
  Plus,
  Eye,
  TrendingUp,
  Share2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { ShareProfileModal } from './ShareProfileModal';
import { useState } from 'react';

const navigation = [
  { name: 'Overview', href: '/agent/dashboard', icon: Home },
  { name: 'Listings', href: '/agent/listings', icon: Building2 },
  { name: 'Leads & CRM', href: '/agent/leads', icon: Users },
  { name: 'Marketing Hub', href: '/agent/marketing', icon: Megaphone },
  { name: 'Earnings', href: '/agent/earnings', icon: DollarSign },
  { name: 'Analytics', href: '/agent/analytics', icon: BarChart3 },
  { name: 'Productivity', href: '/agent/productivity', icon: Calendar },
  { name: 'Training & Support', href: '/agent/training', icon: GraduationCap },
  { name: 'Settings', href: '/agent/settings', icon: Settings },
];

const quickActions = [
  { name: 'Add New Listing', icon: Plus, variant: 'default' as const },
  { name: 'Upload to Explore', icon: Upload, variant: 'secondary' as const },
  { name: 'View Leads', icon: Eye, variant: 'secondary' as const },
  { name: 'Promote Listing', icon: TrendingUp, variant: 'secondary' as const },
  { name: 'Share Profile', icon: Share2, variant: 'secondary' as const },
];

export function AgentSidebar() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // TODO: Get actual agent ID from backend
  const agentId = 2; // Replace with actual agent ID from user context

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AG';

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-100 shadow-soft z-20">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-gray-100">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-soft flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="ml-3 text-lg font-semibold text-gray-900">Agent Portal</span>
        </div>

        {/* Quick Actions */}
        <div className="px-4 pt-6 pb-4">
          <h3 className="px-2 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {quickActions.map(action => (
              <Button
                key={action.name}
                variant={action.variant}
                className={cn(
                  'w-full justify-start h-auto py-2.5 px-4 rounded-xl transition-all duration-200',
                  action.variant === 'default'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-soft hover:shadow-hover text-white'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-700 hover:text-blue-600 shadow-sm',
                )}
                size="sm"
                onClick={() => {
                  if (action.name === 'Add New Listing') {
                    setLocation('/listings/create');
                  } else if (action.name === 'Upload to Explore') {
                    setLocation('/explore/upload');
                  } else if (action.name === 'View Leads') {
                    setLocation('/agent/leads');
                  } else if (action.name === 'Promote Listing') {
                    setLocation('/agent/marketing');
                  } else if (action.name === 'Share Profile') {
                    setIsShareModalOpen(true);
                  }
                }}
              >
                <action.icon
                  className={cn(
                    'mr-2.5 h-4 w-4 flex-shrink-0',
                    action.variant === 'secondary' && 'text-blue-500',
                  )}
                />
                <span className="text-sm font-medium">{action.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          <h3 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4">
            Menu
          </h3>
          {navigation.map(item => (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group',
                window.location.pathname === item.href
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600',
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200',
                  window.location.pathname === item.href
                    ? 'text-blue-600'
                    : 'text-gray-400 group-hover:text-blue-500',
                )}
              />
              {item.name}
            </a>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center p-3 rounded-xl hover:bg-white transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-soft">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform duration-200">
                <span className="text-sm font-semibold text-white">{initials}</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                {user?.name || 'Agent'}
              </p>
              <p className="text-xs text-gray-500">Real Estate Agent</p>
            </div>
            <Settings className="ml-auto h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Share Profile Modal */}
      <ShareProfileModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        agentId={agentId}
        agentName={user?.name || 'Agent'}
      />
    </aside>
  );
}
