/**
 * Developer Explore Analytics Page
 * Full page for Explore analytics and boost campaigns
 * Requirements: 8.6, 9.1, 9.4, 11.5
 */

import { DeveloperLayout } from '@/components/developer/DeveloperLayout';
import { ExploreSection } from '@/components/explore-analytics/ExploreSection';

export default function ExploreAnalytics() {
  return (
    <DeveloperLayout>
      <ExploreSection />
    </DeveloperLayout>
  );
}
