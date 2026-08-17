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
});
