/**
 * Activity Feed Component for Mission Control Dashboard
 * Displays recent 20 activities with real-time updates
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { ActivityItem } from './ActivityItem';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function ActivityFeed({
  limit = 20,
  showHeader = true,
  className,
}: ActivityFeedProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: activities,
    isLoading,
    error,
    refetch,
  } = trpc.developer.getActivityFeed.useQuery(
    {
      limit,
      offset: 0,
    },
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (error) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
        <div className="text-center">
          <p className="text-sm text-red-600">Failed to load activities</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200', className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            {activities && activities.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">
                {activities.length}
              </span>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'p-2 rounded-lg hover:bg-gray-100 transition-colors',
              isRefreshing && 'animate-spin'
            )}
            title="Refresh activities"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      {/* Activity List */}
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          // Loading State
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          // Activities
          <div className="max-h-[600px] overflow-y-auto">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activityType={activity.activityType}
                title={activity.title}
                description={activity.description || undefined}
                createdAt={activity.createdAt}
                onClick={() => {
                  // Navigate to related entity if available
                  if (activity.relatedEntityType && activity.relatedEntityId) {
                    // TODO: Implement navigation based on entity type
                    console.log('Navigate to:', activity.relatedEntityType, activity.relatedEntityId);
                  }
                }}
              />
            ))}
          </div>
        ) : (
          // Empty State
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No activities yet</h3>
            <p className="text-sm text-gray-500">
              Your recent activities will appear here
            </p>
          </div>
        )}
      </div>

      {/* View All Link */}
      {activities && activities.length >= limit && (
        <div className="p-4 border-t border-gray-200 text-center">
          <a
            href="/developer/activities"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View all activities →
          </a>
        </div>
      )}
    </div>
  );
}
