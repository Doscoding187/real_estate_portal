import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { NotificationCenter } from '@/components/agent/NotificationCenter';
import { ShareProfileModal } from '@/components/agent/ShareProfileModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Share2,
  Upload,
  User,
} from 'lucide-react';
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
    <>
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/96 backdrop-blur-xl lg:rounded-t-[28px]">
        <div className="content-rail flex w-full flex-col gap-3 py-3 sm:gap-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 pl-14 lg:pl-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[1.05rem] font-semibold tracking-tight text-foreground sm:text-[1.25rem]">
                  {sectionLabel}
                </h1>
                <span className="hidden rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm sm:inline-flex">
                  {new Date().toLocaleDateString('en-ZA', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 xl:flex">
                <div className="relative min-w-0 w-[300px] 2xl:w-[340px]">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search listings, leads, appointments..."
                    className="h-10 rounded-xl border-border bg-card pl-10 pr-4 text-sm shadow-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <Button
                  className="h-10 rounded-xl bg-primary px-3.5 text-primary-foreground shadow-sm hover:bg-primary/90"
                  onClick={() => setLocation('/listings/create')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Listing
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-border bg-card px-3.5 shadow-sm"
                  onClick={() => setLocation('/explore/upload')}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Explore
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-border bg-card px-3.5 shadow-sm"
                  onClick={() => setIsShareModalOpen(true)}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Profile
                </Button>
              </div>

              <div className="flex xl:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl border-border bg-card shadow-sm"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-2xl border-border bg-popover shadow-xl"
                  >
                    <DropdownMenuItem onClick={() => setLocation('/listings/create')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Listing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation('/explore/upload')}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Explore
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsShareModalOpen(true)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <NotificationCenter className="h-10 w-10 rounded-xl border border-border bg-card shadow-sm hover:bg-accent" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-2.5 shadow-sm hover:bg-accent sm:h-11 sm:gap-3 sm:px-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground sm:h-9 sm:w-9">
                      {initials}
                    </div>
                    <div className="hidden text-left md:block">
                      <p className="text-sm font-semibold text-foreground">
                        {user?.name || 'Agent'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Real Estate Agent</p>
                    </div>
                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 rounded-2xl border-border bg-popover shadow-xl"
                >
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-popover-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
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
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search listings, leads, appointments..."
                className="h-10 rounded-xl border-border bg-card pl-10 pr-4 text-sm shadow-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      <ShareProfileModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        agentId={2}
        agentName={user?.name || 'Agent'}
      />
    </>
  );
}
