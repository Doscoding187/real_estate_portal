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
            mediaType: 'pdf',
            originalFileName: 'floor-plan.pdf',
          },
          { id: 3, url: 'https://cdn.example.com/front.jpg', mediaType: 'image' },
        ]}
      />,
    );

    expect(document.querySelector('video')).toHaveAttribute(
      'src',
      'https://cdn.example.com/tour.mp4',
    );
    expect(screen.getByRole('link', { name: /open property document/i })).toHaveAttribute(
      'href',
      'https://cdn.example.com/plan.pdf',
    );
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
});
