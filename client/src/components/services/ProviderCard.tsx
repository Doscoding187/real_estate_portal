import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProviderBadges } from './ProviderBadges';
import { ProviderAvatar } from './ProviderAvatar';
import { toProviderSlug } from '@/features/services/catalog';

export type ProviderDirectoryItem = {
  providerId: number;
  companyName: string;
  logoUrl?: string | null;
  verificationStatus?: string | null;
  headline?: string | null;
  bio?: string | null;
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
  }>;
};

type ProviderCardProps = {
  provider: ProviderDirectoryItem;
  serviceCategory?: string;
  isFallback?: boolean;
  ctaLabel?: string;
  onCta?: (providerId: number, serviceCode?: string) => void;
  onViewProfile?: (providerId: number) => void;
};

export function ProviderCard({
  provider,
  serviceCategory,
  isFallback = false,
  ctaLabel = 'Request service',
  onCta,
  onViewProfile,
}: ProviderCardProps) {
  const topService =
    provider.services?.find(service => service.category === serviceCategory) ||
    provider.services?.[0];
  const topLocation = provider.locations?.[0];
  const providerSlug = toProviderSlug(provider.companyName, provider.providerId);
  const locationLine =
    [topLocation?.suburb, topLocation?.city, topLocation?.province].filter(Boolean).join(', ') ||
    'Coverage not listed';
  const serviceLine = topService?.displayName || 'Service details on profile';
  const borderClass = isFallback
    ? 'border-slate-200 bg-white opacity-80'
    : 'border-slate-200 bg-white';

  return (
    <Card className={borderClass}>
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <ProviderAvatar
              companyName={provider.companyName}
              logoUrl={provider.logoUrl}
              size="md"
            />
            <div className="min-w-0 space-y-2">
              <CardTitle className="text-lg leading-tight">{provider.companyName}</CardTitle>
              <ProviderBadges verificationStatus={provider.verificationStatus} />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-slate-700">
          {provider.headline || provider.bio || 'Review the provider profile for service details.'}
        </p>
        <div className="flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:gap-4">
          <div>
            <span className="font-medium text-slate-800">Service: </span>
            {serviceLine}
          </div>
          <div>
            <span className="font-medium text-slate-800">Listed coverage: </span>
            {locationLine}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {onCta && (
            <Button onClick={() => onCta(provider.providerId, topService?.code)}>{ctaLabel}</Button>
          )}
          <Link href={`/services/provider/${providerSlug}`}>
            <Button variant="outline" onClick={() => onViewProfile?.(provider.providerId)}>
              View profile
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
