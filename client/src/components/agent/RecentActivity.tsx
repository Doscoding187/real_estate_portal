import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, MessageSquare, TrendingUp, UserPlus } from 'lucide-react';

const activities: {
  id: number;
  type: string;
  message: string;
  time: string;
  icon: any;
}[] = [];

const getIconColor = (type: string) => {
  switch (type) {
    case 'view':
      return 'text-primary';
    case 'lead':
      return 'text-green-600';
    case 'boost':
      return 'text-purple-600';
    case 'client':
      return 'text-blue-600';
    default:
      return 'text-muted-foreground';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'view':
      return 'bg-primary/10 text-primary';
    case 'lead':
      return 'bg-green-100 text-green-800';
    case 'boost':
      return 'bg-purple-100 text-purple-800';
    case 'client':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            activities.map(activity => {
              const IconComponent = activity.icon;
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 ${getIconColor(activity.type)}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getTypeColor(activity.type)} variant="secondary">
                        {activity.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
