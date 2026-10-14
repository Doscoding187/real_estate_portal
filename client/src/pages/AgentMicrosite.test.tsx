import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const {
  profileResult,
  inventoryResult,
  trackMutate,
  createLeadMutate,
  routeState,
  inventoryInputs,
} = vi.hoisted(() => ({
  routeState: { allProperties: false },
  inventoryInputs: [] as Array<Record<string, unknown>>,
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
  createLeadMutate: vi.fn(),
}));

vi.mock('wouter', async original => ({
  ...(await original<typeof import('wouter')>()),
  useRoute: (pattern: string) =>
    pattern === (routeState.allProperties ? '/agents/:slug/properties' : '/agents/:slug')
      ? [true, { slug: 'jane-agent' }]
      : [false, null],
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    analytics: {
      track: {
        useMutation: () => ({ mutate: trackMutate }),
      },
    },
    leads: {
      create: {
        useMutation: () => ({ mutate: createLeadMutate, isPending: false }),
      },
    },
    agent: {
      getPublicProfileBySlug: {
        useQuery: (_input: unknown, _options: unknown) => profileResult.current,
      },
      getPublicInventoryLocationsForAgent: {
        useQuery: () => ({
          data: [
            {
              canonicalPlaceId: 'pl-place-01-dee61758ef3bda7cd1a258ad',
              label: 'Sandton, Johannesburg, Gauteng',
            },
          ],
        }),
      },
      getPublicInventoryPageForAgent: {
        useQuery: (
          input: {
            limit: number;
            listingType?: string;
            canonicalPlaceId?: string;
            cursor?: number;
          },
          _options: unknown,
        ) => {
          inventoryInputs.push(input);
          const matching = inventoryResult.current.data.filter(
            item => !input.listingType || item.listingType === input.listingType,
          );
          const start = input.cursor ? matching.findIndex(item => item.id === input.cursor) + 1 : 0;
          const items = matching.slice(start, start + input.limit);
          return {
            data: {
              items,
              nextCursor: matching.length > start + input.limit ? Number(items.at(-1)?.id) : null,
            },
            isLoading: false,
            isError: false,
            isFetching: false,
            refetch: vi.fn(),
          };
        },
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
  areasServed: [{ canonicalLocationId: 'suburb:11', label: 'Bryanston, Sandton, Gauteng' }],
  languages: 'English',
  isVerified: 1,
  agency: { name: 'Northline Realty' },
  canonicalAreas: [
    {
      canonicalLocationId: 'suburb:11',
      name: 'Bryanston, Sandton, Gauteng',
      type: 'suburb',
      url: '/gauteng/sandton/bryanston',
    },
    { canonicalLocationId: 'suburb:12', name: 'Fourways, Sandton, Gauteng', type: null, url: null },
  ],
};

describe('AgentMicrosite public web presence', () => {
  beforeEach(() => {
    profileResult.current = {
      data: null,
      isLoading: false,
      isError: false,
    };
    routeState.allProperties = false;
    inventoryInputs.length = 0;
    inventoryResult.current = { data: [] };
    trackMutate.mockReset();
    createLeadMutate.mockReset();
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
    expect(screen.getAllByText('Principal Property Practitioner').length).toBeGreaterThan(0);
    expect(screen.getByTestId('agency-affiliation').textContent).toContain('Northline Realty');
    expect(screen.getByTestId('verified-badge')).toBeDefined();
  });

  it('exposes direct contact actions with South African WhatsApp normalization', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };

    render(<AgentMicrosite />);

    const heroActions = screen.getByTestId('hero-contact-actions');
    const whatsapp = heroActions.querySelector('a[href*="wa.me"]') as HTMLAnchorElement;
    const contactActions = screen.getByTestId('contact-actions');
    const call = contactActions.querySelector('a[href^="tel:"]') as HTMLAnchorElement;
    const email = contactActions.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    expect(heroActions.querySelector('a[href^="tel:"]')).toBeNull();
    expect(heroActions.querySelector('a[href^="mailto:"]')).toBeNull();

    expect(whatsapp.getAttribute('href')).toContain('wa.me/27820000000');
    expect(call.getAttribute('href')).toBe('tel:082 000 0000');
    expect(email.getAttribute('href')).toBe('mailto:jane@example.com');
  });

  it('captures a consent-aware profile enquiry for the selected agent CRM', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };

    render(<AgentMicrosite />);

    fireEvent.click(screen.getByTestId('send-profile-enquiry'));

    const dialog = screen.getByTestId('agent-profile-enquiry-dialog');
    expect(within(dialog).getByText(/goes directly to Jane Agent/i)).toBeDefined();
    fireEvent.change(within(dialog).getByLabelText(/Your name/i), {
      target: { value: 'Local Journey Buyer' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Email address/i), {
      target: { value: 'buyer@example.test' },
    });
    fireEvent.change(within(dialog).getByLabelText(/How can Jane Agent help/i), {
      target: { value: 'I am looking for a two-bedroom apartment.' },
    });
    fireEvent.click(within(dialog).getByLabelText(/I agree to be contacted/i));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send enquiry' }));

    expect(createLeadMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 42,
        source: 'agent_profile',
        sourceSurface: 'agent_profile_enquiry',
        leadSource: 'agent_profile',
        name: 'Local Journey Buyer',
        email: 'buyer@example.test',
      }),
    );
    expect(trackMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'agent_profile_contact_cta',
        properties: expect.objectContaining({
          action: 'send_enquiry',
          surface: 'hero',
          agentId: 42,
        }),
      }),
    );
  });

  it('uses neutral local-market copy instead of an awkward possessive heading', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };

    render(<AgentMicrosite />);

    expect(screen.getByRole('heading', { name: 'Areas I work in' })).toBeDefined();
    expect(screen.getByRole('article', {name:'Bryanston, Sandton, Gauteng'})).toBeDefined();
    expect(screen.queryByText("Jane's Bryanston")).toBeNull();
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
    const card = screen.getByTestId('inventory-card');
    expect(
      within(card)
        .getByRole('link', { name: /Bryanston Family Home/ })
        .getAttribute('href'),
    ).toBe('/property/7');
  });

  it('uses the homepage card with approved location and compact property facts', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };
    inventoryResult.current = {
      data: [
        {
          id: 7,
          title: 'Bryanston Family Home',
          listingType: 'sale',
          price: 2500000,
          bedrooms: 4,
          bathrooms: 2,
          internalAreaM2: 140,
          propertyType: 'house',
          erfSizeM2: 600,
          mainImage: '/test/property.jpg',
          images: [{ url: '/test/property.jpg' }],
          publicIdentity: { role: 'agent', provenance: 'agent', name: 'Jane Agent' },
          detailPresentation: {
            location: { label: 'Bryanston, Sandton, Gauteng' },
            media: { photoCount: 12 },
          },
        },
      ],
    };
    render(<AgentMicrosite />);
    const card = screen.getByTestId('inventory-card');
    expect(card.querySelector('[class*="aspect-"]')).not.toBeNull();
    expect(within(card).getByText('140 m²')).toBeInTheDocument();
    expect(card.textContent).toContain('600 m²');
    expect(card.textContent).toContain('4 Bed');
    expect(card.textContent).toContain('2 Bath');
    expect(card.textContent).toContain('Bryanston, Sandton, Gauteng');
    expect(card.textContent).toContain('For sale');
    expect(card.textContent).not.toContain('South Africa');
    fireEvent.click(within(card).getByRole('link'));
    expect(trackMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'agent_profile_listing_click',
        properties: expect.objectContaining({ propertyId: 7, agentId: 42 }),
      }),
    );
  });
  it('retains rental price and tenancy semantics in the shared card', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };
    inventoryResult.current = {
      data: [
        {
          id: 9,
          title: 'Rental Apartment',
          listingType: 'rent',
          price: 12000,
          bedrooms: 2,
          bathrooms: 1,
          internalAreaM2: 70,
          city: 'Sandton',
          images: [],
        },
      ],
    };
    render(<AgentMicrosite />);
    expect(screen.getByTestId('inventory-card').textContent).toContain('/ month');
    expect(screen.getByTestId('inventory-card').textContent).toContain('To rent');
  });
  it('does not override an explicit pricing contract with a loose public price', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };
    inventoryResult.current = {
      data: [
        {
          id: 9,
          title: 'Rental Apartment',
          listingType: 'rent',
          price: 12000,
          pricingContract: { version: 1, intent: 'rent', deposit: { status: 'unknown' } },
        },
      ],
    };
    render(<AgentMicrosite />);
    expect(screen.getByTestId('inventory-card').textContent).toContain('Price on request');
    expect(screen.getByTestId('inventory-card').textContent).not.toContain('12,000');
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

  it('keeps the homepage showcase bounded and links to the agent inventory route', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };
    inventoryResult.current = {
      data: Array.from({ length: 25 }, (_, index) => ({
        id: index + 1,
        title: `Listing ${index + 1}`,
        listingType: 'sale',
        price: 1000000,
      })),
    };
    render(<AgentMicrosite />);
    expect(screen.getAllByTestId('inventory-card')).toHaveLength(5);
    expect(screen.getByTestId('view-all-properties').getAttribute('href')).toBe(
      '/agents/jane-agent/properties',
    );
    expect(screen.queryByText('25 properties')).toBeNull();
  });

  it('places the all-guides action with the intro and each individual guide inside its own card', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };
    render(<AgentMicrosite />);
    const intro = screen.getByTestId('area-guides-intro');
    expect(
      within(intro).getByRole('link', { name: 'Explore all area guides' }).getAttribute('href'),
    ).toBe('/tools/area-guides');
    const bryanston = screen.getByRole('article', { name: 'Bryanston, Sandton, Gauteng' });
    expect(
      within(bryanston)
        .getByRole('link', { name: 'Explore guide for Bryanston, Sandton, Gauteng' })
        .getAttribute('href'),
    ).toBe('/gauteng/sandton/bryanston');
    const fourways = screen.getByRole('article', { name: 'Fourways, Sandton, Gauteng' });
    expect(within(fourways).queryByRole('link')).toBeNull();
    expect(within(fourways).getByText('Guide not available yet')).toBeDefined();
  });

  it('filters rentals in the showcase without affecting area guide selection', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };
    inventoryResult.current = {
      data: [
        { id: 1, title: 'Sale House', listingType: 'sale', price: 1000000 },
        { id: 2, title: 'Rental Flat', listingType: 'rent', price: 12000 },
      ],
    };
    render(<AgentMicrosite />);
    fireEvent.click(screen.getByRole('button', { name: 'To rent' }));
    expect(screen.getAllByTestId('inventory-card')).toHaveLength(1);
    expect(screen.getByTestId('inventory-card').textContent).toContain('Rental Flat');
    expect(screen.getByTestId('areas-section').textContent).toContain('Bryanston');
  });

  it('hides missing biography and professional details instead of exposing filler', () => {
    profileResult.current = {
      data: {
        ...baseProfile,
        bio: null,
        languages: null,
        specialization: null,
        socialLinks: null,
        licenseNumber: null,
        agency: null,
      },
      isLoading: false,
      isError: false,
    };
    render(<AgentMicrosite />);
    expect(screen.queryByTestId('about-section')).toBeNull();
    expect(screen.queryByText(/has not added a public biography/)).toBeNull();
    expect(screen.queryByText(/free valuation/i)).toBeNull();
    expect(screen.queryByText(/PPRA verified/i)).toBeNull();
  });

  it('collapses long area lists and lets visitors select the remaining canonical areas', () => {
    const canonicalAreas = Array.from({ length: 7 }, (_, index) => ({
      canonicalLocationId: `suburb:${index + 1}`,
      name: `Area ${index + 1}, Gauteng`,
      type: 'suburb',
      url: `/gauteng/area-${index + 1}`,
    }));
    profileResult.current = {
      data: { ...baseProfile, canonicalAreas },
      isLoading: false,
      isError: false,
    };
    render(<AgentMicrosite />);
    expect(screen.queryByRole('article', { name: /Area 7/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'See all 7 areas' }));
    expect(
      within(screen.getByRole('article', { name: 'Area 7, Gauteng' }))
        .getByRole('link')
        .getAttribute('href'),
    ).toBe('/gauteng/area-7');
  });

  it('pages the full inventory and resets the cursor when transaction filters change', () => {
    routeState.allProperties = true;
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };
    inventoryResult.current = {
      data: Array.from({ length: 25 }, (_, index) => ({
        id: index + 1,
        title: `Listing ${index + 1}`,
        listingType: 'sale',
        price: 1000000,
      })),
    };
    render(<AgentMicrosite />);
    expect(screen.getAllByTestId('inventory-card')).toHaveLength(12);
    expect(screen.getByRole('heading', { name: 'Properties with Jane' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 2')).toBeDefined();
    expect(screen.getAllByTestId('inventory-card')[0].textContent).toContain('Listing 13');
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getAllByTestId('inventory-card')[0].textContent).toContain('Listing 1');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'To rent' }));
    expect(screen.getByText('Page 1')).toBeDefined();
    expect(screen.getByText('No current properties match these filters.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('passes exact canonical inventory filters independently of the guide panel', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };
    inventoryResult.current = { data: [{ id: 1, title: 'Home', listingType: 'sale' }] };
    render(<AgentMicrosite />);
    fireEvent.change(screen.getByLabelText('Filter properties by area'), {
      target: { value: 'pl-place-01-dee61758ef3bda7cd1a258ad' },
    });
    expect(inventoryInputs[inventoryInputs.length - 1]).toEqual(
      expect.objectContaining({
        canonicalPlaceId: 'pl-place-01-dee61758ef3bda7cd1a258ad',
        limit: 6,
      }),
    );
  });

  it('retains the cover photo when a rental filter has no results', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };
    inventoryResult.current = {
      data: [
        { id: 1, title: 'House', listingType: 'sale', mainImage: '/property.jpg', images: [] },
      ],
    };
    const { container } = render(<AgentMicrosite />);
    const image = container.querySelector('.as-hero-image');
    expect(image).not.toBeNull();
    const source = image!.getAttribute('src');
    fireEvent.click(screen.getByRole('button', { name: 'To rent' }));
    expect(container.querySelector('.as-hero-image')?.getAttribute('src')).toBe(source);
    expect(screen.getByText('No current properties match these filters.')).toBeDefined();
  });

  it('omits the inventory module entirely when the agent has no public mandates', () => {
    profileResult.current = { data: baseProfile as never, isLoading: false, isError: false };

    render(<AgentMicrosite />);

    expect(screen.queryByTestId('inventory-section')).toBeNull();
  });
});
