import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CircleHelp,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Megaphone,
  Settings,
  Share2,
  Users,
} from 'lucide-react';

type SidebarProps = {
  mode?: 'desktop' | 'sheet';
};

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: number;
};

const OPERATE_LINKS = [
  { label: 'Overview', href: '/agent/dashboard', icon: Home },
  { label: 'Listings', href: '/agent/listings', icon: Building2 },
  { label: 'Leads & CRM', href: '/agent/leads', icon: Users },
  { label: 'Calendar', href: '/agent/productivity', icon: CalendarDays },
] as const;

const GROW_LINKS = [
  { label: 'Analytics', href: '/agent/analytics', icon: BarChart3 },
  { label: 'Earnings', href: '/agent/earnings', icon: DollarSign },
  { label: 'Referrals', href: '/agent/referrals', icon: Share2 },
  { label: 'Marketing Hub', href: '/agent/marketing', icon: Megaphone },
] as const;

const MANAGE_LINKS = [
  { label: 'Reports', href: '/agent/analytics', icon: FileText },
  { label: 'Settings', href: '/agent/settings', icon: Settings },
  { label: 'Help Center', href: '/agent/training', icon: CircleHelp },
] as const;

export function AgentSidebar({ mode = 'desktop' }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const { data: stats } = trpc.agent.getDashboardStats.useQuery(undefined, {
    enabled: user?.role === 'agent',
    retry: false,
  });

  const { data: pipelineData } = trpc.agent.getLeadsPipeline.useQuery(
    { filters: {} },
    {
      enabled: user?.role === 'agent',
      retry: false,
    },
  );

  const activeLeadCount = useMemo(() => {
    if (!pipelineData) return 0;
    return (
      pipelineData.new.length +
      pipelineData.contacted.length +
      pipelineData.viewing.length +
      pipelineData.offer.length
    );
  }, [pipelineData]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AG';

  const currentPath = location.split('?')[0];

  const operateLinks: NavItem[] = [
    {
      ...OPERATE_LINKS[0],
    },
    {
      ...OPERATE_LINKS[1],
      badge: stats?.activeListings || undefined,
    },
    {
      ...OPERATE_LINKS[2],
      badge: activeLeadCount || undefined,
    },
    {
      ...OPERATE_LINKS[3],
    },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <aside
      className={cn(
        'relative overflow-hidden border-r border-slate-200 bg-white',
        mode === 'desktop'
          ? 'hidden lg:fixed lg:inset-y-0 lg:z-20 lg:flex lg:w-[232px] lg:flex-col'
          : 'flex h-full w-[232px] flex-col',
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,92,168,0.07),transparent_34%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => setLocation('/agent/settings')}
            className="w-full rounded-[10px] border border-[color:color-mix(in_oklab,var(--primary)_20%,white)] bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] px-[14px] py-[14px] text-left transition hover:bg-[color:color-mix(in_oklab,var(--primary)_10%,white)]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#5a9bd6] to-[var(--primary)] text-[13px] font-semibold text-white shadow-[0_10px_28px_rgba(0,92,168,0.24)]">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold leading-[1.25] text-slate-900">
                  {user?.name || 'Agent'}
                </p>
                <p className="truncate text-[10.5px] text-slate-500">
                  {user?.email || 'No email on file'}
                </p>
              </div>
            </div>
            <span className="mt-[9px] inline-flex rounded-[4px] bg-[var(--primary)] px-[9px] py-[2.5px] text-[9.5px] font-bold uppercase tracking-[0.14em] text-white">
              Real Estate Agent
            </span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-[10px]">
          <SidebarSection
            title="Operate"
            items={operateLinks}
            currentPath={currentPath}
            onNavigate={setLocation}
          />
          <SidebarSection
            title="Grow"
            items={GROW_LINKS}
            currentPath={currentPath}
            onNavigate={setLocation}
            className="mt-3"
          />
        </nav>

        <div className="relative z-10 border-t border-slate-200 px-4 py-[14px]">
          <p className="px-2 pb-[6px] text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Manage
          </p>
          <div className="space-y-1">
            {MANAGE_LINKS.map(item => (
              <button
                key={item.label}
                type="button"
                onClick={() => setLocation(item.href)}
                className="flex w-full items-center gap-3 rounded-[10px] px-[10px] py-2 text-[12.5px] text-slate-500 transition hover:bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] hover:text-slate-900"
              >
                <item.icon className="h-[15px] w-[15px]" />
                <span>{item.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-3 rounded-[10px] px-[10px] py-2 text-[12.5px] text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-[15px] w-[15px]" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarSection({
  title,
  items,
  currentPath,
  onNavigate,
  className,
}: {
  title: string;
  items: ReadonlyArray<NavItem>;
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="px-3 pb-[6px] text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <div className="space-y-1">
        {items.map(item => {
          const isActive = currentPath === item.href;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.href)}
              className={cn(
                'flex w-full items-center gap-[11px] rounded-[10px] border px-[10px] py-[9.5px] text-left text-[13px] transition',
                isActive
                  ? 'border-[color:color-mix(in_oklab,var(--primary)_20%,white)] bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] font-semibold text-[var(--primary)]'
                  : 'border-transparent text-slate-500 hover:bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] hover:text-slate-900',
              )}
            >
              <item.icon
                className={cn('h-4 w-4', isActive ? 'text-[var(--primary)]' : 'text-slate-400')}
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="flex h-[18px] min-w-[20px] items-center justify-center rounded-full bg-[var(--primary)] px-[5px] text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
