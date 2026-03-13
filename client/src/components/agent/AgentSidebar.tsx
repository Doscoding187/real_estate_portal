import {
  BarChart3,
  Building2,
  Calendar,
  DollarSign,
  GraduationCap,
  Home,
  Megaphone,
  Settings,
  Share2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';

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

interface AgentSidebarProps {
  mobile?: boolean;
}

export function AgentSidebar({ mobile = false }: AgentSidebarProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AG';

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
        'flex h-full flex-col overflow-hidden border-r border-sidebar-border text-sidebar-foreground shadow-[0_20px_50px_-38px_rgba(15,23,42,0.14)]',
        'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-sidebar)_94%,white)_0%,color-mix(in_srgb,var(--color-primary)_3%,var(--color-sidebar))_100%)]',
        mobile
          ? 'w-full'
          : 'hidden lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-[252px] lg:flex-shrink-0 lg:rounded-[28px] lg:border',
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn('border-b border-sidebar-border px-4 py-4.5', mobile && 'px-5 py-4')}>
          <div className="rounded-[22px] border border-sidebar-border/80 bg-card/92 p-3.5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
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
                Real Estate Agent
              </Badge>
            </div>
          </div>
        </div>

        <nav
          className={cn(
            'flex-1 space-y-5 overflow-y-auto px-4 py-4.5',
            mobile && 'space-y-4 px-4 py-4',
          )}
        >
          {renderNavGroup(primaryNavigation, 'Operate')}
          {renderNavGroup(secondaryNavigation, 'Extend')}
        </nav>
      </div>
    </aside>
  );
}
