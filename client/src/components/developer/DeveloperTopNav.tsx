import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Building2, Settings, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';

export function DeveloperTopNav() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 px-3 shadow-soft transition-all duration-200 sm:px-6">
      {/* Left: Quick Actions */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              aria-label="Quick Action"
              className="bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white shadow-soft hover:shadow-hover rounded-xl transition-all duration-200"
            >
              <Plus className="mr-0 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Quick Action</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-hover">
            <DropdownMenuItem onClick={() => setLocation('/developer/create-development')}>
              <Building2 className="h-4 w-4 mr-2" />
              Create Development
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocation('/developer/analytics')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: Profile */}
      <div className="flex items-center gap-2">
        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-xl px-1 transition-colors hover:bg-gray-100 sm:px-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 to-blue-800 flex items-center justify-center text-white font-semibold text-sm shadow-soft">
                {user?.name?.substring(0, 2).toUpperCase() || 'DE'}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">
                {user?.name || 'Developer'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-hover">
            <div className="p-3 border-b border-gray-100">
              <p className="text-sm font-semibold">{user?.name || 'Developer'}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => setLocation('/developer/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/developer/analytics')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
