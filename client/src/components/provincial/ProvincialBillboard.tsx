import { ArrowRight } from 'lucide-react';

export interface ProvincialCampaign {
  imageUrl: string;
  landingPageUrl?: string | null;
  altText?: string | null;
  title?: string | null;
  subtitle?: string | null;
  ctaText?: string | null;
  campaignType?: string | null;
}

interface ProvincialBillboardProps {
  campaign?: ProvincialCampaign | null;
  provinceName: string;
}

const campaignTypeLabels: Record<string, string> = {
  new_development: 'New development',
  featured_agency: 'Featured agency',
  market_report: 'Market guide',
  brand_promo: 'Property Listify promotion',
};

function getCampaignTitle(campaign: ProvincialCampaign, provinceName: string) {
  return campaign.title || campaign.altText || `Featured opportunity in ${provinceName}`;
}

export function ProvincialBillboard({ campaign, provinceName }: ProvincialBillboardProps) {
  if (!campaign?.imageUrl) return null;

  const title = getCampaignTitle(campaign, provinceName);
  const typeLabel = campaign.campaignType
    ? campaignTypeLabels[campaign.campaignType] || 'Featured opportunity'
    : 'Featured opportunity';

  return (
    <section
      className="provincial-rail provincial-section provincial-billboard-section"
      aria-labelledby="provincial-billboard-title"
      data-testid="provincial-billboard"
      data-commercial-surface="sponsored"
    >
      <div className="provincial-billboard">
        <div className="provincial-billboard__image-wrap">
          <img
            className="provincial-billboard__image"
            src={campaign.imageUrl}
            alt=""
            loading="lazy"
          />
          <span className="provincial-billboard__image-label">Sponsored</span>
        </div>
        <div className="provincial-billboard__copy">
          <p className="provincial-billboard__eyebrow">
            <span>Sponsored</span>
            <span aria-hidden="true">·</span>
            <span>{typeLabel}</span>
          </p>
          <h2 id="provincial-billboard-title">{title}</h2>
          {campaign.subtitle ? (
            <p className="provincial-billboard__subtitle">{campaign.subtitle}</p>
          ) : null}
          {campaign.landingPageUrl ? (
            <a
              className="provincial-billboard__cta"
              href={campaign.landingPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Sponsored: ${title}`}
              data-testid="provincial-billboard-cta"
            >
              {campaign.ctaText || 'Discover the opportunity'}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          ) : null}
          <p className="provincial-billboard__note">
            Paid placement. It does not change your selected journey or search scope.
          </p>
        </div>
      </div>
    </section>
  );
}
