import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, TrendingUp, UserPlus } from "lucide-react";

const activities = [
  {
    id: 1,
    type: "view",
    message: "New lead viewed Luxury Villa in Beverly Hills",
    time: "5 minutes ago",
    icon: Eye,
  },
  {
    id: 2,
    type: "lead",
    message: "New inquiry from Michael Chen",
    time: "23 minutes ago",
    icon: MessageSquare,
  },
  {
    id: 3,
    type: "boost",
    message: "Your listing 'Downtown Penthouse' was featured",
    time: "1 hour ago",
    icon: TrendingUp,
  },
  {
    id: 4,
    type: "client",
    message: "Sarah Johnson added as client",
    time: "3 hours ago",
    icon: UserPlus,
  },
];

const getIconColor = (type: string) => {
  switch (type) {
    case "view":
      return "text-primary";
    case "lead":
      return "text-success";
    case "boost":
      return "text-chart-3";
    case "client":
      return "text-chart-5";
    default:
      return "text-muted-foreground";
  }
};

export function RecentActivity() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Recent Activity</CardTitle>
        <Badge variant="secondary">Live</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-secondary ${getIconColor(activity.type)}`}>
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm text-foreground">{activity.message}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}