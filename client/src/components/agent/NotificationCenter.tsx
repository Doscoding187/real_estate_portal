import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  CheckCircle,
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

      <DropdownMenuContent align="end" className="w-96 max-h-96">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Notifications</h3>
            {(unreadCount?.count || 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Search and Filter */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-sm border rounded"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
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

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No notifications found</div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  isMarkingAsRead={markAsReadMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t text-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
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
  isMarkingAsRead: boolean;
}

function NotificationItem({ notification, onMarkAsRead, isMarkingAsRead }: NotificationItemProps) {
  const IconComponent = NOTIFICATION_ICONS[notification.type];
  const colorClass = NOTIFICATION_COLORS[notification.type];

  const handleClick = () => {
    if (notification.isRead === 0) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div
      className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
        notification.isRead === 0 ? 'bg-blue-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${colorClass}`}>
          <IconComponent className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4
              className={`text-sm font-medium ${notification.isRead === 0 ? 'font-semibold' : ''}`}
            >
              {notification.title}
            </h4>
            <div className="flex items-center gap-1 ml-2">
              {notification.isRead === 0 && (
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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

          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.content}</p>

          <p className="text-xs text-muted-foreground mt-2">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
