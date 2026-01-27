import React, { useRef, useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroCampaign {
  imageUrl: string;
  landingPageUrl?: string | null;
  altText?: string | null;
}

interface MonetizedBannerProps {
  locationType: 'province' | 'city' | 'suburb';
  locationId: number;
  locationName: string;
  defaultImage: string;
  campaign?: HeroCampaign | null;
}

export function MonetizedBanner({
  locationType,
  locationId,
  locationName,
  defaultImage,
  campaign,
}: MonetizedBannerProps) {
  // If campaign is provided, it takes precedence (Full Banner Ad)
  // Otherwise, we fetch the "Hero Ad" (Overlay Ad)
  const { data: ad, isLoading } = trpc.monetization.getHeroAd.useQuery(
    { locationType, locationId },
    {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      enabled: !campaign, // Don't fetch overlay ad if we have a campaign
    },
  );

  const impressionLogged = useRef(false);

  // Initial Logic: If campaign exists, track it? (Assuming parent tracks or we track here)
  // For now, focusing on the overlay ad tracking as per original code.

  useEffect(() => {
    if (ad && !impressionLogged.current && !campaign) {
      trackEvent('hero_ad_impression', {
        adId: ad.id,
        locationId,
        locationType,
      });
      impressionLogged.current = true;
    }
  }, [ad, locationId, locationType, campaign]);

  const handleAdClick = () => {
    if (ad) {
      trackEvent('hero_ad_click', {
        adId: ad.id,
        locationId,
        locationType,
      });
      const metadata = ad.metadata as any;
      if (metadata?.ctaUrl) {
        window.open(metadata.ctaUrl, '_blank');
      }
    }
  };

  // 1. Campaign Mode (Full Banner Link)
  if (campaign) {
    return (
      <a
        href={campaign.landingPageUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'relative block w-full bg-slate-900 overflow-hidden cursor-pointer',
          'h-[260px] sm:h-[300px] md:h-[420px] lg:h-[480px]',
        )}
        onClick={() => trackEvent('hero_campaign_click', { locationId, locationType })}
      >
        <img
          src={campaign.imageUrl}
          alt={campaign.altText || `Featured property in ${locationName}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 z-20">
          <span className="bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded text-slate-700 uppercase tracking-wider shadow-sm">
            Sponsored
          </span>
        </div>
      </a>
    );
  }

  // 2. Default Mode (Background Image + Optional Overlay Ad)
  const metadata = ad?.metadata as any;
  const displayImage = metadata?.imageUrl || defaultImage;
  const title = metadata?.customTitle || `Property for sale in ${locationName}`;

  return (
    <div
      className={cn(
        'relative w-full bg-slate-900 overflow-hidden',
        'h-[260px] sm:h-[300px] md:h-[420px] lg:h-[480px]',
      )}
    >
      <img
        src={displayImage}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
        {!metadata?.hideTitle && (
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight shadow-black/50 drop-shadow-md">
            {title}
          </h1>
        )}
      </div>

      {ad && (
        <div className="absolute top-4 right-4 md:right-8 flex flex-col gap-2 items-end z-20">
          <span className="bg-black/40 text-[10px] font-semibold px-2 py-0.5 rounded text-white/80 border border-white/20 uppercase tracking-wider backdrop-blur-sm">
            Sponsored
          </span>
          {metadata?.ctaText && (
            <Button
              onClick={handleAdClick}
              variant="default"
              size="sm"
              className="mt-2 bg-white/95 text-slate-900 hover:bg-white border-none shadow-lg"
            >
              {metadata.ctaText} <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
