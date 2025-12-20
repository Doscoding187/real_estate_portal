
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AgentApprovals from './AgentApprovals';
import ListingOversight from './ListingOversight';
import DevelopmentOversight from './DevelopmentOversight';
import { CheckCircle } from 'lucide-react';

const UnifiedApprovalsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Approvals Center</h1>
          <p className="text-slate-500">Manage all pending approvals from a single location.</p>
        </div>
      </div>

      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="agents">Agent Approvals</TabsTrigger>
          <TabsTrigger value="listings">Listing Approvals</TabsTrigger>
          <TabsTrigger value="developments">Development Approvals</TabsTrigger>
        </TabsList>
        <TabsContent value="agents" className="mt-6">
          <AgentApprovals />
        </TabsContent>
        <TabsContent value="listings" className="mt-6">
          <ListingOversight />
        </TabsContent>
        <TabsContent value="developments" className="mt-6">
          <DevelopmentOversight />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedApprovalsPage;
