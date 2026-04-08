import { Badge } from '@/components/ui/badge';

type ProviderBadgesProps = {
  verificationStatus?: string | null;
  moderationTier?: string | null;
  subscriptionTier?: string | null;
};

export function ProviderBadges({
  verificationStatus,
  moderationTier,
  subscriptionTier,
}: ProviderBadgesProps) {
  const badges: Array<{ label: string; variant: 'default' | 'secondary' | 'outline' }> = [];
  if (verificationStatus === 'verified') badges.push({ label: 'Verified', variant: 'default' });
  if (moderationTier === 'pro') badges.push({ label: 'Pro Publisher', variant: 'secondary' });
  if (subscriptionTier === 'ecosystem_pro') badges.push({ label: 'Priority Match', variant: 'outline' });

  if (badges.length === 0) {
    badges.push({ label: 'Active Provider', variant: 'outline' });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map(badge => (
        <Badge key={badge.label} variant={badge.variant}>
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}
