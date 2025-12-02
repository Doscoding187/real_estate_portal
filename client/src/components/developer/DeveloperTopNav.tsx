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

  const notificationCount = 3; // TODO: Get from backend
  const messageCount = 2; // TODO: Get from backend

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
              <DropdownMenuItem className="p-3 cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">New lead captured</p>
                  <p className="text-xs text-gray-500">John Doe submitted affordability form</p>
                  <p className="text-xs text-gray-400">2 minutes ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3 cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Unit sold</p>
                  <p className="text-xs text-gray-500">Unit 2B in Sunset Heights</p>
                  <p className="text-xs text-gray-400">1 hour ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3 cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Report ready</p>
                  <p className="text-xs text-gray-500">Monthly sales report generated</p>
                  <p className="text-xs text-gray-400">3 hours ago</p>
                </div>
              </DropdownMenuItem>
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
              <DropdownMenuItem className="p-3 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Sarah Johnson</p>
                    <p className="text-xs text-gray-500 truncate">Interested in 3 bedroom unit...</p>
                    <p className="text-xs text-gray-400">5 min ago</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Mike Chen</p>
                    <p className="text-xs text-gray-500 truncate">When is the next viewing?</p>
                    <p className="text-xs text-gray-400">1 hour ago</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span>
                </div>
              </DropdownMenuItem>
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
