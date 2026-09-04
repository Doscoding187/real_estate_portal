import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  AlertTriangle,
  Map,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { path: '/founder', label: 'Cockpit', icon: LayoutDashboard },
  { path: '/founder/attention', label: 'Founder Attention', icon: AlertTriangle },
  { path: '/founder/company-map', label: 'Company Map', icon: Map },
  { path: '/founder/today', label: 'Today', icon: CalendarCheck },
] as const;

export function FounderSidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col border-r border-slate-200 bg-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-slate-100">
        {!collapsed && (
          <span className="text-sm font-semibold text-slate-800 truncate">
            Founder Command Centre
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive =
            location === item.path ||
            (item.path !== '/founder' && location.startsWith(item.path));

          return (
            <Link key={item.path} href={item.path}>
              <a
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-3 py-3">
        {!collapsed && (
          <p className="text-[10px] text-slate-400 text-center leading-tight">
            Property Listify OS v0.1
          </p>
        )}
      </div>
    </aside>
  );
}
