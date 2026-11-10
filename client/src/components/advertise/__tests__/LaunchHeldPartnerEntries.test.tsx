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
    expect(screen.getByText('We are launching with agents first.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('the services advertise page no longer offers a provider sign-in link', () => {
    render(<AdvertiseServicesPage />);
    expect(screen.getByTestId('cta-not-open-yet')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /provider sign in/i })).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="service%2Fprofile"]')).toBeNull();
  });

  it('partner selection shows Coming soon, not links, for developer and service provider', () => {
    render(<PartnerSelectionSection />);
    expect(screen.getAllByTestId('partner-card-coming-soon')).toHaveLength(2);
    expect(screen.getAllByText('Coming soon')).toHaveLength(2);
    expect(document.querySelector('a[href="/advertise/developers"]')).toBeNull();
    expect(document.querySelector('a[href="/advertise/service-providers"]')).toBeNull();
    expect(document.querySelector('a[href="/advertise/agents"]')).not.toBeNull();
  });

  it('segmentation keeps the agent link and holds agency and developer', () => {
    render(<SegmentationLayer />);
    expect(screen.getAllByTestId('audience-gateway-coming-soon')).toHaveLength(2);
    expect(document.querySelector('a[href="/advertise/sell/agents"]')).not.toBeNull();
    expect(document.querySelector('a[href="/advertise/sell/agencies"]')).toBeNull();
    expect(document.querySelector('a[href="/advertise/sell/developers"]')).toBeNull();
  });
});
