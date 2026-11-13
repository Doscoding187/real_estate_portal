import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import AdvertiseServicesPage from '@/pages/advertise/AdvertiseServicesPage';
import { NotOpenYetCta } from '../NotOpenYetCta';
import { PartnerSelectionSection } from '../PartnerSelectionSection';
import { SegmentationLayer } from '../SegmentationLayer';

describe('launch-held partner entries', () => {
  it('NotOpenYetCta is a non-link state with the launch sentence', () => {
    render(<NotOpenYetCta />);
    expect(screen.getByText('Not open yet')).toBeInTheDocument();
    expect(
      screen.getByText('Buyer, agent and service-provider registration is open.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('the services advertise page routes providers into application registration', () => {
    render(<AdvertiseServicesPage />);
    expect(
      screen.getByRole('link', { name: 'Apply as a service provider' }),
    ).toHaveAttribute('href', '/login?mode=register&role=service_provider');
    expect(screen.queryByTestId('cta-not-open-yet')).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="service%2Fprofile"]')).toBeNull();
  });

  it('partner selection holds developer and links service providers to the application page', () => {
    render(<PartnerSelectionSection />);
    expect(screen.getAllByTestId('partner-card-coming-soon')).toHaveLength(1);
    expect(screen.getAllByText('Not open yet')).toHaveLength(1);
    expect(document.querySelector('a[href="/advertise/developers"]')).toBeNull();
    expect(document.querySelector('a[href="/advertise/services"]')).not.toBeNull();
    expect(document.querySelector('a[href="/advertise/agents"]')).not.toBeNull();
  });

  it('segmentation keeps the agent link and holds agency and developer', () => {
    render(<SegmentationLayer />);
    expect(screen.getAllByTestId('audience-gateway-coming-soon')).toHaveLength(2);
    expect(screen.getAllByText('Not open yet')).toHaveLength(2);
    expect(document.querySelector('a[href="/advertise/sell/agents"]')).not.toBeNull();
    expect(document.querySelector('a[href="/advertise/sell/agencies"]')).toBeNull();
    expect(document.querySelector('a[href="/advertise/sell/developers"]')).toBeNull();
  });
});
