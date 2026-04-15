import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  Building2,
  CircleHelp,
  Compass,
  DollarSign,
  FilePlus2,
  Home,
  LogOut,
  Send,
  Settings,
} from 'lucide-react';

type ReferralSidebarProps = {
  mode?: 'desktop' | 'sheet';
};

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: number;
};

const WORKSPACE_LINKS: ReadonlyArray<Omit<NavItem, 'badge'>> = [
  { label: 'Overview', href: '/distribution/partner', icon: Home },
  { label: 'Developments', href: '/distribution/partner/developments', icon: Building2 },
  { label: 'Accelerator', href: '/distribution/partner/accelerator', icon: Compass },
  { label: 'Submit Referral', href: '/distribution/partner/submit', icon: FilePlus2 },
  { label: 'My Referrals', href: '/distribution/partner/referrals', icon: Send },
  { label: 'Commissions', href: '/distribution/partner/referrals', icon: DollarSign },
];

const MANAGE_LINKS: ReadonlyArray<Omit<NavItem, 'badge'>> = [
  { label: 'Network', href: '/distribution-network', icon: Briefcase },
  { label: 'Settings', href: '/distribution/partner', icon: Settings },
  { label: 'Help Center', href: '/distribution-network/apply', icon: CircleHelp },
];

const REFERRAL_ALIASES = new Set(['/referrer/dashboard']);

function normalizeCurrentPath(path: string): string {
  if (REFERRAL_ALIASES.has(path)) return '/distribution/partner';
  return path;
}

export function ReferralSidebar({ mode = 'desktop' }: ReferralSidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const { data: pipelineData } = trpc.distribution.referrer.myPipeline.useQuery(
    { limit: 200 },
    {
      enabled: Boolean(user),
      retry: false,
    },
  );

  const { data: statusData } = trpc.distribution.referrer.status.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const liveReferralCount = useMemo(() => {
    const stageCounts = (pipelineData?.stageCounts || {}) as Record<string, number>;
    const excluded = new Set(['commission_paid', 'cancelled']);
    return Object.entries(stageCounts).reduce((total, [stage, count]) => {
      if (excluded.has(stage)) return total;
      return total + Number(count || 0);
    }, 0);
  }, [pipelineData?.stageCounts]);

  const currentPath = normalizeCurrentPath(location.split('?')[0]);
  const networkCount = Number(statusData?.accessCount || 0);

  const workspaceLinks: NavItem[] = WORKSPACE_LINKS.map(item => {
    if (item.href === '/distribution/partner/referrals') {
      return { ...item, badge: liveReferralCount || undefined };
    }
    if (item.href === '/distribution/partner/developments') {
      return { ...item, badge: networkCount || undefined };
    }
    return item;
  });

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'RF';

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <aside
      className={cn(
        'relative overflow-hidden border-r border-slate-200 bg-white',
        mode === 'desktop'
          ? 'hidden lg:fixed lg:inset-y-0 lg:z-20 lg:flex lg:w-[244px] lg:flex-col'
          : 'flex h-full w-[244px] flex-col',
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.08),transparent_38%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => setLocation('/distribution/partner')}
            className="w-full rounded-[10px] border border-cyan-200 bg-cyan-50/70 px-[14px] py-[14px] text-left transition hover:bg-cyan-50"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-[13px] font-semibold text-white shadow-[0_10px_28px_rgba(8,145,178,0.28)]">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold leading-[1.25] text-slate-900">
                  {user?.name || 'Referral Partner'}
                </p>
                <p className="truncate text-[10.5px] text-slate-500">
                  {user?.email || 'No email on file'}
                </p>
              </div>
            </div>
            <span className="mt-[9px] inline-flex rounded-[4px] bg-cyan-600 px-[9px] py-[2.5px] text-[9.5px] font-bold uppercase tracking-[0.14em] text-white">
              Partner Workspace
            </span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-[10px]">
          <SidebarSection
            title="Workspace"
            items={workspaceLinks}
            currentPath={currentPath}
            onNavigate={setLocation}
          />
        </nav>

        <div className="relative z-10 border-t border-slate-200 px-4 py-[14px]">
          <SidebarSection
            title="Manage"
            items={MANAGE_LINKS}
            currentPath={currentPath}
            onNavigate={setLocation}
          />
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-2 flex w-full items-center gap-3 rounded-[10px] px-[10px] py-2 text-[12.5px] text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-[15px] w-[15px]" />
            <span>Logout</span>
          </button>
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
}: {
  title: string;
  items: ReadonlyArray<NavItem>;
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <div>
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
                  ? 'border-cyan-200 bg-cyan-50/70 font-semibold text-cyan-700'
                  : 'border-transparent text-slate-500 hover:bg-cyan-50/70 hover:text-slate-900',
              )}
            >
              <item.icon className={cn('h-4 w-4', isActive ? 'text-cyan-700' : 'text-slate-400')} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="flex h-[18px] min-w-[20px] items-center justify-center rounded-full bg-cyan-600 px-[5px] text-[10px] font-bold text-white">
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
