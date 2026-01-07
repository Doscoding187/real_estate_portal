import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Bell,
  MessageSquare,
  User,
  Building2,
  Users,
  FileText,
  Settings,
  LogOut,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { cn } from '@/lib/utils';

export function DeveloperTopNav() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  const notificationCount = 0; // TODO: Get from backend
  const messageCount = 0; // TODO: Get from backend

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-xl px-6 shadow-soft transition-all duration-200">
      {/* Left: Quick Actions */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-soft hover:shadow-hover rounded-xl transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Quick Action
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-hover">
            <DropdownMenuItem onClick={() => setLocation('/developer/developments/new')}>
              <Building2 className="h-4 w-4 mr-2" />
              Create Development
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/developer/units/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/developer/leads/new')}>
              <Users className="h-4 w-4 mr-2" />
              Add Lead
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocation('/developer/reports')}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/developer/analytics')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-2xl mx-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search developments, leads, units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Right: Notifications, Messages, Profile */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                  {notificationCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl shadow-hover">
            <div className="p-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Notifications</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No new notifications</p>
              </div>
            </div>
            <div className="p-2 border-t border-gray-100">
              <Button
                variant="ghost"
                className="w-full text-sm rounded-lg"
                onClick={() => setLocation('/developer/notifications')}
              >
                View All Notifications
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Messages */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl hover:bg-gray-100 transition-colors"
            >
              <MessageSquare className="h-5 w-5 text-gray-600" />
              {messageCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-semibold text-white">
                  {messageCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl shadow-hover">
            <div className="p-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Messages</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No new messages</p>
              </div>
            </div>
            <div className="p-2 border-t border-gray-100">
              <Button
                variant="ghost"
                className="w-full text-sm rounded-lg"
                onClick={() => setLocation('/developer/messages')}
              >
                View All Messages
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-xl hover:bg-gray-100 transition-colors px-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-soft">
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
