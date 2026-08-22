import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listResult, refetch } = vi.hoisted(() => ({
  listResult: {
    current: {
      data: [] as Array<Record<string, unknown>> | undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    },
  },
  refetch: vi.fn(),
}));

vi.mock('wouter', () => ({
  Link: ({
    children,
    href,
    ...rest
  }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    agent: {
      list: {
        useQuery: () => listResult.current,
      },
    },
  },
}));

vi.mock('@/layouts/HomeLayout', () => ({
  HomeLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Agents from './Agents';

const discoveryAgent = {
  id: 42,
  firstName: 'Jane',
  lastName: 'Agent',
  displayName: null as string | null,
  slug: 'jane-agent-42',
  bio: 'Bryanston specialist.',
  profileImage: null,
  phone: '+27 82 000 0000',
  email: 'jane@example.com',
  role: 'agent',
  focus: 'sales',
  specialization: 'Residential Sales, Sectional Title',
  propertyTypes: null,
  yearsExperience: 12,
  areasServed: 'Bryanston, Sandton',
  languages: 'English',
  isVerified: 1,
};

describe('Agents public discovery page', () => {
  beforeEach(() => {
    listResult.current = { data: undefined, isLoading: false, isError: false, refetch };
  });

  afterEach(() => cleanup());

  it('renders skeleton placeholders while loading', () => {
    listResult.current = { ...listResult.current, isLoading: true };

    const { container } = render(<Agents />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders a distinct error state with retry instead of an empty catalogue', () => {
    listResult.current = { ...listResult.current, isError: true, refetch };

    render(<Agents />);

    expect(screen.getByText('Something went wrong')).toBeDefined();
    fireEvent.click(screen.getByText('Try again'));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders the genuine empty state when no approved agents exist', () => {
    listResult.current = { ...listResult.current, data: [] };

    render(<Agents />);

    expect(screen.getByText('No agents found')).toBeDefined();
  });

  it('renders tolerant specialization badges and canonical profile links', () => {
    listResult.current = { ...listResult.current, data: [discoveryAgent] };

    render(<Agents />);

    const badges = screen.getByTestId('agent-specializations');
    expect(badges.textContent).toContain('Residential Sales');
    expect(badges.textContent).toContain('Sectional Title');

    const card = screen.getByTestId('agent-card') as HTMLAnchorElement;
    expect(card.getAttribute('href')).toBe('/agents/jane-agent-42');
    expect(screen.getByText('Jane Agent')).toBeDefined();
  });

  it('fails closed on noncanonical legacy JSON-encoded list fields', () => {
    listResult.current = {
      ...listResult.current,
      data: [
        {
          ...discoveryAgent,
          id: 99,
          slug: 'legacy-agent-99',
          firstName: 'Legacy',
          lastName: 'Agent',
          specialization: '["Residential Sales"]',
        },
      ],
    };

    render(<Agents />);

    // The legacy JSON array is never silently reinterpreted into canonical
    // entries; no clean specialization items may appear from it.
    expect(screen.queryByText('Residential Sales')).toBeNull();
    expect(screen.getByText('Legacy Agent')).toBeDefined();
  });

  it('filters client-side across name, specialization and served areas', () => {
    listResult.current = {
      ...listResult.current,
      data: [discoveryAgent],
    };

    render(<Agents />);

    const input = screen.getByLabelText('Search agents') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Bryanston' } });
    expect(screen.getAllByTestId('agent-card')).toHaveLength(1);

    fireEvent.change(input, { target: { value: 'Cape Town' } });
    expect(screen.queryByTestId('agent-card')).toBeNull();
    expect(screen.getByText('No agents match your search')).toBeDefined();

    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getAllByTestId('agent-card')).toHaveLength(1);
  });
});
