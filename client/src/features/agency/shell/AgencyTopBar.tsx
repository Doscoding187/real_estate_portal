import type { LucideIcon } from 'lucide-react';
import { ChevronDown, Home, Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkspaceId } from '../workspace/types';
import { greeting } from '../workspace/utils';

export function AgencyTopBar({
  workspace,
  workspaceMeta,
  principalName,
  setupComplete,
  onOpenMobileNav,
  onNavigate,
  setLocation,
}: {
  workspace: WorkspaceId;
  workspaceMeta: { title: string; eyebrow: string; icon: LucideIcon };
  principalName: string;
  setupComplete: boolean;
  onOpenMobileNav: () => void;
  onNavigate: (workspace: WorkspaceId) => void;
  setLocation: (path: string) => void;
}) {
  const Icon = workspaceMeta.icon;
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={onOpenMobileNav}
            aria-label="Open agency navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {workspaceMeta.eyebrow}
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-950">
              {workspace === 'overview' ? `${greeting()}, ${principalName}` : workspaceMeta.title}
            </h1>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700"
          >
            <span>30 days</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700"
          >
            <span>All branches</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          <Button variant="outline" className="border-slate-200" onClick={() => onNavigate('leads')}>
            <Plus className="h-4 w-4" />
            Add lead
          </Button>
          <Button
            className="bg-slate-950 text-white hover:bg-slate-800"
            disabled={!setupComplete}
            onClick={() => setLocation('/listings/create')}
          >
            <Home className="h-4 w-4" />
            Add listing
          </Button>
        </div>
      </div>
    </header>
  );
}
