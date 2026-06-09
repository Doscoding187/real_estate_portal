import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  Building2,
  CircleHelp,
  Compass,
  DollarSign,
  FilePlus2,
  Home,
  LogOut,
  Send,
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

export const WORKSPACE_LINKS: ReadonlyArray<Omit<NavItem, 'badge'>> = [
  { label: 'Overview', href: '/distribution/partner/overview', icon: Home },
  { label: 'Developments', href: '/distribution/partner/developments', icon: Building2 },
  { label: 'Accelerator', href: '/distribution/partner/accelerator', icon: Compass },
  { label: 'Submit Referral', href: '/distribution/partner/submit', icon: FilePlus2 },
  { label: 'My Referrals', href: '/distribution/partner/referrals', icon: Send },
  { label: 'Rewards', href: '/distribution/partner/commissions', icon: DollarSign },
];

const REFERRAL_ALIASES = new Set(['/referrer/dashboard', '/distribution/partner']);

function normalizeCurrentPath(path: string): string {
  if (REFERRAL_ALIASES.has(path)) return '/distribution/partner/overview';
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
  const { data: commissionRows } = trpc.distribution.referrer.myCommissionEntries.useQuery(
    { limit: 200 },
    {
      enabled: Boolean(user),
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
  const networkCount = Number(statusData?.accessCount || 0);
  const pendingCommissionCount = (commissionRows || []).filter((row: any) => {
    const status = String(row?.entryStatus || '').toLowerCase();
    return status === 'pending' || status === 'approved';
  }).length;

  const workspaceLinks: NavItem[] = WORKSPACE_LINKS.map(item => {
    if (item.href === '/distribution/partner/referrals') {
      return { ...item, badge: liveReferralCount || undefined };
    }
    if (item.href === '/distribution/partner/developments') {
      return { ...item, badge: networkCount || undefined };
    }
    if (item.href === '/distribution/partner/commissions') {
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
        'border-r border-border bg-white',
        mode === 'desktop'
          ? 'hidden lg:fixed lg:inset-y-0 lg:z-20 lg:flex lg:w-[210px] lg:flex-col'
          : 'flex h-full w-[210px] flex-col',
      )}
    >
      <div className="border-b border-border px-[18px] pb-[18px] pt-5">
        <p className="text-[14px] font-semibold tracking-[-0.02em] text-foreground">Property Listify</p>
        <p className="mt-0.5 font-mono text-[10px] tracking-[0.06em] text-muted-foreground">
          PARTNER WORKSPACE
        </p>
      </div>

      <p className="px-[18px] pb-[5px] pt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Workspace
      </p>

      <nav className="space-y-0.5 px-0">
        {workspaceLinks.map(item => {
          const isActive = currentPath === item.href;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setLocation(item.href)}
              className={cn(
                'group flex w-full items-center gap-[10px] border-l-2 px-[18px] py-[9px] text-left text-[13px] font-medium transition',
                isActive
                  ? 'border-l-primary bg-primary/10 text-primary'
                  : 'border-l-transparent text-muted-foreground hover:bg-surface hover:text-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'h-[15px] w-[15px] shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border px-[18px] py-[14px]">
        <div className="flex items-center gap-[10px]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-foreground">
              {user?.name || 'Referral Partner'}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">Partner Workspace</p>
          </div>
        </div>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => setLocation('/distribution-network/apply')}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-surface"
          >
            <CircleHelp className="h-3 w-3" />
            Help
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-surface"
          >
            <LogOut className="h-3 w-3" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
