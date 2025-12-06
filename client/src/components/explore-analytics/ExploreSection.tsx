/**
 * Explore Section Component
 * Combined Explore analytics and boost campaigns for dashboards
 * Requirements: 8.6, 9.1, 9.4, 11.5
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExploreAnalyticsDashboard } from './ExploreAnalyticsDashboard';
import { BoostCampaignManager } from './BoostCampaignManager';
import { BarChart3, TrendingUp } from 'lucide-react';

export function ExploreSection() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="boost" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Boost Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <ExploreAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="boost" className="mt-6">
          <BoostCampaignManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
