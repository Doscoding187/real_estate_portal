import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { OfflineIndicator } from '../OfflineIndicator';
import * as useOnlineStatusModule from '@/hooks/useOnlineStatus';
import { vi } from 'vitest';

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('OfflineIndicator', () => {
  let useOnlineStatusSpy: any;

  beforeEach(() => {
    useOnlineStatusSpy = vi.spyOn(useOnlineStatusModule, 'useOnlineStatus');
    vi.useFakeTimers();
  });

  afterEach(() => {
    useOnlineStatusSpy.mockRestore();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should show offline banner when offline', () => {
    useOnlineStatusSpy.mockReturnValue(false);

    render(<OfflineIndicator />);

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.getByText(/showing cached content/i)).toBeInTheDocument();
  });

  it('should not show banner when online', () => {
    useOnlineStatusSpy.mockReturnValue(true);

    render(<OfflineIndicator />);

    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
  });

  it('should show reconnection message when coming back online', () => {
    const { rerender } = render(<OfflineIndicator />);

    // Start offline
    useOnlineStatusSpy.mockReturnValue(false);
    rerender(<OfflineIndicator />);

    // Come back online
    useOnlineStatusSpy.mockReturnValue(true);
    rerender(<OfflineIndicator />);

    expect(screen.getByText(/back online/i)).toBeInTheDocument();
    expect(screen.getByText(/content updated/i)).toBeInTheDocument();
  });

  it('should auto-dismiss reconnection message after 3 seconds', async () => {
    const { rerender } = render(<OfflineIndicator />);

    // Start offline
    useOnlineStatusSpy.mockReturnValue(false);
    rerender(<OfflineIndicator />);

    // Come back online
    useOnlineStatusSpy.mockReturnValue(true);
    rerender(<OfflineIndicator />);

    expect(screen.getByText(/back online/i)).toBeInTheDocument();

    // Fast-forward 3 seconds
    vi.advanceTimersByTime(3000);
    rerender(<OfflineIndicator />);

    await waitFor(() => {
      expect(screen.queryByText(/back online/i)).not.toBeInTheDocument();
    });
  });

  it('should have proper ARIA attributes for offline banner', () => {
    useOnlineStatusSpy.mockReturnValue(false);

    render(<OfflineIndicator />);

    const banner = screen.getByRole('alert');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
  });

  it('should have proper ARIA attributes for reconnection banner', () => {
    const { rerender } = render(<OfflineIndicator />);

    // Start offline
    useOnlineStatusSpy.mockReturnValue(false);
    rerender(<OfflineIndicator />);

    // Come back online
    useOnlineStatusSpy.mockReturnValue(true);
    rerender(<OfflineIndicator />);

    const banner = screen.getByRole('alert');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('should show WifiOff icon when offline', () => {
    useOnlineStatusSpy.mockReturnValue(false);

    const { container } = render(<OfflineIndicator />);

    // Check for WifiOff icon (lucide-react renders as svg)
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should show Wifi icon when reconnected', () => {
    const { rerender, container } = render(<OfflineIndicator />);

    // Start offline
    useOnlineStatusSpy.mockReturnValue(false);
    rerender(<OfflineIndicator />);

    // Come back online
    useOnlineStatusSpy.mockReturnValue(true);
    rerender(<OfflineIndicator />);

    // Check for Wifi icon
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should not show reconnection message if never went offline', () => {
    useOnlineStatusSpy.mockReturnValue(true);

    render(<OfflineIndicator />);

    expect(screen.queryByText(/back online/i)).not.toBeInTheDocument();
  });

  it('should handle multiple offline/online cycles', () => {
    const { rerender } = render(<OfflineIndicator />);

    // First offline
    useOnlineStatusSpy.mockReturnValue(false);
    rerender(<OfflineIndicator />);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();

    // First online
    useOnlineStatusSpy.mockReturnValue(true);
    rerender(<OfflineIndicator />);
    expect(screen.getByText(/back online/i)).toBeInTheDocument();

    // Wait for auto-dismiss
    vi.advanceTimersByTime(3000);
    rerender(<OfflineIndicator />);

    // Second offline
    useOnlineStatusSpy.mockReturnValue(false);
    rerender(<OfflineIndicator />);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();

    // Second online
    useOnlineStatusSpy.mockReturnValue(true);
    rerender(<OfflineIndicator />);
    expect(screen.getByText(/back online/i)).toBeInTheDocument();
  });
});
