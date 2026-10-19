import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UnitMediaFolder } from './UnitMediaFolder';

describe('UnitMediaFolder', () => {
  it('shows an empty state when no unit media is published', () => {
    render(<UnitMediaFolder unitName="Two bedroom" media={null} />);

    expect(screen.getByText('No unit media published yet.')).toBeInTheDocument();
  });

  it('renders gallery images, video renders, and floor plan downloads', () => {
    render(
      <UnitMediaFolder
        unitName="Two bedroom"
        media={{
          gallery: [
            { url: '/gallery/one.jpg', fileName: null, type: 'image' },
            { url: '/gallery/two.jpg', fileName: 'two.jpg', type: 'image' },
          ],
          floorPlans: [{ url: '/plans/two-bed.pdf', fileName: 'two-bed-plan.pdf', type: 'pdf' }],
          renders: [{ url: '/renders/tour.mp4', fileName: '3d-tour.mp4', type: 'video' }],
        }}
      />,
    );

    expect(screen.getByText('4 files')).toBeInTheDocument();
    expect(screen.getByAltText('Two bedroom media 1')).toBeInTheDocument();
    expect(screen.getByAltText('Two bedroom media 2')).toBeInTheDocument();
    expect(screen.getByTitle('two-bed-plan.pdf')).toHaveAttribute('href', '/plans/two-bed.pdf');
    expect(screen.getByTitle('3d-tour.mp4')).toHaveAttribute('href', '/renders/tour.mp4');
    expect(screen.getByTitle('3d-tour.mp4')).toHaveAttribute('target', '_blank');
  });
});
