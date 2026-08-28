import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PropertyImageGallery } from './PropertyImageGallery';

describe('PropertyImageGallery buyer media states', () => {
  it('keeps a property actionable when no photos are available', () => {
    render(<PropertyImageGallery images={[]} propertyTitle="No-photo property" />);

    expect(screen.getByText('Photos have not been added yet')).toBeInTheDocument();
    expect(
      screen.getByText(/still review the property details and send an enquiry/i),
    ).toBeInTheDocument();
  });

  it('hides media filters that have no supported media', () => {
    render(
      <PropertyImageGallery
        images={[{ id: 1, imageUrl: '/property.jpg', isPrimary: 1 }]}
        propertyTitle="Photo property"
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Photos, 1' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Videos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /3D Tour/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Floor Plan/i })).not.toBeInTheDocument();
  });

  it('shows and invokes a supported video action', () => {
    const onOpenVideos = vi.fn();
    render(
      <PropertyImageGallery
        images={[{ id: 1, imageUrl: '/property.jpg', isPrimary: 1 }]}
        propertyTitle="Media property"
        videoCount={2}
        onOpenVideos={onOpenVideos}
      />,
    );

    const videoButtons = screen.getAllByRole('button', { name: 'Videos, 2' });
    expect(videoButtons).toHaveLength(2);
    fireEvent.click(videoButtons[0]);
    expect(onOpenVideos).toHaveBeenCalledTimes(1);
  });

  it('keeps carousel chevrons hidden until intentional desktop hover or keyboard focus', () => {
    render(
      <PropertyImageGallery
        images={[
          { id: 1, imageUrl: '/property-1.jpg', isPrimary: 1 },
          { id: 2, imageUrl: '/property-2.jpg' },
        ]}
        propertyTitle="Two-photo property"
      />,
    );

    const previous = screen.getByRole('button', { name: 'Previous photo' });
    const next = screen.getByRole('button', { name: 'Next photo' });
    expect(previous).toHaveClass('opacity-0', 'pointer-events-none', 'md:group-hover:opacity-100');
    expect(previous).toHaveClass('md:group-focus-within:opacity-100');
    expect(next).toHaveClass('opacity-0', 'pointer-events-none', 'md:group-hover:opacity-100');
    expect(next).toHaveClass('md:group-focus-within:opacity-100');
  });

  it('grounds an overflow gallery tile in the next available property photo', () => {
    render(
      <PropertyImageGallery
        images={[
          { id: 1, imageUrl: '/property-1.jpg', isPrimary: 1 },
          { id: 2, imageUrl: '/property-2.jpg' },
          { id: 3, imageUrl: '/property-3.jpg' },
          { id: 4, imageUrl: '/property-4.jpg' },
          { id: 5, imageUrl: '/property-5.jpg' },
          { id: 6, imageUrl: '/property-6.jpg' },
        ]}
        propertyTitle="Six-photo property"
      />,
    );

    const overflowTile = screen.getByRole('button', { name: 'View all 6 photos' });
    expect(overflowTile.querySelector('img')).toHaveAttribute('src', '/property-6.jpg');
    expect(overflowTile).toHaveTextContent('+1');
  });
});
