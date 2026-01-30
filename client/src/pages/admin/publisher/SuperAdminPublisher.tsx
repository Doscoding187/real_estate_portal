import React, { useState, useEffect } from 'react';
import { DeveloperContextProvider, useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { DeveloperContextSelector } from '@/components/admin/publisher/DeveloperContextSelector';
import { ProvinceDevDashboard } from '@/components/admin/publisher/ProvinceDevDashboard';
import { QuickStatsBar } from '@/components/admin/publisher/QuickStatsBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  LayoutList,
  Users,
  BarChart3,
  LockKeyhole,
  Edit,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { EditBrandProfileDialog } from '@/components/admin/publisher/EditBrandProfileDialog';
import { LinkSubscriberDialog } from '@/components/admin/publisher/LinkSubscriberDialog';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { publisherTheme, animations, cardElevation, glassEffect } from '@/lib/publisherTheme';

// Import sub-pages
import PublisherDevelopments from './PublisherDevelopments';
import PublisherLeads from './PublisherLeads';
import PublisherMetrics from './PublisherMetrics';

const PublisherContent: React.FC = () => {
  const { isContextSet, selectedBrand, setSelectedBrandId } = useDeveloperContext();
  const [activeTab, setActiveTab] = useState('developments');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  // Fetch lead count for badge
  const { data: leads } = trpc.superAdminPublisher.getBrandLeads.useQuery(
    { brandProfileId: selectedBrand?.id!, limit: 100 },
    { enabled: !!selectedBrand?.id },
  );

  const deleteMutation = trpc.superAdminPublisher.deleteBrandProfile.useMutation({
    onSuccess: data => {
      toast.success(
        data.mode === 'soft'
          ? 'Brand profile archived (soft delete)'
          : 'Brand profile permanently deleted',
      );
      utils.superAdminPublisher.listBrandProfiles.invalidate();
      setSelectedBrandId(null); // Clear context
    },
    onError: error => toast.error(error.message || 'Failed to delete profile'),
  });

  const handleDelete = () => {
    if (!selectedBrand) return;
    if (
      confirm(
        `Are you sure you want to delete "${selectedBrand.brandName}"? This action cannot be undone.`,
      )
    ) {
      deleteMutation.mutate({ brandProfileId: selectedBrand.id });
    }
  };

  if (!isContextSet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
        <div className="p-6 bg-muted/30 rounded-full border-2 border-dashed border-muted-foreground/20">
          <Building2 className="w-16 h-16 text-muted-foreground/50" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Select a Developer Brand</h2>
          <p className="text-muted-foreground">
            To start emulating workflows, publishing properties, or viewing leads, please select a
            developer brand profile from the selector above.
          </p>
        </div>
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg max-w-lg text-sm text-orange-800">
          <div className="flex items-start gap-3 text-left">
            <LockKeyhole className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600" />
            <div>
              <p className="font-semibold mb-1">Super Admin Mode Active</p>
              <p>
                Actions performed here generate platform-owned data (`ownerType='platform'`). This
                data is isolated from real subscribers until explicitly transferred/claimed.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {selectedBrand && (
        <>
          <EditBrandProfileDialog
            open={isEditDialogOpen}
            setOpen={setIsEditDialogOpen}
            brandData={selectedBrand}
          />
          <LinkSubscriberDialog
            open={isLinkDialogOpen}
            setOpen={setIsLinkDialogOpen}
            brandProfile={selectedBrand}
            onSuccess={() => utils.superAdminPublisher.listBrandProfiles.invalidate()}
          />
        </>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Enhanced Tab Navigation */}
        <div className="flex items-center justify-between mb-8">
          <TabsList className="relative bg-white/80 backdrop-blur-md p-1.5 h-14 rounded-xl border border-gray-200/50 shadow-lg overflow-hidden">
            <TabsTrigger
              value="developments"
              className={cn(
                'relative h-11 px-6 gap-2.5 transition-all duration-300 rounded-lg',
                'data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105',
                'data-[state=inactive]:text-gray-600 hover:text-blue-600 hover:bg-gray-50',
                'font-semibold text-sm',
              )}
            >
              <Building2 className="w-4 h-4" />
              <span>Developments</span>
              {activeTab === 'developments' && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </TabsTrigger>

            <TabsTrigger
              value="leads"
              className={cn(
                'relative h-11 px-6 gap-2.5 transition-all duration-300 rounded-lg',
                'data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105',
                'data-[state=inactive]:text-gray-600 hover:text-blue-600 hover:bg-gray-50',
                'font-semibold text-sm',
              )}
            >
              <Users className="w-4 h-4" />
              <span>Leads</span>
              {leads && leads.length > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-gradient-to-r from-red-500 to-pink-500 border-0 text-white animate-bounce">
                  {leads.length}
                </Badge>
              )}
              {activeTab === 'leads' && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </TabsTrigger>

            <TabsTrigger
              value="metrics"
              className={cn(
                'relative h-11 px-6 gap-2.5 transition-all duration-300 rounded-lg',
                'data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105',
                'data-[state=inactive]:text-gray-600 hover:text-blue-600 hover:bg-gray-50',
                'font-semibold text-sm',
              )}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Metrics</span>
              {activeTab === 'metrics' && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Enhanced Context Info and Actions */}
          <div className="flex items-center gap-3">
            {/* Context Badge */}
            <div className="glass-effect-light px-4 py-2 rounded-xl border border-blue-200/50">
              <div className="text-xs text-blue-600 font-mono font-medium">
                Context: {selectedBrand?.slug} (ID: {selectedBrand?.id})
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="h-9 gap-2 px-4 bg-white border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
              >
                <Edit className="w-3.5 h-3.5" />
                <span className="font-medium">Edit</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="h-9 gap-2 px-4 bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:shadow-md transition-all duration-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="font-medium">Delete</span>
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="developments" className="mt-0">
          <PublisherDevelopments />
        </TabsContent>

        <TabsContent value="leads" className="mt-0">
          <PublisherLeads />
        </TabsContent>

        <TabsContent value="metrics" className="mt-0">
          <PublisherMetrics />
        </TabsContent>
      </Tabs>

    </div>
  );
};

export const SuperAdminPublisher: React.FC = () => {
  // Fetch global stats for quick stats bar
  const { data: allBrands } = trpc.superAdminPublisher.listBrandProfiles.useQuery({});
  const { data: globalMetrics } = trpc.superAdminPublisher.getGlobalMetrics.useQuery(undefined, {
    enabled: true,
  });

  return (
    <DeveloperContextProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="container mx-auto py-8 max-w-7xl">
          {/* Enhanced Header with Gradient Background */}
          <div className="relative mb-8 rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-500 hover:scale-[1.01]">
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-95 animate-pulse" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />

            {/* Floating Orb Effects */}
            <div
              className="absolute top-10 left-20 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-bounce"
              style={{ animationDelay: '0s', animationDuration: '3s' }}
            />
            <div
              className="absolute bottom-10 right-20 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl animate-bounce"
              style={{ animationDelay: '1.5s', animationDuration: '4s' }}
            />

            {/* Content */}
            <div className="relative z-10 p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="max-w-4xl">
                  <h1 className="text-4xl font-bold tracking-tight text-white mb-3 flex items-center gap-3 animate-fade-in">
                    Developer Publisher
                    <span className="inline-flex items-center gap-1.5 text-xs bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide border border-white/30 shadow-lg animate-pulse hover:bg-white/30 transition-colors cursor-pointer">
                      <Sparkles className="w-3 h-3" />
                      Super Admin
                    </span>
                  </h1>
                  <p className="text-blue-100 max-w-3xl text-lg leading-relaxed animate-slide-in">
                    Browse and edit all developments by province, or select a brand profile to
                    emulate developer workflows.
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="hidden lg:flex flex-col gap-2">
                  <div className="glass-effect-light p-3 rounded-xl border border-white/20">
                    <div className="text-xs text-white/70 mb-1">Total Brands</div>
                    <div className="text-2xl font-bold text-white">{allBrands?.length || 0}</div>
                  </div>
                  <div className="glass-effect-light p-3 rounded-xl border border-white/20">
                    <div className="text-xs text-white/70 mb-1">Active Developments</div>
                    <div className="text-2xl font-bold text-white">
                      {globalMetrics?.totalDevelopments || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Quick Stats Bar */}
              {globalMetrics && (
                <div className="animate-slide-up">
                  <QuickStatsBar
                    totalBrands={allBrands?.length || 0}
                    totalDevelopments={globalMetrics.totalDevelopments || 0}
                    totalLeads={globalMetrics.totalLeads || 0}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Province-Based Development Dashboard - Quick Access */}
          <ProvinceDevDashboard />

          <Separator className="my-8" />

          {/* Brand Context Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Brand Profile Mode</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Select a brand profile to create new developments, manage leads, and view metrics.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <DeveloperContextSelector />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <PublisherContent />
          </div>
        </div>
      </div>
    </DeveloperContextProvider>
  );
};

export default SuperAdminPublisher;
