import { usePreviewSeo } from '@/hooks/usePreviewSeo';
import { AgencyCommercialLandingPage } from '@/pages/advertise/AgencyProductLandingPage';

export default function AdvertiseAgencyJourneyPreviewPage() {
  usePreviewSeo(
    'Property Listify for Agencies | Preview',
    'Preview the Agency operating workspace for team membership, shared inventory, enquiry ownership, follow-up and business visibility.',
  );

  return <AgencyCommercialLandingPage preview />;
}
