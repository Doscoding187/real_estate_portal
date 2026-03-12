import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { NotificationCenter } from '@/components/agent/NotificationCenter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, LogOut, Plus, Search, Settings, Sparkles, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AgentTopNav() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AG';

  const sectionLabel = location.startsWith('/agent/leads')
    ? 'Leads & CRM'
    : location.startsWith('/agent/listings')
      ? 'Listings'
      : location.startsWith('/agent/calendar')
        ? 'Calendar'
        : location.startsWith('/agent/analytics')
          ? 'Analytics'
          : 'Overview';

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-[rgba(247,248,243,0.88)] px-4 py-4 backdrop-blur-xl sm:px-6 xl:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 lg:gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 pl-14 lg:pl-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Agent OS
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                {sectionLabel}
              </h1>
              <span className="hidden rounded-full bg-white px-3 py-1 text-sm text-slate-500 shadow-sm sm:inline-flex">
                {new Date().toLocaleDateString('en-ZA', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Button
              className="hidden rounded-2xl bg-[linear-gradient(135deg,#082f49_0%,#0f766e_100%)] px-4 text-white hover:opacity-95 md:inline-flex"
              onClick={() => setLocation('/listings/create')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Listing
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-2xl border-slate-200 bg-white shadow-sm xl:hidden"
              onClick={() => setLocation('/agent/leads')}
            >
              <Search className="h-4 w-4" />
            </Button>

            <NotificationCenter className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm hover:bg-slate-50 sm:gap-3 sm:px-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e_0%,#38bdf8_100%)] text-sm font-semibold text-white">
                    {initials}
                  </div>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-semibold text-slate-950">{user?.name || 'Agent'}</p>
                    <p className="text-xs text-slate-500">Real Estate Agent</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 rounded-2xl border-slate-200 bg-white shadow-xl"
              >
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-950">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation('/agent/settings')}>
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/agent/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="xl:hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search listings, leads, appointments..."
              className="h-11 rounded-2xl border-slate-200 bg-white/90 pl-11 pr-4 shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="hidden min-w-0 max-w-xl flex-1 xl:block">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search listings, leads, appointments..."
              className="h-12 rounded-2xl border-slate-200 bg-white/90 pl-11 pr-4 shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
