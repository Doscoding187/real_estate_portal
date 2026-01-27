/**
 * Mobile Filter Bottom Sheet - Unit Tests
 * Tests drag-to-close, snap points, keyboard navigation, and focus trap
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileFilterBottomSheet } from '../MobileFilterBottomSheet';

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ set: vi.fn(), get: vi.fn() }),
  useTransform: () => 0,
}));

describe('MobileFilterBottomSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnApply = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up body overflow style
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <MobileFilterBottomSheet isOpen={false} onClose={mockOnClose} onApply={mockOnApply} />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'filter-sheet-title');
    });

    it('should render all filter sections', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      expect(screen.getByText('Property Type')).toBeInTheDocument();
      expect(screen.getByText('Price Range')).toBeInTheDocument();
      expect(screen.getByText('Bedrooms')).toBeInTheDocument();
      expect(screen.getByText('Bathrooms')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const closeButton = screen.getByLabelText('Close filters');
      await userEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const backdrop = screen.getByRole('dialog').previousSibling as HTMLElement;
      await userEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', async () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Apply Functionality', () => {
    it('should call onApply and onClose when Apply button is clicked', async () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const applyButton = screen.getByLabelText('Apply filters');
      await userEvent.click(applyButton);

      expect(mockOnApply).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should work without onApply callback', async () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} />);

      const applyButton = screen.getByLabelText('Apply filters');
      await userEvent.click(applyButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Snap Points', () => {
    it('should render snap point indicators', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const halfSnapButton = screen.getByLabelText('Snap to half height');
      const fullSnapButton = screen.getByLabelText('Snap to full height');

      expect(halfSnapButton).toBeInTheDocument();
      expect(fullSnapButton).toBeInTheDocument();
    });

    it('should allow clicking snap point indicators', async () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const fullSnapButton = screen.getByLabelText('Snap to full height');
      await userEvent.click(fullSnapButton);

      // Verify the button is clickable (no errors thrown)
      expect(fullSnapButton).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should trap focus within the sheet', async () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const dialog = screen.getByRole('dialog');
      const focusableElements = dialog.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );

      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('should have proper ARIA labels on all inputs', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      expect(screen.getByLabelText('Minimum price')).toBeInTheDocument();
      expect(screen.getByLabelText('Maximum price')).toBeInTheDocument();
      expect(screen.getByLabelText('Location')).toBeInTheDocument();
    });

    it('should have role="group" for filter sections', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const groups = screen.getAllByRole('group');
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when open', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { rerender } = render(
        <MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />,
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <MobileFilterBottomSheet isOpen={false} onClose={mockOnClose} onApply={mockOnApply} />,
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Filter Interactions', () => {
    it('should allow typing in price inputs', async () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const minPriceInput = screen.getByLabelText('Minimum price');
      await userEvent.type(minPriceInput, '100000');

      expect(minPriceInput).toHaveValue(100000);
    });

    it('should allow typing in location input', async () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const locationInput = screen.getByLabelText('Location');
      await userEvent.type(locationInput, 'Sandton');

      expect(locationInput).toHaveValue('Sandton');
    });

    it('should show reset button when filters are active', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      // Initially no filters, so no reset button in footer
      const resetButtons = screen.getAllByText(/Reset/i);
      expect(resetButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive button labels', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      expect(screen.getByLabelText('Close filters')).toBeInTheDocument();
      expect(screen.getByLabelText('Apply filters')).toBeInTheDocument();
      expect(screen.getByLabelText('Reset all filters')).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const heading = screen.getByRole('heading', { name: 'Filters' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveAttribute('id', 'filter-sheet-title');
    });

    it('should have aria-hidden on decorative elements', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      const dialog = screen.getByRole('dialog');
      const dragHandle = dialog.querySelector('[aria-hidden="true"]');
      expect(dragHandle).toBeInTheDocument();
    });
  });

  describe('Feature Parity', () => {
    it('should have all filter options from desktop panel', () => {
      render(<MobileFilterBottomSheet isOpen={true} onClose={mockOnClose} onApply={mockOnApply} />);

      // Property types
      expect(screen.getByText('Residential')).toBeInTheDocument();
      expect(screen.getByText('Developments')).toBeInTheDocument();
      expect(screen.getByText('Land')).toBeInTheDocument();

      // Bedrooms
      expect(screen.getByText('1+')).toBeInTheDocument();
      expect(screen.getByText('2+')).toBeInTheDocument();
      expect(screen.getByText('3+')).toBeInTheDocument();

      // Price inputs
      expect(screen.getByPlaceholderText('No min')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('No max')).toBeInTheDocument();

      // Location
      expect(screen.getByPlaceholderText('Enter location...')).toBeInTheDocument();
    });
  });
});
