/**
 * Activity Item Component for Mission Control Dashboard
 * Displays individual activity with icon, title, description, and timestamp
 * Requirements: 5.3
 */

import {
  User,
  UserCheck,
  UserX,
  FileText,
  Calendar,
  CheckCircle,
  Image,
  DollarSign,
  Home,
  Building2,
  Megaphone,
  UserPlus,
  UserMinus,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItemProps {
  activityType: string;
  title: string;
  description?: string;
  createdAt: Date;
  onClick?: () => void;
}

const ACTIVITY_CONFIG: Record<
  string,
  {
    icon: LucideIcon;
    color: string;
    bgColor: string;
  }
> = {
  lead_new: {
    icon: User,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  lead_qualified: {
    icon: UserCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  lead_unqualified: {
    icon: UserX,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
  otp_generated: {
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  viewing_scheduled: {
    icon: Calendar,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  viewing_completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  media_uploaded: {
    icon: Image,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  price_updated: {
    icon: DollarSign,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  unit_sold: {
    icon: Home,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  unit_reserved: {
    icon: Home,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  development_created: {
    icon: Building2,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  development_updated: {
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  campaign_launched: {
    icon: Megaphone,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  campaign_paused: {
    icon: Megaphone,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
  team_member_added: {
    icon: UserPlus,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  team_member_removed: {
    icon: UserMinus,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
};

export function ActivityItem({
  activityType,
  title,
  description,
  createdAt,
  onClick,
}: ActivityItemProps) {
  const config = ACTIVITY_CONFIG[activityType] || {
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  };

  const Icon = config.icon;

  const formatTimestamp = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-all duration-200',
        onClick ? 'cursor-pointer hover:bg-gray-50' : '',
        'group',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          config.bgColor,
          'group-hover:scale-110 transition-transform duration-200',
        )}
      >
        <Icon className={cn('w-5 h-5', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        {description && <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{description}</p>}
        <p className="text-xs text-gray-500 mt-1">{formatTimestamp(createdAt)}</p>
      </div>

      {/* Hover Indicator */}
      {onClick && (
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        </div>
      )}
    </div>
  );
}
