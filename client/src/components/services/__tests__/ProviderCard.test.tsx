/**
 * Unit tests for ProviderCard and ProviderBadges
 *
 * Feature: services-marketplace-overhaul
 *
 * Property 6: ProviderCard displays Verified badge iff verificationStatus is 'verified'
 * For any ProviderDirectoryItem, the rendered ProviderCard should contain a Verified
 * badge element if and only if verificationStatus === 'verified'.
 * Validates: Requirements 3.4, 6.3
 *
 * Property 7: ProviderCard displays Priority Match iff subscriptionTier is 'ecosystem_pro'
 * For any ProviderDirectoryItem, the rendered ProviderCard should contain a "Priority Match"
 * indicator if and only if subscriptionTier === 'ecosystem_pro'.
 * Validates: Requirements 3.8
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderCard, type ProviderDirectoryItem } from '../ProviderCard';

// Mock wouter so Link renders as a plain anchor without needing a router context
vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildProvider(overrides: Partial<ProviderDirectoryItem> = {}): ProviderDirectoryItem {
  return {
    providerId: 'provider-123',
    companyName: 'Acme Builders',
    verificationStatus: null,
    subscriptionTier: null,
    moderationTier: null,
    averageRating: 4.2,
    reviewCount: 17,
    headline: 'Quality work guaranteed',
    services: [{ displayName: 'Home Renovation', category: 'home_improvement' }],
    locations: [{ suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng' }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Property 6: Verified badge iff verificationStatus === 'verified'
// ---------------------------------------------------------------------------

describe('ProviderCard — Verified badge (Property 6)', () => {
  it('displays the Verified badge when verificationStatus is "verified"', () => {
    const provider = buildProvider({ verificationStatus: 'verified' });
    render(<ProviderCard provider={provider} />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('does NOT display the Verified badge when verificationStatus is null', () => {
    const provider = buildProvider({ verificationStatus: null });
    render(<ProviderCard provider={provider} />);

    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('does NOT display the Verified badge when verificationStatus is "pending"', () => {
    const provider = buildProvider({ verificationStatus: 'pending' });
    render(<ProviderCard provider={provider} />);

    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('does NOT display the Verified badge when verificationStatus is "unverified"', () => {
    const provider = buildProvider({ verificationStatus: 'unverified' });
    render(<ProviderCard provider={provider} />);

    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('does NOT display the Verified badge when verificationStatus is undefined', () => {
    const provider = buildProvider({ verificationStatus: undefined });
    render(<ProviderCard provider={provider} />);

    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Property 7: Priority Match iff subscriptionTier === 'ecosystem_pro'
// ---------------------------------------------------------------------------

describe('ProviderCard — Priority Match badge (Property 7)', () => {
  it('displays the Priority Match chip when subscriptionTier is "ecosystem_pro"', () => {
    const provider = buildProvider({ subscriptionTier: 'ecosystem_pro' });
    render(<ProviderCard provider={provider} />);

    expect(screen.getByText('Priority Match')).toBeInTheDocument();
  });

  it('does NOT display the Priority Match chip when subscriptionTier is null', () => {
    const provider = buildProvider({ subscriptionTier: null });
    render(<ProviderCard provider={provider} />);

    expect(screen.queryByText('Priority Match')).not.toBeInTheDocument();
  });

  it('does NOT display the Priority Match chip when subscriptionTier is "directory"', () => {
    const provider = buildProvider({ subscriptionTier: 'directory' });
    render(<ProviderCard provider={provider} />);

    expect(screen.queryByText('Priority Match')).not.toBeInTheDocument();
  });

  it('does NOT display the Priority Match chip when subscriptionTier is "directory_explore"', () => {
    const provider = buildProvider({ subscriptionTier: 'directory_explore' });
    render(<ProviderCard provider={provider} />);

    expect(screen.queryByText('Priority Match')).not.toBeInTheDocument();
  });

  it('does NOT display the Priority Match chip when subscriptionTier is undefined', () => {
    const provider = buildProvider({ subscriptionTier: undefined });
    render(<ProviderCard provider={provider} />);

    expect(screen.queryByText('Priority Match')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Combined: both badges can appear simultaneously
// ---------------------------------------------------------------------------

describe('ProviderCard — both badges simultaneously', () => {
  it('displays both Verified and Priority Match when both conditions are met', () => {
    const provider = buildProvider({
      verificationStatus: 'verified',
      subscriptionTier: 'ecosystem_pro',
    });
    render(<ProviderCard provider={provider} />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Priority Match')).toBeInTheDocument();
  });

  it('displays neither badge when neither condition is met', () => {
    const provider = buildProvider({
      verificationStatus: null,
      subscriptionTier: null,
    });
    render(<ProviderCard provider={provider} />);

    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.queryByText('Priority Match')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Additional ProviderCard rendering tests
// ---------------------------------------------------------------------------

describe('ProviderCard — general rendering', () => {
  it('renders the company name', () => {
    const provider = buildProvider({ companyName: 'Cape Town Plumbers' });
    render(<ProviderCard provider={provider} />);

    expect(screen.getByText('Cape Town Plumbers')).toBeInTheDocument();
  });

  it('renders the top service display name', () => {
    const provider = buildProvider({
      services: [{ displayName: 'Electrical Wiring', category: 'home_improvement' }],
    });
    render(<ProviderCard provider={provider} />);

    expect(screen.getByText('Electrical Wiring')).toBeInTheDocument();
  });

  it('renders "General support" when no services are provided', () => {
    const provider = buildProvider({ services: [] });
    render(<ProviderCard provider={provider} />);

    expect(screen.getByText('General support')).toBeInTheDocument();
  });

  it('renders the location line from suburb, city, and province', () => {
    const provider = buildProvider({
      locations: [{ suburb: 'Rondebosch', city: 'Cape Town', province: 'Western Cape' }],
    });
    render(<ProviderCard provider={provider} />);

    expect(screen.getByText('Rondebosch, Cape Town, Western Cape')).toBeInTheDocument();
  });

  it('renders "National" when no locations are provided', () => {
    const provider = buildProvider({ locations: [] });
    render(<ProviderCard provider={provider} />);

    expect(screen.getByText('National')).toBeInTheDocument();
  });

  it('renders the MatchQualityBadge when matchScore is provided', () => {
    const provider = buildProvider();
    render(<ProviderCard provider={provider} matchScore={0.85} />);

    // Strong match at 0.85
    expect(screen.getByText('Strong match')).toBeInTheDocument();
  });

  it('does NOT render a MatchQualityBadge when matchScore is not provided', () => {
    const provider = buildProvider();
    render(<ProviderCard provider={provider} />);

    expect(screen.queryByText('Strong match')).not.toBeInTheDocument();
    expect(screen.queryByText('Good match')).not.toBeInTheDocument();
    expect(screen.queryByText('Possible match')).not.toBeInTheDocument();
  });

  it('renders "Request quote" CTA button by default', () => {
    const provider = buildProvider();
    render(<ProviderCard provider={provider} />);

    expect(screen.getByRole('button', { name: 'Request quote' })).toBeInTheDocument();
  });

  it('renders a custom CTA label when ctaLabel is provided', () => {
    const provider = buildProvider();
    render(<ProviderCard provider={provider} ctaLabel="Get a quote" />);

    expect(screen.getByRole('button', { name: 'Get a quote' })).toBeInTheDocument();
  });

  it('calls onCta with the providerId when the CTA button is clicked', () => {
    const onCta = vi.fn();
    const provider = buildProvider({ providerId: 'prov-abc' });
    render(<ProviderCard provider={provider} onCta={onCta} />);

    screen.getByRole('button', { name: 'Request quote' }).click();

    expect(onCta).toHaveBeenCalledWith('prov-abc');
  });

  it('renders "New" star rating when averageRating is null and reviewCount is 0', () => {
    const provider = buildProvider({ averageRating: null, reviewCount: 0 });
    render(<ProviderCard provider={provider} />);

    expect(screen.getByText('New')).toBeInTheDocument();
  });
});
