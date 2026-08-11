import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PropertyMediaTypeSection } from './PropertyMediaTypeSection';

describe('PropertyMediaTypeSection', () => {
  it('renders video as video and documents as links, never as gallery images', () => {
    render(
      <PropertyMediaTypeSection
        media={[
          { id: 1, url: 'https://cdn.example.com/tour.mp4', mediaType: 'video' },
          {
            id: 2,
            url: 'https://cdn.example.com/plan.pdf',
            mediaType: 'floorplan',
            presentationKind: 'floorplan',
            presentationLabel: 'Ground floor',
            originalFileName: 'floor-plan.pdf',
          },
          {
            id: 4,
            url: 'https://cdn.example.com/brochure.pdf',
            mediaType: 'pdf',
            presentationKind: 'document',
            presentationLabel: 'Property brochure',
          },
          { id: 3, url: 'https://cdn.example.com/front.jpg', mediaType: 'image' },
        ]}
        virtualTour={{
          provider: 'matterport',
          embedUrl: 'https://my.matterport.com/show/?m=abc123',
          status: 'active',
        }}
      />,
    );

    expect(document.querySelector('video')).toHaveAttribute(
      'src',
      'https://cdn.example.com/tour.mp4',
    );
    expect(screen.getByRole('link', { name: /ground floor/i })).toHaveAttribute(
      'href',
      'https://cdn.example.com/plan.pdf',
    );
    expect(screen.getByRole('heading', { name: 'Plans & layouts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Documents' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '3D / virtual tour' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open 3d tour/i })).toHaveAttribute(
      'href',
      'https://my.matterport.com/show/?m=abc123',
    );
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
});
