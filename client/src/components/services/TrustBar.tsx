/**
 * TrustBar Component
 *
 * Displays aggregate trust signals derived client-side from the providers array:
 * - Verified provider count
 * - Average platform rating (1 decimal place)
 * - Static "Matched to your location" copy
 *
 * Shows Skeleton placeholders while data is loading.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { ShieldCheck, Star, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProviderDirectoryItem } from './ProviderCard';

export type TrustBarProps = {
  providers: ProviderDirectoryItem[];
  isLoading: boolean;
};

/**
 * Formats a verified provider count as a whole number string.
 * Exported for property-based testing (Property 2).
 */
export function formatVerifiedCount(n: number): string {
  return `${Math.floor(n)}`;
}

/**
 * Formats an average rating to exactly one decimal place.
 * Exported for property-based testing (Property 3).
 */
export function formatRating(r: number): string {
  return r.toFixed(1);
}

/**
 * Derives the verified provider count from a providers array.
 */
function deriveVerifiedCount(providers: ProviderDirectoryItem[]): number {
  return providers.filter(p => p.verificationStatus === 'verified').length;
}

/**
 * Derives the average rating from a providers array (non-null values only).
 * Returns null if no providers have a rating.
 */
function deriveAverageRating(providers: ProviderDirectoryItem[]): number | null {
  const ratings = providers
    .map(p => p.averageRating)
    .filter((r): r is number => r != null && r > 0);
  if (ratings.length === 0) return null;
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

export function TrustBar({ providers, isLoading }: TrustBarProps) {
  const verifiedCount = deriveVerifiedCount(providers);
  const averageRating = deriveAverageRating(providers);

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-6 rounded-xl border border-border bg-muted/40 px-6 py-4 text-sm"
      aria-label="Platform trust signals"
    >
      {/* Trust signal 1: Verified provider count */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span>
            <span className="font-semibold text-foreground" data-testid="verified-count">
              {formatVerifiedCount(verifiedCount)}
            </span>{' '}
            <span className="text-muted-foreground">verified providers</span>
          </span>
        )}
      </div>

      {/* Trust signal 2: Average platform rating */}
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
        {isLoading ? (
          <Skeleton className="h-4 w-36" />
        ) : (
          <span>
            <span className="font-semibold text-foreground" data-testid="average-rating">
              {averageRating != null ? formatRating(averageRating) : '—'}
            </span>{' '}
            <span className="text-muted-foreground">rated by homeowners</span>
          </span>
        )}
      </div>

      {/* Trust signal 3: Static location match copy */}
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        {isLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <span className="text-muted-foreground">Matched to your location</span>
        )}
      </div>
    </div>
  );
}
