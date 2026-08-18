import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ListingResultCard } from '../ListingResultCard';

const testState = vi.hoisted(() => ({
  modalProps: null as Record<string, unknown> | null,
}));

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/property/PropertyContactModal', () => ({
  PropertyContactModal: (props: Record<string, unknown>) => {
    testState.modalProps = props;
    return null;
  },
}));

describe('ListingResultCard Buy identity', () => {
  it('uses canonical agency identity and keeps an agency-owned property actionable', () => {
    const onOpen = vi.fn();
    render(
      <ListingResultCard
        data={{
          id: '501',
          propertyId: 501,
          title: 'Agency-owned family home',
          location: 'Parkhurst, Johannesburg',
          price: 4_250_000,
          image: '/home.jpg',
          onOpen,
          listingType: 'sale',
          listingSource: 'manual',
          cataloguePublisherId: 999,
          developmentId: 998,
          // Deliberately contradictory legacy hints: canonical identity must win.
          listerType: 'agent',
          contactRole: 'agent',
          identity: {
            role: 'agency',
            provenance: 'agency',
            name: 'Northside Realty',
            agencyId: 72,
            organizationLogoUrl: '/northside.svg',
          },
        }}
      />,
    );

    expect(screen.getByText('Northside Realty')).toBeInTheDocument();
    expect(screen.queryByText('Listing Agent')).not.toBeInTheDocument();
    expect(screen.queryByText('Private Seller')).not.toBeInTheDocument();
    const propertyLink = screen.getByRole('link', { name: 'View Agency-owned family home' });
    expect(propertyLink).toHaveAttribute('href', '/property/501');
    propertyLink.focus();
    expect(propertyLink).toHaveFocus();

    const contactButton = screen.getByRole('button', { name: 'Contact Agency' });
    expect(contactButton).toBeEnabled();
    expect(propertyLink).not.toContainElement(contactButton);
    fireEvent.click(contactButton);
    expect(onOpen).not.toHaveBeenCalled();
    expect(testState.modalProps).toMatchObject({
      propertyId: 501,
      cataloguePublisherId: undefined,
      developmentId: undefined,
      submitLabel: 'Send enquiry',
    });
  });

  it('fails closed to property detail instead of inventing a seller for missing identity', () => {
    render(
      <ListingResultCard
        data={{
          id: '502',
          propertyId: 502,
          href: '/property/502',
          title: 'Unresolved legacy projection',
          location: 'Johannesburg, Gauteng',
          price: 2_100_000,
          image: '/home.jpg',
          listingType: 'sale',
          listingSource: 'manual',
        }}
      />,
    );

    expect(screen.getByText('Listing contact unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Private Seller')).not.toBeInTheDocument();
    expect(screen.queryByText('Property Listify')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'View Unresolved legacy projection' })).toHaveAttribute(
      'href',
      '/property/502',
    );
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      '/property/502',
    );
    expect(testState.modalProps).toMatchObject({ isOpen: false });
  });
});
