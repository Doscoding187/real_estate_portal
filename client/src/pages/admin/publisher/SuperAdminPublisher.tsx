import React, { useState, useEffect } from 'react';
import { DeveloperContextProvider, useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { DeveloperContextSelector } from '@/components/admin/publisher/DeveloperContextSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, LayoutList, Users, BarChart3, LockKeyhole, Edit, Trash2 } from 'lucide-react';
import { EditBrandProfileDialog } from '@/components/admin/publisher/EditBrandProfileDialog';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Import sub-pages (placeholders for now until implemented)
import PublisherDevelopments from './PublisherDevelopments';
import PublisherLeads from './PublisherLeads';
import PublisherMetrics from './PublisherMetrics';

const PublisherContent: React.FC = () => {
  const { isContextSet, selectedBrand, setSelectedBrandId } = useDeveloperContext();
  const [activeTab, setActiveTab] = useState('developments');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const deleteMutation = trpc.superAdminPublisher.deleteBrandProfile.useMutation({
    onSuccess: (data) => {
        toast.success(data.mode === 'soft' ? 'Brand profile archived (soft delete)' : 'Brand profile permanently deleted');
        utils.superAdminPublisher.listBrandProfiles.invalidate();
        setSelectedBrandId(null); // Clear context
    },
    onError: (error) => toast.error(error.message || 'Failed to delete profile'),
  });

  const handleDelete = () => {
    if (!selectedBrand) return;
    if (confirm(`Are you sure you want to delete "${selectedBrand.brandName}"? This action cannot be undone.`)) {
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
            To start emulating workflows, publishing properties, or viewing leads, please select a developer brand profile from the selector above.
          </p>
        </div>
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg max-w-lg text-sm text-orange-800">
          <div className="flex items-start gap-3 text-left">
            <LockKeyhole className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600" />
            <div>
              <p className="font-semibold mb-1">Super Admin Mode Active</p>
              <p>Actions performed here generate platform-owned data (`ownerType='platform'`). This data is isolated from real subscribers until explicitly transferred/claimed.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {selectedBrand && (
        <EditBrandProfileDialog 
            open={isEditDialogOpen} 
            setOpen={setIsEditDialogOpen} 
            brandData={selectedBrand} 
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between border-b pb-4 mb-6">
           <TabsList className="bg-muted/50 p-1 h-12">
            <TabsTrigger value="developments" className="h-10 px-4 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Building2 className="w-4 h-4" />
              Developments
            </TabsTrigger>
            <TabsTrigger value="leads" className="h-10 px-4 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="w-4 h-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="metrics" className="h-10 px-4 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChart3 className="w-4 h-4" />
              Metrics
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground font-mono bg-muted/30 px-3 py-1.5 rounded mr-2">
                Context: {selectedBrand?.slug} (ID: {selectedBrand?.id})
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)} className="h-8 gap-2">
                <Edit className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending} className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200">
                <Trash2 className="w-3.5 h-3.5" />
            </Button>
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
  return (
    <DeveloperContextProvider>
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="flex flex-col gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
              Developer Publisher
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-normal uppercase tracking-wide border border-primary/20">
                Super Admin
              </span>
            </h1>
            <p className="text-muted-foreground max-w-3xl">
              Emulate developer workflows, publish properties, and validate lead routing across any platform-owned brand profile.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
               <DeveloperContextSelector />
            </div>
            {/* Useful stats or quick info could go here */}
          </div>
        </div>

        <PublisherContent />
      </div>
    </DeveloperContextProvider>
  );
};

export default SuperAdminPublisher;
