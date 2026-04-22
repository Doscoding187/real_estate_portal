import { BadgeCheck, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ProviderBadgesProps = {
  verificationStatus?: string | null;
  moderationTier?: string | null;
  subscriptionTier?: string | null;
};

/**
 * Renders trust and tier badges for a provider.
 *
 * - Verified badge: shown when verificationStatus === 'verified', includes a
 *   Lucide checkmark icon and the label "Verified".
 * - Priority Match chip: shown when subscriptionTier === 'ecosystem_pro'.
 * - Pro Publisher badge: shown when moderationTier === 'pro'.
 *
 * Requirements: 3.4, 3.8
 */
export function ProviderBadges({
  verificationStatus,
  moderationTier,
  subscriptionTier,
}: ProviderBadgesProps) {
  const hasAnyBadge =
    verificationStatus === 'verified' ||
    moderationTier === 'pro' ||
    subscriptionTier === 'ecosystem_pro';

  if (!hasAnyBadge) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {verificationStatus === 'verified' && (
        <Badge
          variant="default"
          className="flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Verified
        </Badge>
      )}

      {subscriptionTier === 'ecosystem_pro' && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-amber-400 text-amber-700"
        >
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          Priority Match
        </Badge>
      )}

      {moderationTier === 'pro' && (
        <Badge variant="secondary">Pro Publisher</Badge>
      )}
    </div>
  );
}
