import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Bell,
  MessageSquare,
  Plus,
  Upload,
  UserPlus,
  ChevronDown,
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function AgentTopNav() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AG';

  // Mock notifications (replace with real data)
  const notifications: any[] = [];
  const messages: any[] = [];

  const unreadNotifications = notifications.filter((n) => n.unread).length;
  const unreadMessages = messages.filter((m) => m.unread).length;

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

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
            <DropdownMenuItem onClick={() => setLocation('/listings/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Listing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/explore/upload')}>
              <Upload className="h-4 w-4 mr-2" />
              Upload to Explore
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/agent/leads?action=add')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add New Lead
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-2xl mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search listings, clients, content..."
            className="pl-10 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all duration-200 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-gray-50">
              <Bell className="h-5 w-5 text-gray-600" />
              {unreadNotifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs rounded-full">
                  {unreadNotifications}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 rounded-xl shadow-hover" align="end">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0',
                      notification.unread && 'bg-blue-50/30'
                    )}
                  >
                    <p className="text-sm text-gray-900 font-medium">{notification.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-gray-100">
              <Button
                variant="ghost"
                className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                onClick={() => setLocation('/agent/dashboard?tab=notifications')}
              >
                View All Notifications
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Messages */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-gray-50">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              {unreadMessages > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs rounded-full">
                  {unreadMessages}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 rounded-xl shadow-hover" align="end">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Messages</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No new messages</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0',
                      message.unread && 'bg-blue-50/30'
                    )}
                  >
                    <p className="text-sm text-gray-900 font-semibold">{message.from}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{message.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{message.time}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-gray-100">
              <Button
                variant="ghost"
                className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                onClick={() => setLocation('/agent/leads')}
              >
                View All Messages
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 rounded-xl hover:bg-gray-50 px-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-soft">
                <span className="text-xs font-semibold text-white">{initials}</span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900">{user?.name || 'Agent'}</p>
                <p className="text-xs text-gray-500">Real Estate Agent</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-hover">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => setLocation('/agent/settings')}>
              <User className="h-4 w-4 mr-2" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/agent/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
