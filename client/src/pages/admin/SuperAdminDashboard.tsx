import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  LayoutDashboard,
  Building2,
  Users,
  Home,
  CreditCard,
  BarChart3,
  MessageSquare,
  FileText,
  Settings,
  Shield,
  TrendingUp,
  BarChart,
  Megaphone,
  Handshake,
  Code,
  User,
  Star,
  Activity,
  Ticket,
} from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { RequireSuperAdmin } from '@/components/RequireSuperAdmin';

const SidebarNavigation = () => {
  const [location, setLocation] = useLocation();

  const navigationGroups = [
    {
      title: 'DASHBOARD',
      items: [{ name: 'Overview', path: '/admin/overview', icon: LayoutDashboard }],
    },
    {
      title: 'REVENUE & ANALYTICS',
      items: [
        { name: 'Revenue Center', path: '/admin/revenue', icon: TrendingUp },
        { name: 'Analytics & Reports', path: '/admin/analytics', icon: BarChart },
        { name: 'Marketing Campaigns', path: '/admin/marketing', icon: Megaphone },
        { name: 'Partner Network', path: '/admin/partners', icon: Handshake },
        { name: 'Developers', path: '/admin/developers', icon: Code },
      ],
    },
    {
      title: 'ECOSYSTEM MANAGEMENT',
      items: [
        { name: 'Agencies', path: '/admin/agencies', icon: Building2 },
        { name: 'Agents', path: '/admin/agents', icon: Users },
        { name: 'End Users', path: '/admin/end-users', icon: User },
        { name: 'Property Listings', path: '/admin/properties', icon: Home },
        { name: 'Featured Placements', path: '/admin/placements', icon: Star },
      ],
    },
    {
      title: 'PLATFORM MANAGEMENT',
      items: [
        {
          name: 'Subscription Management',
          path: '/admin/subscriptions',
          icon: CreditCard,
        },
        { name: 'Financial Tracking', path: '/admin/financials', icon: BarChart3 },
        { name: 'Content Manager', path: '/admin/content', icon: FileText },
        {
          name: 'Communications',
          path: '/admin/communications',
          icon: MessageSquare,
        },
        { name: 'User & Role Management', path: '/admin/users', icon: Users },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Settings & Integrations', path: '/admin/settings', icon: Settings },
        { name: 'System & Security', path: '/admin/system', icon: Shield },
        { name: 'Audit Log', path: '/admin/audit', icon: Activity },
        { name: 'Support Tickets', path: '/admin/tickets', icon: Ticket },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-background border-r">
      <div className="flex-1 overflow-y-auto pt-6 pb-6">
        <div className="flex flex-col px-3">
          {navigationGroups.map(group => (
            <div key={group.title} className="mb-4">
              <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="mt-1 space-y-1">
                {group.items.map(item => {
                  const isActive = location === item.path;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setLocation(item.path)}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors w-full text-left ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function SuperAdminDashboard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [location] = useLocation();

  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      }
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex flex-1">
        {/* Sidebar */}
        <div
          className={`${
            isMobile ? 'absolute z-40' : 'relative'
          } ${isSidebarOpen ? 'block' : 'hidden'} md:block transition-all duration-300 ease-in-out`}
          style={{ width: '280px' }}
        >
          <SidebarNavigation />
        </div>

        {/* Main Content */}
        <main
          className={`flex-1 overflow-auto transition-all duration-300 ease-in-out ${
            isMobile ? 'pt-16' : ''
          }`}
        >
          {isMobile && (
            <div className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 bg-background border-b z-30">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md bg-background text-foreground hover:bg-muted"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Admin Dashboard</span>
                <Badge variant="destructive">Super Admin</Badge>
              </div>
              <div className="w-8"></div> {/* Spacer for symmetry */}
            </div>
          )}

          {/* Page Content */}
          <div className="p-4 md:p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
                  <p className="text-muted-foreground">Welcome back, {user?.name || user?.email}</p>
                </div>
                <Badge variant="destructive">Super Admin</Badge>
              </div>
            </div>

            {/* Render children routes or default content */}
            <div>
              {children || (
                <div className="text-center py-12">
                  <h2 className="text-xl font-semibold mb-2">
                    Welcome to the Super Admin Dashboard
                  </h2>
                  <p className="text-muted-foreground">
                    Select an option from the sidebar to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
