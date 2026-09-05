import { useAuth } from '@/_core/hooks/useAuth';
import { LogOut, Menu } from 'lucide-react';

export function FounderTopBar({
  onOpenMobileNav,
}: {
  onOpenMobileNav?: () => void;
}) {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 truncate text-base font-semibold text-slate-800">
          Property Listify — Founder Command Centre
        </h1>
        <span className="hidden sm:inline text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
          v0.1
        </span>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
              {user.name?.charAt(0)?.toUpperCase() ?? 'F'}
            </div>
            <span className="hidden sm:inline">{user.name}</span>
          </div>
        )}
        <button
          onClick={() => logout()}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
