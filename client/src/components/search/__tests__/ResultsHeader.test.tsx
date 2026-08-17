import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultsHeader } from '../ResultsHeader';

const baseProps = {
  viewMode: 'list' as const,
  sortBy: 'relevance' as const,
  onViewModeChange: vi.fn(),
  onSortChange: vi.fn(),
};

describe('ResultsHeader result truth', () => {
  it('does not present a live signal, zero count, or result actions while loading', () => {
    render(<ResultsHeader {...baseProps} isLoading />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Finding properties that match your search',
    );
    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 matches/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show map view' })).not.toBeInTheDocument();
  });

  it('does not present a zero count or result actions when search fails', () => {
    render(<ResultsHeader {...baseProps} resultCount={0} hasError />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Property results are temporarily unavailable',
    );
    expect(screen.queryByText(/0 matches/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show map view' })).not.toBeInTheDocument();
  });

  it('renders only a settled authoritative count and exposes selected view state', () => {
    const onViewModeChange = vi.fn();
    render(<ResultsHeader {...baseProps} resultCount={1} onViewModeChange={onViewModeChange} />);

    expect(screen.getByRole('status')).toHaveTextContent('1 property ready to review');
    expect(screen.getByText('1 matches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show list view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show map view' }));
    expect(onViewModeChange).toHaveBeenCalledWith('map');
  });
});
