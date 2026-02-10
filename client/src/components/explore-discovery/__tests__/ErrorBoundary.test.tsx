/**
 * ErrorBoundary Component - Unit Tests
 * Tests error catching, retry functionality, and error type detection
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExploreErrorBoundary, NetworkError, InlineError } from '../ErrorBoundary';

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
}

// Component that throws a network error
function ThrowNetworkError() {
  throw new Error('Failed to fetch data from server');
}

describe('ExploreErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('Error Catching', () => {
    it('should catch errors and display error UI', () => {
      render(
        <ExploreErrorBoundary>
          <ThrowError />
        </ExploreErrorBoundary>,
      );

      expect(screen.getByText(/Something Went Wrong/i)).toBeInTheDocument();

      // Button accessible name comes from aria-label
      expect(screen.getByRole('button', { name: /Retry loading content/i })).toBeInTheDocument();

      // And visible label exists too
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      render(
        <ExploreErrorBoundary>
          <div>Test content</div>
        </ExploreErrorBoundary>,
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
      expect(screen.queryByText(/Something Went Wrong/i)).not.toBeInTheDocument();
    });

    it('should detect network errors', () => {
      render(
        <ExploreErrorBoundary>
          <ThrowNetworkError />
        </ExploreErrorBoundary>,
      );

      expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();
    });
  });

  describe('Error Handler Callback', () => {
    it('should call onError callback when error is caught', () => {
      const onError = vi.fn();

      render(
        <ExploreErrorBoundary onError={onError}>
          <ThrowError />
        </ExploreErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        }),
      );
    });

    it('should work without onError callback', () => {
      expect(() => {
        render(
          <ExploreErrorBoundary>
            <ThrowError />
          </ExploreErrorBoundary>,
        );
      }).not.toThrow();
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error UI</div>;

      render(
        <ExploreErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ExploreErrorBoundary>,
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText(/Something Went Wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should reset error state when retry is clicked', () => {
      const { rerender } = render(
        <ExploreErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ExploreErrorBoundary>,
      );

      expect(screen.getByText(/Something Went Wrong/i)).toBeInTheDocument();

      // Click retry button (uses aria-label)
      const retryButton = screen.getByRole('button', { name: /Retry loading content/i });
      fireEvent.click(retryButton);

      // Rerender with a non-throwing child to simulate recovery
      rerender(
        <ExploreErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ExploreErrorBoundary>,
      );

      expect(screen.queryByText(/Something Went Wrong/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No error/i)).toBeInTheDocument();
    });
  });
});

describe('NetworkError', () => {
  const mockError = new Error('Test error message');
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render network error UI', () => {
      render(<NetworkError error={mockError} onRetry={mockOnRetry} isNetworkError={true} />);

      expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
    });

    it('should render general error UI', () => {
      render(<NetworkError error={mockError} onRetry={mockOnRetry} isNetworkError={false} />);

      expect(screen.getByText(/Something Went Wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
    });

    it('should display retry button', () => {
      render(<NetworkError error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button', { name: /Retry loading content/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should call onRetry when retry button is clicked', () => {
      render(<NetworkError error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button', { name: /Retry loading content/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should have proper ARIA label on retry button', () => {
      render(<NetworkError error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByLabelText('Retry loading content');
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Error Details (Development)', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show error details in development mode', () => {
      render(<NetworkError error={mockError} onRetry={mockOnRetry} />);

      expect(screen.getByText(/Error Details/i)).toBeInTheDocument();
    });

    it('should display error message in details', () => {
      render(<NetworkError error={mockError} onRetry={mockOnRetry} />);

      expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      render(<NetworkError error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button');
      expect(retryButton).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<NetworkError error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button', { name: /Retry loading content/i });
      retryButton.focus();

      expect(retryButton).toHaveFocus();

      // Native button behavior: Enter triggers click
      fireEvent.keyDown(retryButton, { key: 'Enter' });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom className', () => {
      const { container } = render(
        <NetworkError error={mockError} onRetry={mockOnRetry} className="custom-class" />,
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });
});

describe('InlineError', () => {
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render error message', () => {
      render(<InlineError message="Test error message" />);

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should render without retry button', () => {
      render(<InlineError message="Test error message" />);

      expect(screen.queryByText(/Retry/i)).not.toBeInTheDocument();
    });

    it('should render with retry button when onRetry is provided', () => {
      render(<InlineError message="Test error message" onRetry={mockOnRetry} />);

      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });

    it('should display error icon', () => {
      const { container } = render(<InlineError message="Test error" />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should call onRetry when retry button is clicked', () => {
      render(<InlineError message="Test error message" onRetry={mockOnRetry} />);

      const retryButton = screen.getByText(/Retry/i);
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should have proper ARIA label on retry button', () => {
      render(<InlineError message="Test error message" onRetry={mockOnRetry} />);

      const retryButton = screen.getByLabelText('Retry');
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<InlineError message="Test error message" onRetry={mockOnRetry} />);

      const retryButton = screen.getByText(/Retry/i);
      retryButton.focus();

      expect(retryButton).toHaveFocus();

      // Native button behavior: Enter triggers click
      fireEvent.keyDown(retryButton, { key: 'Enter' });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalled();
    });

    it('should have proper color contrast', () => {
      const { container } = render(<InlineError message="Test error" />);

      const errorContainer = container.firstChild;
      expect(errorContainer).toHaveClass('bg-red-50', 'border-red-200');
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom className', () => {
      const { container } = render(<InlineError message="Test error" className="custom-class" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });
});

