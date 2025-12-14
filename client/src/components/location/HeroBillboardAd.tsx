import { trpc } from '@/lib/trpc';
import './HeroBillboardAd.css';

interface Props {
  locationSlug: string;
}

export function HeroBillboardAd({ locationSlug }: Props) {
  const { data: campaign } = trpc.locationPages.getHeroCampaign.useQuery({ locationSlug });

  if (!campaign) return null;

  return (
    <a
      href={campaign.landingPageUrl || '#'}
      className="hero-billboard"
      aria-label={campaign.altText || 'Featured property campaign'}
    >
      <img
        src={campaign.imageUrl}
        alt={campaign.altText || ''}
        className="hero-billboard__image"
        loading="lazy"
      />
    </a>
  );
}
