import { useEffect } from 'react';
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

  const agentProfileQuery = trpc.agent.getDashboardStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'agent',
    retry: false,
  });
  const { isLoading: isLoadingProfile, error } = agentProfileQuery;

  useEffect(() => {
    if (!error) return;
    if (error.message.includes('Agent profile not found')) {
      setLocation('/agent/setup');
    }
  }, [error, setLocation]);

  if (loading || isLoadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f7f8f3_0%,#eef2ec_100%)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
          <p className="text-slate-500">Loading Agent OS workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'agent') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#f7f8f3_0%,#eef2ec_100%)] text-slate-950">
      <AgentSidebar />

      <Sheet>
        <SheetTrigger asChild className="fixed left-4 top-4 z-50 lg:hidden">
          <Button
            variant="outline"
            size="icon"
            className="rounded-2xl border-slate-200 bg-white/95 shadow-sm backdrop-blur"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[92vw] max-w-[308px] border-r-0 p-0">
          <AgentSidebar mobile />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1 lg:pl-[288px]">
        <AgentTopNav />
        <AgentDashboardOverview />
      </div>
    </div>
  );
}
