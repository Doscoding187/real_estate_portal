import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ProviderBadgesProps = {
  verificationStatus?: string | null;
};

export function ProviderBadges({ verificationStatus }: ProviderBadgesProps) {
  if (verificationStatus !== 'verified') return null;

  return (
    <Badge className="flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Platform verified
    </Badge>
  );
}
