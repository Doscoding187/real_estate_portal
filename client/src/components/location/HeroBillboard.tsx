import { trpc } from '@/lib/trpc';
import { HeroLocation } from './HeroLocation';
import { trackEvent } from '@/lib/analytics';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface HeroBillboardProps {
  locationType: 'province' | 'city' | 'suburb';
  locationId: number;
  defaultTitle: string;
  defaultSubtitle?: string;
  defaultImage?: string;
  breadcrumbs: { label: string; href: string }[];
  stats?: any; // Pass-through stats
  placeId?: string; // For syncing with Google Places if needed
}

export function HeroBillboard({
  locationType,
  locationId,
  defaultTitle,
  defaultSubtitle,
  defaultImage,
  breadcrumbs,
  stats,
  placeId,
}: HeroBillboardProps) {
  // Fetch active ad
  const { data: ad, isLoading } = trpc.monetization.getHeroAd.useQuery(
    { locationType, locationId },
    {
      staleTime: 1000 * 60 * 5, // Cache for 5 mins
      refetchOnWindowFocus: false,
    },
  );

  const impressionLogged = useRef(false);

  useEffect(() => {
    if (ad && !impressionLogged.current) {
      trackEvent('hero_ad_impression', {
        adId: ad.id,
        locationId,
        locationType,
      });
      impressionLogged.current = true;
    }
  }, [ad, locationId, locationType]);

  const handleAdClick = () => {
    if (ad) {
      trackEvent('hero_ad_click', {
        adId: ad.id,
        locationId,
        locationType,
      });

      // Navigate to ad destination
      const metadata = ad.metadata as any;
      if (metadata?.ctaUrl) {
        window.open(metadata.ctaUrl, '_blank');
      }
    }
  };

  // Extract ad metadata
  const metadata = ad?.metadata as any;
  const adImage = metadata?.imageUrl;
  const adTitle = metadata?.customTitle; // Optional override
  const adSubtitle = metadata?.customSubtitle; // Optional override
  const ctaText = metadata?.ctaText;

  // Determine content to display
  const displayImage = adImage || defaultImage;
  const displayTitle = adTitle || defaultTitle;
  const displaySubtitle = adSubtitle || defaultSubtitle;

  return (
    <div className="relative">
      <HeroLocation
        title={displayTitle}
        subtitle={displaySubtitle}
        breadcrumbs={breadcrumbs}
        backgroundImage={displayImage}
        stats={stats}
        placeId={placeId}
      />

      {/* Ad Overlay Elements (Badge & CTA) */}
      {ad && (
        <div className="absolute top-24 right-4 md:right-10 z-20 flex flex-col gap-2 items-end">
          <span className="bg-white/90 text-xs font-bold px-2 py-1 rounded text-gray-500 shadow-sm uppercase tracking-wider">
            Sponsored
          </span>

          {ctaText && (
            <Button
              onClick={handleAdClick}
              className="mt-4 bg-primary-600 hover:bg-primary-700 text-white shadow-lg animate-in fade-in zoom-in duration-500"
              size="lg"
            >
              {ctaText} <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
