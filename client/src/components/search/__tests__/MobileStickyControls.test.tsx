import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileStickyControls } from '../MobileStickyControls';

describe('MobileStickyControls', () => {
  it('omits a count when no settled result total is supplied', () => {
    render(
      <MobileStickyControls onOpenFilters={vi.fn()} currentView="list" onViewChange={vi.fn()} />,
    );

    expect(screen.queryByText(/found/i)).not.toBeInTheDocument();
  });

  it('shows a legitimate settled zero and exposes an accessible view toggle', () => {
    const onViewChange = vi.fn();
    render(
      <MobileStickyControls
        onOpenFilters={vi.fn()}
        currentView="list"
        onViewChange={onViewChange}
        resultCount={0}
      />,
    );

    expect(screen.getByText('0 found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show map view' }));
    expect(onViewChange).toHaveBeenCalledWith('map');
  });
});
