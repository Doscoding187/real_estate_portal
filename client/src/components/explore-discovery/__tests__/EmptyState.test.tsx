/**
 * EmptyState Component Tests
 * 
 * Tests for the EmptyState component and its variants
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  EmptyState, 
  EmptyStateCard, 
  InlineEmptyState,
  useEmptyState 
} from '../EmptyState';
import { renderHook } from '@testing-library/react';

describe('EmptyState', () => {
  describe('Basic Rendering', () => {
    it('renders with noResults type', () => {
      render(<EmptyState type="noResults" />);
      
      expect(screen.getByText('No properties found')).toBeInTheDocument();
      expect(screen.getByText(/couldn't find any properties/i)).toBeInTheDocument();
    });

    it('renders with noLocation type', () => {
      render(<EmptyState type="noLocation" />);
      
      expect(screen.getByText('Enable location access')).toBeInTheDocument();
      expect(screen.getByText(/personalized property recommendations/i)).toBeInTheDocument();
    });

    it('renders with offline type', () => {
      render(<EmptyState type="offline" />);
      
      expect(screen.getByText("You're offline")).toBeInTheDocument();
      expect(screen.getByText(/not connected to the internet/i)).toBeInTheDocument();
    });

    it('renders with noSavedProperties type', () => {
      render(<EmptyState type="noSavedProperties" />);
      
      expect(screen.getByText('No saved properties yet')).toBeInTheDocument();
      expect(screen.getByText(/Start exploring/i)).toBeInTheDocument();
    });

    it('renders with noFollowedItems type', () => {
      render(<EmptyState type="noFollowedItems" />);
      
      expect(screen.getByText('Not following anyone yet')).toBeInTheDocument();
      expect(screen.getByText(/Follow developers/i)).toBeInTheDocument();
    });

    it('renders with noContent type', () => {
      render(<EmptyState type="noContent" />);
      
      expect(screen.getByText('No content available')).toBeInTheDocument();
      expect(screen.getByText(/no content to display/i)).toBeInTheDocument();
    });

    it('renders with noFiltersMatch type', () => {
      render(<EmptyState type="noFiltersMatch" />);
      
      expect(screen.getByText('No matches for these filters')).toBeInTheDocument();
      expect(screen.getByText(/broadening your search/i)).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('renders custom title', () => {
      render(
        <EmptyState
          type="noResults"
          customTitle="Custom Title"
        />
      );
      
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.queryByText('No properties found')).not.toBeInTheDocument();
    });

    it('renders custom description', () => {
      render(
        <EmptyState
          type="noResults"
          customDescription="Custom description text"
        />
      );
      
      expect(screen.getByText('Custom description text')).toBeInTheDocument();
    });

    it('renders custom action label', () => {
      render(
        <EmptyState
          type="noResults"
          customActionLabel="Custom Action"
          onAction={() => {}}
        />
      );
      
      expect(screen.getByText('Custom Action')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('calls onAction when primary button clicked', () => {
      const handleAction = vi.fn();
      
      render(
        <EmptyState
          type="noResults"
          onAction={handleAction}
        />
      );
      
      const button = screen.getByText('Clear Filters');
      fireEvent.click(button);
      
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('calls onSecondaryAction when secondary button clicked', () => {
      const handleSecondaryAction = vi.fn();
      
      render(
        <EmptyState
          type="noResults"
          onAction={() => {}}
          onSecondaryAction={handleSecondaryAction}
        />
      );
      
      const button = screen.getByText('Browse All');
      fireEvent.click(button);
      
      expect(handleSecondaryAction).toHaveBeenCalledTimes(1);
    });

    it('does not render action buttons when no handlers provided', () => {
      render(<EmptyState type="noResults" />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders only primary action when no secondary handler', () => {
      render(
        <EmptyState
          type="noSavedProperties"
          onAction={() => {}}
        />
      );
      
      expect(screen.getByText('Explore Properties')).toBeInTheDocument();
      expect(screen.queryByText('Browse All')).not.toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('applies compact styling when compact prop is true', () => {
      const { container } = render(
        <EmptyState
          type="noResults"
          compact
        />
      );
      
      // Check for compact padding class
      const wrapper = container.querySelector('.p-6');
      expect(wrapper).toBeInTheDocument();
    });

    it('applies regular styling when compact prop is false', () => {
      const { container } = render(
        <EmptyState
          type="noResults"
          compact={false}
        />
      );
      
      // Check for regular padding class
      const wrapper = container.querySelector('.p-12');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on buttons', () => {
      render(
        <EmptyState
          type="noResults"
          onAction={() => {}}
        />
      );
      
      const button = screen.getByLabelText('Clear Filters');
      expect(button).toBeInTheDocument();
    });

    it('has proper role on icon', () => {
      render(<EmptyState type="noResults" />);
      
      const icon = screen.getByRole('img', { name: /noResults icon/i });
      expect(icon).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      const handleAction = vi.fn();
      
      render(
        <EmptyState
          type="noResults"
          onAction={handleAction}
        />
      );
      
      const button = screen.getByText('Clear Filters');
      button.focus();
      
      expect(document.activeElement).toBe(button);
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleAction).toHaveBeenCalled();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <EmptyState
          type="noResults"
          className="custom-class"
        />
      );
      
      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });
  });
});

describe('EmptyStateCard', () => {
  it('renders EmptyState wrapped in ModernCard', () => {
    render(
      <EmptyStateCard
        type="noResults"
        onAction={() => {}}
      />
    );
    
    expect(screen.getByText('No properties found')).toBeInTheDocument();
  });

  it('applies custom card className', () => {
    const { container } = render(
      <EmptyStateCard
        type="noResults"
        cardClassName="custom-card-class"
      />
    );
    
    const card = container.querySelector('.custom-card-class');
    expect(card).toBeInTheDocument();
  });

  it('passes through EmptyState props', () => {
    const handleAction = vi.fn();
    
    render(
      <EmptyStateCard
        type="noResults"
        customTitle="Custom Title"
        onAction={handleAction}
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalled();
  });
});

describe('InlineEmptyState', () => {
  it('renders with default icon', () => {
    render(
      <InlineEmptyState
        message="No items found"
      />
    );
    
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    const { container } = render(
      <InlineEmptyState
        message="No items found"
      />
    );
    
    // Icon should be rendered
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const handleAction = vi.fn();
    
    render(
      <InlineEmptyState
        message="No items found"
        actionLabel="Add Item"
        onAction={handleAction}
      />
    );
    
    const button = screen.getByText('Add Item');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when not provided', () => {
    render(
      <InlineEmptyState
        message="No items found"
      />
    );
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <InlineEmptyState
        message="No items found"
        className="custom-inline-class"
      />
    );
    
    const wrapper = container.querySelector('.custom-inline-class');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('useEmptyState Hook', () => {
  it('returns showEmpty false when loading', () => {
    const { result } = renderHook(() =>
      useEmptyState(false, true, null)
    );
    
    expect(result.current.showEmpty).toBe(false);
    expect(result.current.emptyType).toBe(null);
  });

  it('returns showEmpty false when error exists', () => {
    const { result } = renderHook(() =>
      useEmptyState(false, false, new Error('Test error'))
    );
    
    expect(result.current.showEmpty).toBe(false);
    expect(result.current.emptyType).toBe(null);
  });

  it('returns showEmpty true when no data and not loading', () => {
    const { result } = renderHook(() =>
      useEmptyState(false, false, null)
    );
    
    expect(result.current.showEmpty).toBe(true);
    expect(result.current.emptyType).toBe('noResults');
  });

  it('returns showEmpty false when has data', () => {
    const { result } = renderHook(() =>
      useEmptyState(true, false, null)
    );
    
    expect(result.current.showEmpty).toBe(false);
    expect(result.current.emptyType).toBe(null);
  });
});

describe('Integration Tests', () => {
  it('works with conditional rendering', () => {
    const { rerender } = render(
      <div>
        {false && <EmptyState type="noResults" />}
        {true && <div>Content</div>}
      </div>
    );
    
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByText('No properties found')).not.toBeInTheDocument();
    
    rerender(
      <div>
        {true && <EmptyState type="noResults" />}
        {false && <div>Content</div>}
      </div>
    );
    
    expect(screen.getByText('No properties found')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('handles multiple empty states on same page', () => {
    render(
      <div>
        <EmptyState type="noResults" />
        <EmptyState type="noLocation" />
      </div>
    );
    
    expect(screen.getByText('No properties found')).toBeInTheDocument();
    expect(screen.getByText('Enable location access')).toBeInTheDocument();
  });
});
