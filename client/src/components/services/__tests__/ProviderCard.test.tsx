import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderCard, type ProviderDirectoryItem } from '../ProviderCard';

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

function buildProvider(overrides: Partial<ProviderDirectoryItem> = {}): ProviderDirectoryItem {
  return {
    providerId: 123,
    companyName: 'Acme Builders',
    verificationStatus: null,
    headline: 'A clear property service profile',
    services: [
      { code: 'home-renovation', displayName: 'Home Renovation', category: 'home_improvement' },
    ],
    locations: [{ suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng' }],
    ...overrides,
  };
}

describe('ProviderCard', () => {
  it('shows the platform verification state only for verified providers', () => {
    const { unmount } = render(
      <ProviderCard provider={buildProvider({ verificationStatus: 'verified' })} />,
    );
    expect(screen.getByText('Platform verified')).toBeInTheDocument();
    unmount();

    render(<ProviderCard provider={buildProvider({ verificationStatus: 'pending' })} />);
    expect(screen.queryByText('Platform verified')).not.toBeInTheDocument();
  });

  it('does not expose paid placement or publisher-tier claims', () => {
    render(<ProviderCard provider={buildProvider({ verificationStatus: 'verified' })} />);

    expect(screen.getByText('Platform verified')).toBeInTheDocument();
    expect(screen.queryByText('Priority Match')).not.toBeInTheDocument();
    expect(screen.queryByText('Pro Publisher')).not.toBeInTheDocument();
  });

  it('renders the provider service and listed coverage', () => {
    render(
      <ProviderCard
        provider={buildProvider({
          services: [{ displayName: 'Electrical Wiring', category: 'home_improvement' }],
          locations: [{ suburb: 'Rondebosch', city: 'Cape Town', province: 'Western Cape' }],
        })}
      />,
    );

    expect(screen.getByText('Electrical Wiring')).toBeInTheDocument();
    expect(screen.getByText('Rondebosch, Cape Town, Western Cape')).toBeInTheDocument();
  });

  it('uses the service matching the active category', () => {
    render(
      <ProviderCard
        provider={buildProvider({
          services: [
            { displayName: 'Plumbing', category: 'home_improvement' },
            { displayName: 'Moving', category: 'moving' },
          ],
        })}
        serviceCategory="moving"
      />,
    );

    expect(screen.getByText('Moving')).toBeInTheDocument();
    expect(screen.queryByText('Plumbing')).not.toBeInTheDocument();
  });

  it('uses a truthful empty coverage label', () => {
    render(<ProviderCard provider={buildProvider({ locations: [] })} />);
    expect(screen.getByText('Coverage not listed')).toBeInTheDocument();
  });

  it('preserves an explicit journey context on the profile link', () => {
    render(
      <ProviderCard
        provider={buildProvider()}
        profileHref="/services/provider/acme-builders--123?propertyId=7&reasonKey=saved_property"
      />,
    );

    expect(screen.getByRole('link', { name: /view profile/i })).toHaveAttribute(
      'href',
      '/services/provider/acme-builders--123?propertyId=7&reasonKey=saved_property',
    );
  });

  it('does not render a dead request action without an attribution callback', () => {
    render(<ProviderCard provider={buildProvider()} />);
    expect(screen.queryByRole('button', { name: /request/i })).not.toBeInTheDocument();
  });

  it('calls the supplied request callback with the provider id', () => {
    const onCta = vi.fn();
    render(<ProviderCard provider={buildProvider({ providerId: 456 })} onCta={onCta} />);

    screen.getByRole('button', { name: 'Request service' }).click();

    expect(onCta).toHaveBeenCalledWith(456, 'home-renovation');
  });

  it('supports a custom request label', () => {
    render(<ProviderCard provider={buildProvider()} onCta={vi.fn()} ctaLabel="Get a quote" />);
    expect(screen.getByRole('button', { name: 'Get a quote' })).toBeInTheDocument();
  });

  it('does not present an aggregate rating as a public trust claim', () => {
    render(<ProviderCard provider={buildProvider()} />);
    expect(screen.queryByText('4.2')).not.toBeInTheDocument();
  });
});
