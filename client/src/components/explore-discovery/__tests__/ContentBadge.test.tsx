/**
 * ContentBadge Component Tests
 * 
 * Tests for the Content Badge component that displays visual indicators
 * on Explore content to communicate content type.
 * 
 * Requirements:
 * - 4.1: Display badge on all content cards and videos
 * - 4.2: Property badge (🏠, primary color)
 * - 4.3: Expert Tip badge (💡, amber)
 * - 4.4: Service badge (🛠️, blue)
 * - 4.5: Finance badge (💰, green)
 * - 4.6: Design badge (📐, purple)
 * - 4.7: Display primary category badge only
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContentBadge, ContentBadgeOverlay, getBadgeConfig, getAllBadgeTypes, isValidBadgeType } from '../ContentBadge';

describe('ContentBadge', () => {
  describe('Badge Rendering', () => {
    it('should render property badge with correct icon and color - Requirement 4.2', () => {
      render(<ContentBadge type="property" showLabel />);
      
      const badge = screen.getByRole('img', { name: /property content/i });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-badge-type', 'property');
      expect(badge).toHaveClass('bg-primary');
      
      // Check label is displayed
      expect(screen.getByText('Property')).toBeInTheDocument();
    });

    it('should render expert tip badge with correct icon and color - Requirement 4.3', () => {
      render(<ContentBadge type="expert_tip" showLabel />);
      
      const badge = screen.getByRole('img', { name: /expert tip content/i });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-badge-type', 'expert_tip');
      expect(badge).toHaveClass('bg-amber-500');
      
      expect(screen.getByText('Expert Tip')).toBeInTheDocument();
    });

    it('should render service badge with correct icon and color - Requirement 4.4', () => {
      render(<ContentBadge type="service" showLabel />);
      
      const badge = screen.getByRole('img', { name: /service content/i });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-badge-type', 'service');
      expect(badge).toHaveClass('bg-blue-500');
      
      expect(screen.getByText('Service')).toBeInTheDocument();
    });

    it('should render finance badge with correct icon and color - Requirement 4.5', () => {
      render(<ContentBadge type="finance" showLabel />);
      
      const badge = screen.getByRole('img', { name: /finance content/i });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-badge-type', 'finance');
      expect(badge).toHaveClass('bg-green-500');
      
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    it('should render design badge with correct icon and color - Requirement 4.6', () => {
      render(<ContentBadge type="design" showLabel />);
      
      const badge = screen.getByRole('img', { name: /design content/i });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-badge-type', 'design');
      expect(badge).toHaveClass('bg-purple-500');
      
      expect(screen.getByText('Design')).toBeInTheDocument();
    });
  });

  describe('Badge Sizes', () => {
    it('should render small badge', () => {
      render(<ContentBadge type="property" size="sm" />);
      
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('text-[10px]');
    });

    it('should render medium badge (default)', () => {
      render(<ContentBadge type="property" size="md" />);
      
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('text-xs');
    });

    it('should render large badge', () => {
      render(<ContentBadge type="property" size="lg" />);
      
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('text-sm');
    });
  });

  describe('Badge Label Display', () => {
    it('should hide label by default', () => {
      render(<ContentBadge type="property" />);
      
      expect(screen.queryByText('Property')).not.toBeInTheDocument();
    });

    it('should show label when showLabel is true', () => {
      render(<ContentBadge type="property" showLabel />);
      
      expect(screen.getByText('Property')).toBeInTheDocument();
    });
  });

  describe('ContentBadgeOverlay', () => {
    it('should render badge in positioned container - Requirement 4.1', () => {
      const { container } = render(<ContentBadgeOverlay type="property" />);
      
      const overlay = container.querySelector('.absolute.top-2.left-2');
      expect(overlay).toBeInTheDocument();
      
      const badge = screen.getByRole('img');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Utility Functions', () => {
    it('should get badge configuration', () => {
      const config = getBadgeConfig('property');
      
      expect(config).toEqual({
        icon: '🏠',
        color: 'primary',
        label: 'Property',
        bgColor: 'bg-primary',
        textColor: 'text-primary-foreground'
      });
    });

    it('should get all badge types', () => {
      const types = getAllBadgeTypes();
      
      expect(types).toEqual(['property', 'expert_tip', 'service', 'finance', 'design']);
    });

    it('should validate badge type', () => {
      expect(isValidBadgeType('property')).toBe(true);
      expect(isValidBadgeType('expert_tip')).toBe(true);
      expect(isValidBadgeType('invalid')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ContentBadge type="property" />);
      
      const badge = screen.getByRole('img', { name: /property content/i });
      expect(badge).toHaveAttribute('aria-label', 'Property content');
    });

    it('should hide icon from screen readers', () => {
      const { container } = render(<ContentBadge type="property" />);
      
      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(<ContentBadge type="property" className="custom-class" />);
      
      const badge = screen.getByRole('img');
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid badge type gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // @ts-expect-error Testing invalid type
      const { container } = render(<ContentBadge type="invalid" />);
      
      expect(consoleSpy).toHaveBeenCalledWith('Invalid badge type: invalid');
      expect(container.firstChild).toBeNull();
      
      consoleSpy.mockRestore();
    });
  });
});
