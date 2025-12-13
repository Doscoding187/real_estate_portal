
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchRefinementBar } from '../SearchRefinementBar';
import { describe, it, expect, vi } from 'vitest';

describe('SearchRefinementBar', () => {
  it('renders with default location', () => {
    render(<SearchRefinementBar onSearch={() => {}} defaultLocation="Sandton" />);
    // Check if location input has value (assuming it's an input or button with text)
    // Based on previous knowledge, it likely pre-fills or shows the location
    expect(screen.getByDisplayValue('Sandton')).toBeDefined();
  });

  it('calls onSearch when search button is clicked', () => {
    const mockSearch = vi.fn();
    render(<SearchRefinementBar onSearch={mockSearch} defaultLocation="Sandton" />);
    
    const searchBtn = screen.getByText('Search');
    fireEvent.click(searchBtn);
    
    expect(mockSearch).toHaveBeenCalled();
  });
});
