import { X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { NAV_GROUPS } from '../workspace/constants';
import type { WorkspaceId } from '../workspace/types';
import { getInitials } from '../workspace/utils';

export function AgencySidebar({
  agencyName,
  location,
  activeWorkspace,
  onNavigate,
  mobileOpen,
  onMobileOpenChange,
}: {
  agencyName: string;
  location: string;
  activeWorkspace: WorkspaceId;
  onNavigate: (workspace: WorkspaceId) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const body = (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 rounded-lg">
            <AvatarFallback className="rounded-lg bg-white text-sm font-semibold text-slate-950">
              {getInitials(agencyName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{agencyName}</p>
            <p className="truncate text-xs text-slate-400">{location || 'Agency workspace'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {NAV_GROUPS.map(group => (
          <div key={group.title}>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = item.id === activeWorkspace;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition',
                      active
                        ? 'bg-white text-slate-950'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-900 lg:block">
        {body}
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            aria-label="Close agency navigation"
            onClick={() => onMobileOpenChange(false)}
          />
          <div className="relative h-full w-80 max-w-[86vw] shadow-2xl">
            <button
              type="button"
              onClick={() => onMobileOpenChange(false)}
              className="absolute right-3 top-3 z-10 rounded-md bg-white/10 p-2 text-white"
              aria-label="Close agency navigation"
            >
              <X className="h-5 w-5" />
            </button>
            {body}
          </div>
        </div>
      ) : null}
    </>
  );
}
