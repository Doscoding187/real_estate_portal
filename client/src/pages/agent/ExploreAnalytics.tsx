/**
 * Agent Explore Analytics Page
 * Full page for Explore analytics and boost campaigns
 * Requirements: 8.6, 9.1, 9.4, 11.5
 */

import { ExploreSection } from '@/components/explore-analytics/ExploreSection';
import { Navbar } from '@/components/Navbar';

export default function AgentExploreAnalytics() {
  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <ExploreSection />
      </div>
    </div>
  );
}
