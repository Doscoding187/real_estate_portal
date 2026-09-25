import { Link, useLocation } from 'wouter';
import { useServiceProviderOnboardingStatus } from '@/hooks/useServiceProviderOnboardingStatus';

const PRO_NAV_ITEMS = [
  { href: '/service/dashboard', label: 'Requests' },
  { href: '/service/profile', label: 'Profile' },
];

export function ProNavigation() {
  const [location] = useLocation();
  const { status } = useServiceProviderOnboardingStatus();
  const visibleItems = PRO_NAV_ITEMS.filter(
    item => item.href !== '/service/dashboard' || status?.dashboardUnlocked,
  );

  return (
    <nav className="flex flex-wrap gap-2 rounded-[1.25rem] border border-[#0f3d91]/10 bg-white/90 p-2 shadow-sm">
      {visibleItems.map(item => {
        const isActive = location === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#0f3d91] text-white'
                : 'text-slate-700 hover:bg-[#eef4ff] hover:text-[#0f3d91]'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
