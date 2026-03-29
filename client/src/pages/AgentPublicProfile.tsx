import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Navbar } from '@/components/Navbar';
import { Building2 } from 'lucide-react';

export default function AgentPublicProfile() {
  const [, params] = useRoute('/agent/profile/:agentId');
  const agentId = params?.agentId ? parseInt(params.agentId) : null;
  const [, setLocation] = useLocation();

  const routeQuery = trpc.agent.getPublicProfileRouteById.useQuery(
    { agentId: agentId || 0 },
    {
      enabled: !!agentId,
      retry: false,
    },
  );

  useEffect(() => {
    if (routeQuery.data?.slug) {
      setLocation(`/agents/${routeQuery.data.slug}`);
    }
  }, [routeQuery.data?.slug, setLocation]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        {routeQuery.isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F4C75] mx-auto mb-4"></div>
            <p className="text-muted-foreground">Resolving public agent profile...</p>
          </div>
        ) : routeQuery.data?.slug ? (
          <div className="text-center">
            <p className="text-muted-foreground">Redirecting to public profile...</p>
          </div>
        ) : (
          <div className="text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Agent profile not found</h2>
            <p className="text-muted-foreground">
              The agent profile you&apos;re looking for is not publicly available.
            </p>
          </div>
        )}
      </main>
      <footer className="bg-[#0A2540] text-white py-8 mt-auto">
        <div className="container text-center text-sm text-gray-400">
          © 2025 Real Estate Portal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
