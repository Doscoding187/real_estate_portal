import {
  BarChart3,
  Building2,
  Calendar,
  DollarSign,
  GraduationCap,
  Home,
  Megaphone,
  Plus,
  Settings,
  Share2,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { ShareProfileModal } from './ShareProfileModal';
import { useMemo, useState } from 'react';

const primaryNavigation = [
  { name: 'Overview', href: '/agent/dashboard', icon: Home },
  { name: 'Listings', href: '/agent/listings', icon: Building2 },
  { name: 'Leads & CRM', href: '/agent/leads', icon: Users },
  { name: 'Calendar', href: '/agent/calendar', icon: Calendar },
  { name: 'Analytics', href: '/agent/analytics', icon: BarChart3 },
  { name: 'Earnings', href: '/agent/earnings', icon: DollarSign },
];

const secondaryNavigation = [
  { name: 'Referrals', href: '/agent/referrals', icon: Share2 },
  { name: 'Marketing Hub', href: '/agent/marketing', icon: Megaphone },
  { name: 'Training & Support', href: '/agent/training', icon: GraduationCap },
  { name: 'Settings', href: '/agent/settings', icon: Settings },
];

const quickActions = [
  {
    name: 'Add Listing',
    detail: 'Create new inventory',
    href: '/listings/create',
    icon: Plus,
    tone: 'bg-[linear-gradient(135deg,#082f49_0%,#0f766e_100%)] text-white border-transparent',
  },
  {
    name: 'Upload Explore',
    detail: 'Publish content',
    href: '/explore/upload',
    icon: Upload,
    tone: 'bg-white text-slate-800 border-slate-200',
  },
  {
    name: 'Share Profile',
    detail: 'Send public profile',
    href: 'share-profile',
    icon: Share2,
    tone: 'bg-white text-slate-800 border-slate-200',
  },
];

interface AgentSidebarProps {
  mobile?: boolean;
}

export function AgentSidebar({ mobile = false }: AgentSidebarProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const agentId = 2;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AG';

  const currentSection = useMemo(() => {
    if (location.startsWith('/agent/leads')) return 'Pipeline day';
    if (location.startsWith('/agent/calendar')) return 'Schedule control';
    if (location.startsWith('/agent/listings')) return 'Inventory in motion';
    if (location.startsWith('/agent/analytics')) return 'Operating insight';
    return 'Agent OS workspace';
  }, [location]);

  const renderNavGroup = (
    items: Array<{ name: string; href: string; icon: React.ElementType }>,
    label: string,
  ) => (
    <div className={cn('space-y-2', mobile && 'space-y-1.5')}>
      <p
        className={cn(
          'px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400',
          mobile && 'px-2 text-[10px] tracking-[0.18em]',
        )}
      >
        {label}
      </p>
      <div className={cn('space-y-1', mobile && 'space-y-0.5')}>
        {items.map(item => {
          const isActive =
            location === item.href ||
            (item.href !== '/agent/dashboard' && location.startsWith(item.href));

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => setLocation(item.href)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all',
                mobile && 'gap-2.5 rounded-[18px] px-3 py-2.5 text-[13px]',
                isActive
                  ? 'bg-white text-slate-950 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.65)]'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors',
                  mobile && 'h-9 w-9 rounded-xl',
                  isActive
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : 'border-white/10 bg-white/5 text-slate-400 group-hover:border-white/20 group-hover:text-slate-200',
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate">{item.name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside
      className={cn(
        'flex h-full flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#0f172a_0%,#111827_38%,#082f49_100%)] text-white shadow-[0_30px_80px_-48px_rgba(15,23,42,0.9)]',
        mobile ? 'w-full' : 'hidden lg:flex lg:fixed lg:inset-y-0 lg:w-[288px] lg:z-20',
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn('border-b border-white/10 px-6 py-6', mobile && 'px-5 py-4')}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#10b981_0%,#38bdf8_100%)] text-slate-950 shadow-[0_16px_35px_-22px_rgba(56,189,248,0.85)]',
                mobile && 'h-11 w-11 rounded-[18px]',
              )}
            >
              <Sparkles className={cn('h-5 w-5', mobile && 'h-4.5 w-4.5')} />
            </div>
            <div>
              <p className={cn('text-lg font-semibold tracking-tight', mobile && 'text-base')}>
                Agent OS
              </p>
              <p className={cn('text-sm text-slate-300', mobile && 'text-xs')}>{currentSection}</p>
            </div>
          </div>
        </div>

        <div className={cn('space-y-6 px-5 py-6', mobile && 'space-y-4 px-4 py-4')}>
          <div
            className={cn(
              'rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm',
              mobile && 'rounded-[22px] p-3.5',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white',
                  mobile && 'h-10 w-10 rounded-xl text-xs',
                )}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user?.name || 'Agent'}</p>
                <p className="truncate text-xs text-slate-300">
                  {user?.email || 'Agent workspace'}
                </p>
              </div>
            </div>
            <div
              className={cn(
                'mt-4 flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2',
                mobile && 'mt-3 rounded-xl px-2.5 py-2',
              )}
            >
              <span className="text-xs font-medium text-slate-300">Role</span>
              <Badge className="border-white/10 bg-white/10 text-white hover:bg-white/10">
                Agent
              </Badge>
            </div>
          </div>

          <div className={cn('space-y-3', mobile && 'space-y-2')}>
            <p
              className={cn(
                'px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400',
                mobile && 'px-2 text-[10px] tracking-[0.18em]',
              )}
            >
              Quick actions
            </p>
            <div className={cn('space-y-2', mobile && 'grid grid-cols-1 gap-2 space-y-0')}>
              {quickActions.map(action => (
                <button
                  key={action.name}
                  type="button"
                  onClick={() => {
                    if (action.href === 'share-profile') {
                      setIsShareModalOpen(true);
                    } else {
                      setLocation(action.href);
                    }
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm',
                    mobile && 'gap-2.5 rounded-[18px] px-3 py-2.5',
                    action.tone,
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-2xl bg-black/10',
                      mobile && 'h-9 w-9 rounded-xl',
                    )}
                  >
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', mobile && 'text-[13px]')}>
                      {action.name}
                    </p>
                    <p className={cn('text-xs opacity-80', mobile && 'text-[11px]')}>
                      {action.detail}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <nav
          className={cn(
            'flex-1 space-y-6 overflow-y-auto px-5 pb-6',
            mobile && 'space-y-4 px-4 pb-5',
          )}
        >
          {renderNavGroup(primaryNavigation, 'Operate')}
          {renderNavGroup(secondaryNavigation, 'Extend')}
        </nav>
      </div>

      <ShareProfileModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        agentId={agentId}
        agentName={user?.name || 'Agent'}
      />
    </aside>
  );
}
