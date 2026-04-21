import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProviderBadges } from './ProviderBadges';
import { ProviderAvatar } from './ProviderAvatar';
import { StarRating } from './StarRating';
import { MatchQualityBadge } from './MatchQualityBadge';
import { toProviderSlug } from '@/features/services/catalog';

export type ProviderDirectoryItem = {
  providerId: string;
  companyName: string;
  logoUrl?: string | null;
  verificationStatus?: string | null;
  moderationTier?: string | null;
  subscriptionTier?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  headline?: string | null;
  bio?: string | null;
  trustScore?: number | null;
  services?: Array<{
    category?: string;
    code?: string;
    displayName?: string;
    minPrice?: number | null;
    maxPrice?: number | null;
  }>;
  locations?: Array<{
    province?: string | null;
    city?: string | null;
    suburb?: string | null;
    radiusKm?: number | null;
  }>;
};

type ProviderCardProps = {
  provider: ProviderDirectoryItem;
  /** Normalised match score (0–1). When provided, renders a MatchQualityBadge. */
  matchScore?: number;
  /** When true, applies muted border styling to indicate a fallback provider. */
  isFallback?: boolean;
  ctaLabel?: string;
  onCta?: (providerId: string) => void;
  onViewProfile?: (providerId: string) => void;
};

export function ProviderCard({
  provider,
  matchScore,
  isFallback = false,
  ctaLabel = 'Request quote',
  onCta,
  onViewProfile,
}: ProviderCardProps) {
  const topService = provider.services?.[0];
  const topLocation = provider.locations?.[0];
  const providerSlug = toProviderSlug(provider.companyName, provider.providerId);

  const locationLine =
    [topLocation?.suburb, topLocation?.city, topLocation?.province]
      .filter(Boolean)
      .join(', ') || 'National';

  const serviceLine = topService?.displayName || 'General support';

  const borderClass = isFallback
    ? 'border-slate-200 bg-white opacity-80'
    : 'border-slate-200 bg-white';

  return (
    <Card className={borderClass}>
      <CardHeader className="space-y-2 pb-2">
        {/* Top row: avatar + name/rating + match badge */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: avatar + identity */}
          <div className="flex items-start gap-3">
            <ProviderAvatar
              companyName={provider.companyName}
              logoUrl={provider.logoUrl}
              size="md"
            />
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg leading-tight">{provider.companyName}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <StarRating
                  rating={provider.averageRating}
                  reviewCount={provider.reviewCount}
                  size="sm"
                />
                <span className="text-sm text-slate-500">
                  {provider.reviewCount ?? 0} reviews
                </span>
              </div>
            </div>
          </div>

          {/* Right: match quality badge */}
          {matchScore !== undefined && (
            <div className="shrink-0">
              <MatchQualityBadge score={matchScore} />
            </div>
          )}
        </div>

        {/* Badges row */}
        <ProviderBadges
          verificationStatus={provider.verificationStatus}
          moderationTier={provider.moderationTier}
          subscriptionTier={provider.subscriptionTier}
        />
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Headline / bio */}
        <p className="text-sm text-slate-700">{provider.headline || provider.bio || 'Trusted local provider'}</p>

        {/* Location + service lines */}
        <div className="flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:gap-4">
          <div>
            <span className="font-medium text-slate-800">Service: </span>
            {serviceLine}
          </div>
          <div>
            <span className="font-medium text-slate-800">Area: </span>
            {locationLine}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={() => onCta?.(provider.providerId)}>{ctaLabel}</Button>
          <Link href={`/services/provider/${providerSlug}`}>
            <Button variant="outline" onClick={() => onViewProfile?.(provider.providerId)}>
              View profile
            </Button>
          </Link>
          <Link href={`/services/reviews/${provider.providerId}`}>
            <Button variant="ghost">Read reviews</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
