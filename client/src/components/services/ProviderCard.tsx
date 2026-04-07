import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProviderBadges } from './ProviderBadges';
import { toProviderSlug } from '@/features/services/catalog';

export type ProviderDirectoryItem = {
  providerId: string;
  companyName: string;
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
  ctaLabel?: string;
  onCta?: (providerId: string) => void;
  onViewProfile?: (providerId: string) => void;
};

function safeReviews(value: number | null | undefined) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

export function ProviderCard({
  provider,
  ctaLabel = 'Request quote',
  onCta,
  onViewProfile,
}: ProviderCardProps) {
  const topService = provider.services?.[0];
  const topLocation = provider.locations?.[0];
  const providerSlug = toProviderSlug(provider.companyName, provider.providerId);

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">{provider.companyName}</CardTitle>
            <p className="text-sm text-slate-600">
              {provider.averageRating ? provider.averageRating.toFixed(1) : 'New'} rating
              {' · '}
              {safeReviews(provider.reviewCount)} reviews
            </p>
          </div>
          <ProviderBadges
            verificationStatus={provider.verificationStatus}
            moderationTier={provider.moderationTier}
            subscriptionTier={provider.subscriptionTier}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-700">{provider.headline || provider.bio || 'Trusted local provider'}</p>

        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
          <div>
            <span className="font-medium text-slate-800">Top service:</span>{' '}
            {topService?.displayName || 'General support'}
          </div>
          <div>
            <span className="font-medium text-slate-800">Primary area:</span>{' '}
            {[topLocation?.suburb, topLocation?.city, topLocation?.province].filter(Boolean).join(', ') ||
              'National'}
          </div>
        </div>

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
