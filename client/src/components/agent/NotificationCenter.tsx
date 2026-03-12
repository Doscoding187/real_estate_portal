import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  BellRing,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  Check,
  MoreHorizontal,
  Filter,
  Search,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Notification {
  id: number;
  type: 'lead_assigned' | 'offer_received' | 'showing_scheduled' | 'system_alert';
  title: string;
  content: string;
  isRead: number;
  createdAt: string;
  data?: string;
}

const NOTIFICATION_ICONS = {
  lead_assigned: Mail,
  offer_received: Phone,
  showing_scheduled: Calendar,
  system_alert: AlertTriangle,
};

const NOTIFICATION_COLORS = {
  lead_assigned: 'text-blue-600',
  offer_received: 'text-green-600',
  showing_scheduled: 'text-purple-600',
  system_alert: 'text-orange-600',
};

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [showAll, setShowAll] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const utils = trpc.useUtils();

  // Fetch notifications
  const { data: notifications, isLoading } = trpc.agent.getNotifications.useQuery(
    {
      limit: showAll ? 100 : 10,
      unreadOnly: !showAll,
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  );

  // Fetch unread count
  const { data: unreadCount } = trpc.agent.getUnreadNotificationCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // Mark as read mutation
  const markAsReadMutation = trpc.agent.markNotificationAsRead.useMutation({
    onSuccess: () => {
      utils.agent.getNotifications.invalidate();
      utils.agent.getUnreadNotificationCount.invalidate();
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = trpc.agent.markAllNotificationsAsRead.useMutation({
    onSuccess: () => {
      toast.success('All notifications marked as read');
      utils.agent.getNotifications.invalidate();
      utils.agent.getUnreadNotificationCount.invalidate();
    },
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const filteredNotifications =
    notifications?.filter(notification => {
      if (filterType && notification.type !== filterType) return false;
      if (
        searchQuery &&
        !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !notification.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    }) || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative ${className}`}>
          {(unreadCount?.count || 0) > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {(unreadCount?.count || 0) > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount?.count || 0}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[calc(100vw-2rem)] max-w-[24rem] rounded-[24px] border-slate-200 bg-white/98 p-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] sm:w-[24rem]"
      >
        <div className="border-b border-slate-100 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">Notifications</h3>
              <p className="text-xs text-slate-500">
                {unreadCount?.count || 0} unread items in your live queue
              </p>
            </div>
            {(unreadCount?.count || 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="rounded-xl text-slate-600"
              >
                <Check className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Mark all read</span>
              </Button>
            )}
          </div>

          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-sm"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl border-slate-200">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterType('')}>All Types</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('lead_assigned')}>
                  Lead Assigned
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('offer_received')}>
                  Offer Received
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('showing_scheduled')}>
                  Showing Scheduled
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('system_alert')}>
                  System Alert
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="max-h-[min(28rem,60vh)] overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No notifications found</div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="w-full rounded-xl text-slate-600"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : 'View All'}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const IconComponent = NOTIFICATION_ICONS[notification.type];
  const colorClass = NOTIFICATION_COLORS[notification.type];

  const handleClick = () => {
    if (notification.isRead === 0) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div
      className={`cursor-pointer rounded-[18px] border px-3 py-3 transition-colors hover:bg-slate-50 ${
        notification.isRead === 0
          ? 'border-emerald-200 bg-emerald-50/70'
          : 'border-transparent bg-transparent'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white ${colorClass}`}
        >
          <IconComponent className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4
              className={`pr-2 text-sm font-medium text-slate-950 ${notification.isRead === 0 ? 'font-semibold' : ''}`}
            >
              {notification.title}
            </h4>
            <div className="flex items-center gap-1 ml-2">
              {notification.isRead === 0 && (
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {notification.isRead === 0 && (
                    <DropdownMenuItem onClick={() => onMarkAsRead(notification.id)}>
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Read
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{notification.content}</p>

          <p className="mt-2 text-xs text-slate-400">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
