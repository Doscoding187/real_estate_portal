import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({
  Link: ({ children, href, ...props }: React.PropsWithChildren<{ href?: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { SuburbDevelopers, type SuburbDevelopmentSummary } from '../SuburbDevelopers';

const developmentSummary: SuburbDevelopmentSummary = {
  total: 4,
  byType: { residential: 3, mixed_use: 1, commercial: 0, land: 0 },
  byStatus: { 'launching-soon': 1, selling: 2, 'sold-out': 1 },
  priceFromMinimum: 1_250_000,
  priceToMaximum: 4_800_000,
  publishers: [
    {
      id: 1,
      name: 'Sandton Developments',
      slug: 'sandton-developments',
      logoUrl: null,
      authorityKind: 'developer_first_party',
      developmentCount: 3,
    },
    {
      id: 2,
      name: 'Reference Brand',
      slug: null,
      logoUrl: null,
      authorityKind: 'platform_reference',
      developmentCount: 1,
    },
  ],
};

describe('SuburbDevelopers', () => {
  it('summarises the development mix and links published developers', () => {
    render(
      <SuburbDevelopers
        suburbName="Sandton"
        cityName="Johannesburg"
        provinceName="Gauteng"
        developments={developmentSummary}
        viewAllDevelopmentsHref="/developments?location=suburb%3A81"
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Developers in Sandton' }),
    ).toBeInTheDocument();
    expect(screen.getByText('What is being built in Sandton')).toBeInTheDocument();
    expect(screen.getByText('Residential')).toBeInTheDocument();
    expect(screen.getByText('Mixed use')).toBeInTheDocument();
    expect(screen.getByText(/4 published projects currently recorded/)).toBeInTheDocument();
    expect(screen.getByText(/2 selling now · 1 launching soon · 1 sold out/)).toBeInTheDocument();
    expect(screen.getByText(/R1\.3M – R4\.8M/)).toBeInTheDocument();
    expect(screen.getByText(/2 publishing in this suburb/)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /All developments/ })).toHaveAttribute(
      'href',
      '/developments?location=suburb%3A81',
    );
    expect(screen.getByRole('link', { name: /Sandton Developments/ })).toHaveAttribute(
      'href',
      '/developer/sandton-developments',
    );
    expect(screen.getByRole('link', { name: /Reference Brand/ })).toHaveAttribute(
      'href',
      '/developers?province=Gauteng',
    );
    expect(screen.getByText('Developer profile')).toBeInTheDocument();
    expect(screen.getByText('Catalogue reference')).toBeInTheDocument();
  });

  it('keeps monetisation and discovery paths available without published projects', () => {
    render(
      <SuburbDevelopers
        suburbName="Sandton"
        cityName="Johannesburg"
        provinceName="Gauteng"
        developments={null}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'No new-build projects are published for Sandton on Property Listify yet.',
    );
    expect(screen.getByRole('link', { name: /Browse developers in Gauteng/ })).toHaveAttribute(
      'href',
      '/developers?province=Gauteng',
    );
    expect(screen.getByRole('link', { name: /List your development/ })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );
  });
});
