import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProvincialBillboard } from './ProvincialBillboard';

const campaign = {
  imageUrl: '/placeholders/development_placeholder_1_1763712033438.png',
  landingPageUrl: 'https://example.com/campaigns/harbour-point',
  title: 'A considered new address by the water',
  subtitle: 'A featured development opportunity.',
  ctaText: 'Explore the opportunity',
  campaignType: 'new_development',
};

describe('ProvincialBillboard', () => {
  it('labels commercial placement and keeps its CTA separate from search intent', () => {
    const { container } = render(
      <ProvincialBillboard campaign={campaign} provinceName="Gauteng" />,
    );

    expect(screen.getByTestId('provincial-billboard')).toHaveAttribute(
      'data-commercial-surface',
      'sponsored',
    );
    expect(screen.getAllByText('Sponsored')).toHaveLength(2);
    expect(screen.getByText('New development')).toBeVisible();

    const cta = screen.getByTestId('provincial-billboard-cta');
    expect(cta).toHaveAttribute('href', campaign.landingPageUrl);
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('renders no promotional surface without campaign authority', () => {
    render(<ProvincialBillboard provinceName="Western Cape" />);

    expect(screen.queryByTestId('provincial-billboard')).not.toBeInTheDocument();
  });

  it('does not invent a CTA when a campaign has no destination', () => {
    render(
      <ProvincialBillboard
        provinceName="Western Cape"
        campaign={{ imageUrl: '/campaign.png', title: 'Featured homes' }}
      />,
    );

    expect(screen.getByTestId('provincial-billboard')).toBeVisible();
    expect(screen.queryByTestId('provincial-billboard-cta')).not.toBeInTheDocument();
  });
});
