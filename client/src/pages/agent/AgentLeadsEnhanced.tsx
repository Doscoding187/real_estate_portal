import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { LeadPipeline } from '@/components/agent/LeadPipeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  Plus,
  BarChart3,
  MessageSquare,
  Users,
  TrendingUp,
  Globe,
} from 'lucide-react';

export default function AgentLeadsEnhanced() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [activeView, setActiveView] = useState('pipeline');
  const [searchQuery, setSearchQuery] = useState('');

  // Check if agent profile exists
  const { isLoading: statsLoading, error } = trpc.agent.getDashboardStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'agent',
    retry: false,
  });

  // Redirect to setup if no agent profile found
  useEffect(() => {
    if (!statsLoading && error && error.message?.includes('Agent profile not found')) {
      setLocation('/agent/setup');
    }
  }, [error, statsLoading, setLocation]);

  // Show loading while checking for agent profile
  if (statsLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Mock lead source data
  const leadSources = [
    { source: 'Website', count: 12, percentage: 40, color: 'from-blue-500 to-blue-600' },
    { source: 'Explore Feed', count: 8, percentage: 27, color: 'from-purple-500 to-purple-600' },
    { source: 'Agent Profile', count: 6, percentage: 20, color: 'from-green-500 to-green-600' },
    { source: 'Referral', count: 4, percentage: 13, color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <AgentAppShell>
      <main className={agentPageStyles.container}>
        {/* Header */}
        <div className={agentPageStyles.header}>
          <div className={agentPageStyles.headingBlock}>
            <h1 className={agentPageStyles.title}>Leads & CRM</h1>
            <p className={agentPageStyles.subtitle}>
              Manage your lead pipeline and client relationships
            </p>
          </div>
          <Button
            className={agentPageStyles.primaryButton}
            onClick={() => {
              // Add new lead modal
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Lead
          </Button>
        </div>

        {/* Toolbar */}
        <div className={cn(agentPageStyles.controls, 'flex items-center justify-between')}>
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search leads..."
                className="rounded-full border-slate-200 bg-[#f7f6f3] pl-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className={agentPageStyles.ghostButton}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          <Tabs value={activeView} onValueChange={setActiveView} className="w-auto">
            <TabsList className={cn(agentPageStyles.tabsList, 'w-auto')}>
              <TabsTrigger value="pipeline" className={agentPageStyles.tabTrigger}>
                <Users className="h-4 w-4 mr-2" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="analytics" className={agentPageStyles.tabTrigger}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="messages" className={agentPageStyles.tabTrigger}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Views */}
        {activeView === 'pipeline' && <LeadPipeline />}

        {activeView === 'analytics' && (
          <div className="space-y-6">
            {/* Lead Sources */}
            <Card className={agentPageStyles.panel}>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Lead Sources
                </h3>
                <div className="space-y-4">
                  {leadSources.map(source => (
                    <div key={source.source}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{source.source}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            {source.count} leads
                          </span>
                          <span className="text-xs text-gray-500">({source.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`bg-gradient-to-r ${source.color} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${source.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card className={agentPageStyles.panel}>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Conversion Funnel
                </h3>
                <div className="space-y-3">
                  {[
                    { stage: 'New Leads', count: 30, width: 100 },
                    { stage: 'Contacted', count: 20, width: 67 },
                    { stage: 'Viewing', count: 12, width: 40 },
                    { stage: 'Offer', count: 8, width: 27 },
                    { stage: 'Closed', count: 5, width: 17 },
                  ].map(stage => (
                    <div key={stage.stage} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium text-gray-700">{stage.stage}</div>
                      <div className="flex-1 relative">
                        <div className="w-full bg-gray-200 rounded-full h-10">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-10 rounded-full flex items-center justify-end pr-4 transition-all duration-500"
                            style={{ width: `${stage.width}%` }}
                          >
                            <span className="text-white text-sm font-bold">{stage.count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'messages' && (
          <Card className={agentPageStyles.panel}>
            <CardContent className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Center</h3>
                <p className="text-gray-500 mb-6">
                  Centralized messaging with all your leads and clients. Chat history, scheduled
                  messages, and more.
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Message Center
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </AgentAppShell>
  );
}
