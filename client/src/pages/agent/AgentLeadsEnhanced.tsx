import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { AgentSidebar } from '@/components/agent/AgentSidebar';
import { AgentTopNav } from '@/components/agent/AgentTopNav';
import { EnhancedLeadPipeline } from '@/components/agent/EnhancedLeadPipeline';
import { ClientProfileModal } from '@/components/agent/ClientProfileModal';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Menu,
  Search,
  Filter,
  Plus,
  BarChart3,
  MessageSquare,
  Users,
  TrendingUp,
  Globe,
  UserPlus,
} from 'lucide-react';

export default function AgentLeadsEnhanced() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeView, setActiveView] = useState('pipeline');
  const [searchQuery, setSearchQuery] = useState('');

  if (!loading && !isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (!loading && user?.role !== 'agent') {
    setLocation('/dashboard');
    return null;
  }

  const handleLeadClick = (lead: any) => {
    setSelectedLead(lead);
    setIsProfileOpen(true);
  };

  // Mock lead source data
  const leadSources = [
    { source: 'Website', count: 12, percentage: 40, color: 'from-blue-500 to-blue-600' },
    { source: 'Explore Feed', count: 8, percentage: 27, color: 'from-purple-500 to-purple-600' },
    { source: 'Agent Profile', count: 6, percentage: 20, color: 'from-green-500 to-green-600' },
    { source: 'Referral', count: 4, percentage: 13, color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="flex min-h-screen bg-[#F4F7FA]">
      <AgentSidebar />

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

      <div className="flex-1 lg:pl-64">
        <AgentTopNav />

        <main className="p-6 max-w-[1800px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leads & CRM</h1>
              <p className="text-gray-500 mt-1">Manage your lead pipeline and client relationships</p>
            </div>
            <Button
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-soft rounded-xl"
              onClick={() => {
                // Add new lead modal
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Lead
            </Button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  className="pl-10 bg-white border-gray-200 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="rounded-xl">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            <Tabs value={activeView} onValueChange={setActiveView} className="w-auto">
              <TabsList className="bg-gray-100 rounded-xl">
                <TabsTrigger value="pipeline" className="rounded-lg">
                  <Users className="h-4 w-4 mr-2" />
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-lg">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="messages" className="rounded-lg">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Views */}
          {activeView === 'pipeline' && (
            <EnhancedLeadPipeline
              onLeadClick={handleLeadClick}
              onAddLead={() => {
                // Add lead modal
              }}
            />
          )}

          {activeView === 'analytics' && (
            <div className="space-y-6">
              {/* Lead Sources */}
              <Card className="shadow-soft">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Lead Sources
                  </h3>
                  <div className="space-y-4">
                    {leadSources.map((source) => (
                      <div key={source.source}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{source.source}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{source.count} leads</span>
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
              <Card className="shadow-soft">
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
                    ].map((stage) => (
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
            <Card className="shadow-soft">
              <CardContent className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="p-4 bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Center</h3>
                  <p className="text-gray-500 mb-6">
                    Centralized messaging with all your leads and clients. Chat history, scheduled messages, and more.
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

        {/* Client Profile Modal */}
        <ClientProfileModal
          lead={selectedLead}
          isOpen={isProfileOpen}
          onClose={() => {
            setIsProfileOpen(false);
            setSelectedLead(null);
          }}
        />
      </div>
    </div>
  );
}
