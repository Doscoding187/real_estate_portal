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
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

const navigation = [
  { name: 'Overview', href: '/agent/dashboard', icon: Home },
  { name: 'Listings', href: '/agent/listings', icon: Building2 },
  { name: 'Leads & Clients', href: '/agent/leads', icon: Users },
  { name: 'Analytics', href: '/agent/analytics', icon: BarChart3 },
  { name: 'Commission', href: '/agent/commission', icon: DollarSign },
  { name: 'Marketing', href: '/agent/marketing', icon: Megaphone },
  { name: 'Calendar', href: '/agent/calendar', icon: Calendar },
  { name: 'Training', href: '/agent/training', icon: GraduationCap },
  { name: 'Settings', href: '/agent/settings', icon: Settings },
];

const quickActions = [
  { name: 'Add New Listing', icon: Plus, variant: 'default' as const },
  { name: 'View Leads', icon: Eye, variant: 'secondary' as const },
  { name: 'Promote Listing', icon: TrendingUp, variant: 'secondary' as const },
  { name: 'Share Profile', icon: Share2, variant: 'secondary' as const },
];

export function AgentSidebar() {
  const [, setLocation] = useLocation();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] z-20">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-white/20">
          <div className="p-2 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl shadow-sm">
            <Building2 className="h-6 w-6 text-emerald-600" />
          </div>
          <span className="ml-3 text-lg font-bold text-slate-800 tracking-tight">Agent Portal</span>
        </div>

        {/* Quick Actions */}
        <div className="px-4 pt-6 pb-4">
          <h3 className="px-2 mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {quickActions.map(action => (
              <Button
                key={action.name}
                variant={action.variant}
                className={cn(
                  "w-full justify-start h-auto py-2.5 px-3 rounded-xl transition-all duration-300",
                  action.variant === 'default' 
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg text-white" 
                    : "bg-white hover:bg-slate-50 border border-slate-100 text-slate-600 hover:text-emerald-600 shadow-sm hover:shadow-md"
                )}
                size="sm"
                onClick={() => {
                  if (action.name === 'Add New Listing') {
                    setLocation('/listings/create');
                  }
                }}
              >
                <action.icon className={cn("mr-2 h-4 w-4 flex-shrink-0", action.variant === 'secondary' && "text-emerald-500")} />
                <span className="text-sm font-medium">{action.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          <h3 className="px-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider mt-4">
            Menu
          </h3>
          {navigation.map(item => (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 group',
                window.location.pathname === item.href 
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-300",
                window.location.pathname === item.href ? "text-emerald-600" : "text-slate-400 group-hover:text-emerald-500"
              )} />
              {item.name}
            </a>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="flex-shrink-0 p-4 border-t border-white/20 bg-white/40 backdrop-blur-md">
          <div className="flex items-center p-2 rounded-xl hover:bg-white/60 transition-colors cursor-pointer group">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
                <span className="text-sm font-bold text-white">JD</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">John Doe</p>
              <p className="text-xs text-slate-500 font-medium">Premium Agent</p>
            </div>
            <Settings className="ml-auto h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          </div>
        </div>
      </div>
    </aside>
  );
}
