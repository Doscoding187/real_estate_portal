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
    tone: 'bg-primary text-primary-foreground border-transparent hover:opacity-95',
    iconTone: 'bg-primary-foreground/12 text-primary-foreground',
  },
  {
    name: 'Upload Explore',
    detail: 'Publish content',
    href: '/explore/upload',
    icon: Upload,
    tone: 'bg-card text-card-foreground border-border hover:bg-accent',
    iconTone: 'bg-secondary text-primary',
  },
  {
    name: 'Share Profile',
    detail: 'Send public profile',
    href: 'share-profile',
    icon: Share2,
    tone: 'bg-card text-card-foreground border-border hover:bg-accent',
    iconTone: 'bg-secondary text-primary',
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
          'px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground',
          mobile && 'tracking-[0.16em]',
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
                'group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors',
                mobile && 'gap-2.5 rounded-[18px] px-3 py-2.5 text-[13px]',
                isActive
                  ? 'border-sidebar-border bg-background/90 text-sidebar-foreground shadow-sm'
                  : 'border-transparent text-muted-foreground hover:border-sidebar-border/80 hover:bg-background/70 hover:text-sidebar-foreground',
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                  isActive
                    ? 'border-sidebar-border bg-primary/10 text-primary'
                    : 'border-sidebar-border/70 bg-card/80 text-muted-foreground group-hover:border-sidebar-border group-hover:bg-background/90 group-hover:text-sidebar-foreground',
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
        'flex h-full flex-col overflow-hidden border-r border-sidebar-border text-sidebar-foreground shadow-[0_20px_50px_-38px_rgba(15,23,42,0.18)]',
        'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-sidebar)_92%,white)_0%,color-mix(in_srgb,var(--color-accent)_4%,var(--color-sidebar))_100%)]',
        mobile
          ? 'w-full'
          : 'hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[272px] lg:flex-shrink-0',
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn('border-b border-sidebar-border px-5 py-5', mobile && 'px-5 py-4')}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-sidebar-foreground">
                Agent OS
              </p>
              <p className="text-xs text-muted-foreground">{currentSection}</p>
            </div>
          </div>
        </div>

        <div className={cn('space-y-5 px-4 py-5', mobile && 'space-y-4 px-4 py-4')}>
          <div className="rounded-[22px] border border-sidebar-border/80 bg-card/90 p-3.5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-card-foreground">
                  {user?.name || 'Agent'}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {user?.email || 'Agent workspace'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-border/70 bg-background/80 px-2.5 py-2">
              <span className="text-[11px] font-medium text-muted-foreground">Role</span>
              <Badge className="border-border bg-background text-foreground hover:bg-background">
                Agent
              </Badge>
            </div>
          </div>

          <div className={cn('space-y-3', mobile && 'space-y-2')}>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Quick actions
            </p>
            <div className={cn('space-y-2', mobile && 'space-y-1.5')}>
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
                    'flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left shadow-sm transition-colors',
                    mobile && 'gap-2.5 rounded-[18px] px-3 py-2.5',
                    action.tone,
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl',
                      action.iconTone,
                    )}
                  >
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold">{action.name}</p>
                    <p className="text-[11px] opacity-80">{action.detail}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <nav className={cn('flex-1 space-y-5 overflow-y-auto px-4 pb-5', mobile && 'space-y-4')}>
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
