import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { AgentSidebar } from '@/components/agent/AgentSidebar';
import { AgentTopNav } from '@/components/agent/AgentTopNav';
import { AgentDashboardOverview } from '@/components/agent/AgentDashboardOverview';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export default function AgentDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  // Check if agent profile exists
  const { data: agentProfile, isLoading: isLoadingProfile } = trpc.agent.getDashboardStats.useQuery(
    undefined,
    {
      enabled: isAuthenticated && user?.role === 'agent',
      retry: false,
      onError: error => {
        // If agent profile not found, redirect to setup
        if (error.message.includes('Agent profile not found')) {
          setLocation('/agent/setup');
        }
      },
    },
  );

  // Show loading spinner while auth is being checked
  if (loading || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not agent
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'agent') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#F4F7FA]">
      <AgentSidebar />

      {/* Mobile Menu */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <AgentSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
        <AgentTopNav />
        <AgentDashboardOverview />
      </div>
    </div>
  );
}
