import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchResultsEmptyState } from '../SearchResultsEmptyState';

describe('SearchResultsEmptyState', () => {
  const baseProps = {
    filters: { maxPrice: 12000, minBedrooms: 3 },
    searchDescription: 'No rentals match your search in Rosebank.',
    onClearAllFilters: vi.fn(),
    onClearFilterKeys: vi.fn(),
    onSwitchToSource: vi.fn(),
    onChangeLocations: vi.fn(),
    onBroadenToParent: vi.fn(),
    parentRecoveryLabel: 'Johannesburg',
    onStartOver: vi.fn(),
  };

  it('renders truthful Buy and Rent zero-result recovery headings', () => {
    const { rerender } = render(
      <SearchResultsEmptyState {...baseProps} transactionType="for-sale" />,
    );
    expect(screen.getByText('No matching homes for sale')).toBeInTheDocument();
    expect(screen.getByText(baseProps.searchDescription)).toBeInTheDocument();

    rerender(<SearchResultsEmptyState {...baseProps} transactionType="to-rent" />);
    expect(screen.getByText('No matching rentals')).toBeInTheDocument();
  });

  it('offers deliberate filter, location, parent and start-over actions', () => {
    render(<SearchResultsEmptyState {...baseProps} transactionType="to-rent" />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear price range' }));
    expect(baseProps.onClearFilterKeys).toHaveBeenCalledWith(['minPrice', 'maxPrice']);

    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(baseProps.onClearAllFilters).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Change locations' }));
    expect(baseProps.onChangeLocations).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Search all Johannesburg' }));
    expect(baseProps.onBroadenToParent).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Start a new search' }));
    expect(baseProps.onStartOver).toHaveBeenCalledTimes(1);
  });

  it('does not expose recovery when there are no active optional filter groups', () => {
    render(<SearchResultsEmptyState {...baseProps} filters={{}} transactionType="for-sale" />);

    expect(screen.queryByRole('button', { name: 'Clear price range' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument();
  });
});
