import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  AlertTriangle,
  Map,
  CalendarCheck,
  Target,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { path: '/founder', label: 'Cockpit', icon: LayoutDashboard },
  { path: '/founder/attention', label: 'Founder Attention', icon: AlertTriangle },
  { path: '/founder/company-map', label: 'Company Map', icon: Map },
  { path: '/founder/today', label: 'Today', icon: CalendarCheck },
  { path: '/founder/strategy', label: 'Strategy', icon: Target },
] as const;

function SidebarBody({
  collapsed,
  onToggleCollapse,
  onClose,
  isMobile,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}) {
  const [location] = useLocation();

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-slate-100">
        {!collapsed && (
          <span className="text-sm font-semibold text-slate-800 truncate">
            Founder Command Centre
          </span>
        )}
        {isMobile ? (
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="ml-auto p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
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
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  collapsed && !isMobile && 'justify-center px-0',
                )}
                title={collapsed && !isMobile ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {(!collapsed || isMobile) && <span>{item.label}</span>}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-3 py-3">
        {(!collapsed || isMobile) && (
          <p className="text-[10px] text-slate-400 text-center leading-tight">
            Property Listify OS v0.1
          </p>
        )}
      </div>
    </div>
  );
}

export function FounderSidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Desktop sidebar — hidden below lg, visible lg+
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'h-screen sticky top-0 hidden lg:flex flex-col border-r border-slate-200 bg-white transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <SidebarBody
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            aria-label="Close navigation"
            onClick={onMobileClose}
          />
          {/* Drawer panel */}
          <div className="relative z-10 h-full w-72 max-w-[85vw] shadow-2xl">
            <SidebarBody
              collapsed={false}
              onClose={onMobileClose}
              isMobile
            />
          </div>
        </div>
      )}
    </>
  );
}
