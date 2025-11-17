import { 
  Home, 
  Building2, 
  Users, 
  BarChart3, 
  DollarSign, 
  Megaphone, 
  Calendar, 
  GraduationCap, 
  Settings, 
  Plus, 
  Eye, 
  TrendingUp, 
  Share2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/agent/dashboard", icon: Home },
  { name: "Listings", href: "/agent/listings", icon: Building2 },
  { name: "Leads & Clients", href: "/agent/leads", icon: Users },
  { name: "Analytics", href: "/agent/analytics", icon: BarChart3 },
  { name: "Commission", href: "/agent/commission", icon: DollarSign },
  { name: "Marketing", href: "/agent/marketing", icon: Megaphone },
  { name: "Calendar", href: "/agent/calendar", icon: Calendar },
  { name: "Training", href: "/agent/training", icon: GraduationCap },
  { name: "Settings", href: "/agent/settings", icon: Settings },
];

const quickActions = [
  { name: "Add New Listing", icon: Plus, variant: "default" as const },
  { name: "View Leads", icon: Eye, variant: "secondary" as const },
  { name: "Promote Listing", icon: TrendingUp, variant: "secondary" as const },
  { name: "Share Profile", icon: Share2, variant: "secondary" as const },
];

export function AgentSidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-sidebar-border">
          <Building2 className="h-8 w-8 text-primary" />
          <span className="ml-3 text-xl font-bold text-sidebar-foreground">Agent Portal</span>
        </div>

        {/* Quick Actions */}
        <div className="px-3 pt-4 pb-3 border-b border-sidebar-border">
          <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.name}
                variant={action.variant}
                className="w-full justify-start h-auto py-2.5 px-3"
                size="sm"
              >
                <action.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{action.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
                window.location.pathname === item.href && "bg-sidebar-accent text-sidebar-primary"
              )}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </a>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="flex-shrink-0 p-4 border-t border-sidebar-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">JD</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-sidebar-foreground">John Doe</p>
              <p className="text-xs text-muted-foreground">Premium Agent</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}