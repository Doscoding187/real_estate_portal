import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { profileResult, inventoryResult, trackMutate } = vi.hoisted(() => ({
  profileResult: {
    current: {
      data: null as Record<string, unknown> | null,
      isLoading: false,
      isError: false,
    },
  },
  inventoryResult: {
    current: { data: [] as Array<Record<string, unknown>> },
  },
  trackMutate: vi.fn(),
}));

vi.mock('wouter', () => ({
  useRoute: (pattern: string) =>
    pattern === '/agents/:slug' ? [true, { slug: 'jane-agent' }] : [false, null],
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    analytics: {
      track: {
        useMutation: () => ({ mutate: trackMutate }),
      },
    },
    agent: {
      getPublicProfileBySlug: {
        useQuery: (_input: unknown, _options: unknown) => profileResult.current,
      },
      getPublicInventoryForAgent: {
        useQuery: (_input: unknown, _options: unknown) => inventoryResult.current,
      },
    },
  },
}));

vi.mock('@/lib/seo', () => ({
  applySeo: vi.fn(),
}));

import AgentMicrosite from './AgentMicrosite';

const baseProfile = {
  id: 42,
  firstName: 'Jane',
  lastName: 'Agent',
  displayName: 'Jane Agent',
  slug: 'jane-agent',
  bio: 'Bryanston residential specialist.',
  profileImage: null,
  phone: '082 000 0000',
  whatsapp: '082 000 0000',
  email: 'jane@example.com',
  role: 'principal_agent',
  focus: 'sales',
  specialization: 'Residential Sales, Sectional Title',
  propertyTypes: null,
  socialLinks: null,
  licenseNumber: null,
  yearsExperience: 12,
  areasServed: 'Bryanston',
  languages: 'English',
  isVerified: 1,
  agency: { name: 'Northline Realty' },
  canonicalAreas: [
    { name: 'Bryanston', type: 'suburb', url: '/gauteng/sandton/bryanston' },
    { name: 'Fourways', type: null, url: null },
  ],
};

describe('AgentMicrosite public web presence', () => {
  beforeEach(() => {
    profileResult.current = {
      data: null,
      isLoading: false,
      isError: false,
    };
    inventoryResult.current = { data: [] };
    trackMutate.mockReset();
  });

  afterEach(() => cleanup());

  it('renders the loading state while the public projection resolves', () => {
    profileResult.current = { data: null, isLoading: true, isError: false };

    render(<AgentMicrosite />);

    expect(screen.getByText('Loading professional profile...')).toBeDefined();
  });

  it('renders a graceful unavailable state for non-public agents', () => {
    render(<AgentMicrosite />);

    expect(screen.getByText('Profile not available')).toBeDefined();
  });

  it('presents the agent-owned identity, role and agency affiliation', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };

    render(<AgentMicrosite />);

    expect(screen.getByTestId('agent-name').textContent).toBe('Jane Agent');
    expect(screen.getByText('Principal Property Practitioner')).toBeDefined();
    expect(screen.getByTestId('agency-affiliation').textContent).toContain('Northline Realty');
    expect(screen.getByTestId('verified-badge')).toBeDefined();
  });

  it('exposes direct contact actions with South African WhatsApp normalization', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };

    render(<AgentMicrosite />);

    const heroActions = screen.getByTestId('hero-contact-actions');
    const whatsapp = heroActions.querySelector('a[href*="wa.me"]') as HTMLAnchorElement;
    const call = heroActions.querySelector('a[href^="tel:"]') as HTMLAnchorElement;
    const email = heroActions.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;

    expect(whatsapp.getAttribute('href')).toContain('wa.me/27820000000');
    expect(call.getAttribute('href')).toBe('tel:082 000 0000');
    expect(email.getAttribute('href')).toBe('mailto:jane@example.com');
  });

  it('never fabricates unpopulated professional claims', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };

    render(<AgentMicrosite />);

    expect(screen.getByText('12+ years experience')).toBeDefined();
    expect(screen.queryByText(/Properties Sold/i)).toBeNull();
    expect(screen.queryByText(/0\+/)).toBeNull();
  });

  it('links served areas only where canonical geography resolved them', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };

    render(<AgentMicrosite />);

    const canonicalLink = screen.getByTestId('area-guide-link') as HTMLAnchorElement;
    expect(canonicalLink.getAttribute('href')).toBe('/gauteng/sandton/bryanston');

    const areasSection = screen.getByTestId('areas-section');
    expect(areasSection.textContent).toContain('Fourways');
    expect(areasSection.querySelector('a[href="/fourways"]')).toBeNull();
  });

  it('projects canonically public inventory with links to the marketplace detail route', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };
    inventoryResult.current = {
      data: [
        {
          id: 7,
          title: 'Bryanston Family Home',
          listingType: 'sale',
          price: '2500000',
          suburb: 'Bryanston',
          city: 'Sandton',
          bedrooms: 4,
          bathrooms: 2,
          mainImage: null,
          images: [],
        },
      ],
    };

    render(<AgentMicrosite />);

    const section = screen.getByTestId('inventory-section');
    expect(section.textContent).toContain('Bryanston Family Home');
    const card = screen.getByTestId('inventory-card') as HTMLAnchorElement;
    expect(card.getAttribute('href')).toBe('/property/7');
  });

  it('never emits contact PII in analytics payloads', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };

    render(<AgentMicrosite />);

    const heroActions = screen.getByTestId('hero-contact-actions');
    const whatsapp = heroActions.querySelector('a[href*="wa.me"]') as HTMLAnchorElement;
    fireEvent.click(whatsapp);

    const serializedPayloads = trackMutate.mock.calls.map(call => JSON.stringify(call[0]));
    expect(serializedPayloads.length).toBeGreaterThan(0);
    for (const payload of serializedPayloads) {
      expect(payload).not.toContain('082 000 0000');
      expect(payload).not.toContain('27820000000');
      expect(payload).not.toContain('jane@example.com');
    }
  });

  it('reveals the complete bounded inventory progressively via View All', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };
    inventoryResult.current = {
      data: Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        title: `Listing ${index + 1}`,
        listingType: 'sale',
        price: '1000000',
        suburb: 'Bryanston',
        city: 'Sandton',
        bedrooms: 3,
        bathrooms: 2,
        mainImage: null,
        images: [],
      })),
    };

    render(<AgentMicrosite />);

    const section = screen.getByTestId('inventory-section');
    expect(section.querySelectorAll('[data-testid="inventory-card"]')).toHaveLength(6);
    expect(screen.queryByTestId('view-all-properties')).not.toBeNull();

    fireEvent.click(screen.getByTestId('view-all-properties'));

    expect(section.querySelectorAll('[data-testid="inventory-card"]')).toHaveLength(8);
    expect(screen.queryByTestId('view-all-properties')).toBeNull();
  });

  it('omits the inventory module entirely when the agent has no public mandates', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };

    render(<AgentMicrosite />);

    expect(screen.queryByTestId('inventory-section')).toBeNull();
  });
});
