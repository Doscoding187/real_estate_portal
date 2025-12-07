import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from '../OfflineIndicator';
import * as useOnlineStatusModule from '@/hooks/useOnlineStatus';

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('OfflineIndicator - Simple Tests', () => {
  let useOnlineStatusSpy: any;

  beforeEach(() => {
    useOnlineStatusSpy = vi.spyOn(useOnlineStatusModule, 'useOnlineStatus');
  });

  afterEach(() => {
    useOnlineStatusSpy.mockRestore();
  });

  it('should show offline banner when offline', () => {
    useOnlineStatusSpy.mockReturnValue(false);

    render(<OfflineIndicator />);

    const offlineText = screen.getByText(/you're offline/i);
    expect(offlineText).toBeTruthy();
  });

  it('should not show banner when online', () => {
    useOnlineStatusSpy.mockReturnValue(true);

    render(<OfflineIndicator />);

    const offlineText = screen.queryByText(/you're offline/i);
    expect(offlineText).toBeNull();
  });

  it('should have proper ARIA attributes for offline banner', () => {
    useOnlineStatusSpy.mockReturnValue(false);

    render(<OfflineIndicator />);

    const banner = screen.getByRole('alert');
    expect(banner.getAttribute('aria-live')).toBe('assertive');
  });

  it('should show WifiOff icon when offline', () => {
    useOnlineStatusSpy.mockReturnValue(false);

    const { container } = render(<OfflineIndicator />);

    // Check for WifiOff icon (lucide-react renders as svg)
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
  });

  it('should not show reconnection message if never went offline', () => {
    useOnlineStatusSpy.mockReturnValue(true);

    render(<OfflineIndicator />);

    const reconnectedText = screen.queryByText(/back online/i);
    expect(reconnectedText).toBeNull();
  });
});
