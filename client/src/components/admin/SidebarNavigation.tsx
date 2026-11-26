import React from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { ADMIN_VISIBLE_NAV_GROUPS, getAdminNavItemForPath } from '@/pages/admin/adminRouteRegistry';
import { useAdminQueueCounts } from '@/pages/admin/dashboard/useAdminQueueCounts';

const SidebarNavigation: React.FC = () => {
  const [location, setLocation] = useLocation();
  const counts = useAdminQueueCounts();
  const activePath = getAdminNavItemForPath(location);

  return (
    <nav
      aria-label="Admin navigation"
      className="flex flex-col h-full bg-white border-r border-slate-200 w-full px-3 py-4 gap-1"
    >
      {ADMIN_VISIBLE_NAV_GROUPS.map(group => (
        <div key={group.id} className="flex flex-col gap-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
            {group.title}
          </div>
          {group.items.map(item => {
            const isActive = activePath === item.path;
            const count = item.badge ? counts[item.badge] : undefined;
            return (
              <button
                key={item.label}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setLocation(item.path)}
                className={cn(
                  'flex items-center gap-3 w-full min-h-[40px] px-3 rounded-md text-sm text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                  isActive
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                <item.icon
                  aria-hidden="true"
                  className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-blue-700' : 'text-slate-500')}
                />
                <span className="truncate">{item.label}</span>
                {count && count > 0 ? (
                  <span
                    aria-label={`${count} waiting`}
                    className="ml-auto min-w-[22px] h-[22px] px-1.5 rounded-full bg-orange-500 text-white text-xs font-bold inline-flex items-center justify-center"
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
};

export default SidebarNavigation;
