import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileText,
  Headphones,
  Home,
  LogOut,
  Search,
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
  { label: 'Overview', href: '/distribution/partner/overview', icon: Home },
  { label: 'Find opportunities', href: '/distribution/partner/developments', icon: Search },
  { label: 'My deals', href: '/distribution/partner/referrals', icon: FileText },
  { label: 'Referral payouts', href: '/distribution/partner/payouts', icon: CreditCard },
  { label: 'How it works', href: '/distribution/partner/how-it-works', icon: CircleHelp },
  { label: 'Help', href: '/help', icon: Headphones },
];

const REFERRAL_ALIASES = new Set(['/referrer/dashboard', '/distribution/partner']);

function normalizeCurrentPath(path: string): string {
  if (REFERRAL_ALIASES.has(path)) return '/distribution/partner/overview';
  return path;
}

export function ReferralSidebar({ mode = 'desktop' }: ReferralSidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const statusQuery = trpc.distribution.referrer.status.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const statusData = statusQuery.data;

  const { data: pipelineData } = trpc.distribution.referrer.myPipeline.useQuery(
    { limit: 200 },
    {
      enabled: Boolean(user && statusData?.hasIdentity),
      retry: false,
    },
  );

  const { data: commissionRows } = trpc.distribution.referrer.myCommissionEntries.useQuery(
    { limit: 200 },
    {
      enabled: Boolean(user && statusData?.hasIdentity),
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const liveReferralCount = useMemo(() => {
    const stageCounts = (pipelineData?.stageCounts || {}) as Record<string, number>;
    const excluded = new Set(['commission_paid', 'cancelled']);
    return Object.entries(stageCounts).reduce((total, [stage, count]) => {
      if (excluded.has(stage)) return total;
      return total + Number(count || 0);
    }, 0);
  }, [pipelineData?.stageCounts]);

  const currentPath = normalizeCurrentPath(location.split('?')[0]);
  const pendingCommissionCount = (commissionRows || []).filter((row: any) => {
    const status = String(row?.entryStatus || '').toLowerCase();
    return status === 'pending' || status === 'approved';
  }).length;

  const workspaceLinks: NavItem[] = WORKSPACE_LINKS.map(item => {
    if (item.href === '/distribution/partner/referrals') {
      return { ...item, badge: liveReferralCount || undefined };
    }
    if (item.href === '/distribution/partner/payouts') {
      return { ...item, badge: pendingCommissionCount || undefined };
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
        'bg-[#0b1c3f] text-white',
        mode === 'desktop'
          ? 'hidden lg:fixed lg:inset-y-0 lg:z-20 lg:flex lg:w-[260px] lg:flex-col'
          : 'flex h-full w-[260px] flex-col',
      )}
    >
      <div className="flex items-center gap-3 px-4 pb-5 pt-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1d6fe3]">
          <Home className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white">
            Property Listify
          </p>
          <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#8ba2cd]">
            Distribution network
          </p>
        </div>
      </div>

      <nav className="space-y-1 px-3">
        {workspaceLinks.map(item => {
          const isActive = currentPath === item.href;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setLocation(item.href)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3 py-[9px] text-left text-[13.5px] font-medium transition',
                isActive
                  ? 'bg-white text-[#0b1c3f] shadow-sm'
                  : 'text-[#c3d0e8] hover:bg-white/10 hover:text-white',
              )}
            >
              <item.icon
                className={cn(
                  'h-[16px] w-[16px] shrink-0',
                  isActive ? 'text-[#1d6fe3]' : 'text-[#8ba2cd] group-hover:text-white',
                )}
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-[#ff7a00] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-4 pt-6">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d6fe3]/25 text-[11px] font-semibold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">
              {user?.name || 'Referral Partner'}
            </p>
            <p className="truncate text-[11px] text-[#8ba2cd]">Distribution referrer</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#8ba2cd]" />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setLocation('/help')}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 px-2 py-1.5 text-[11px] font-medium text-[#c3d0e8] transition hover:bg-white/10 hover:text-white"
          >
            <CircleHelp className="h-3.5 w-3.5" />
            Help
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 px-2 py-1.5 text-[11px] font-medium text-[#c3d0e8] transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
