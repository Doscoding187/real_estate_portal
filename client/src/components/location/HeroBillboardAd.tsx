import './HeroBillboardAd.css';

interface HeroCampaign {
  imageUrl: string;
  landingPageUrl?: string | null;
  altText?: string | null;
}

interface Props {
  campaign: HeroCampaign | null | undefined;
}

export function HeroBillboardAd({ campaign }: Props) {
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
