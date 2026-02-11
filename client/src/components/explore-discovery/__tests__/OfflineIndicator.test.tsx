import React from 'react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Stable module mock (avoids ESM spy issues + hook-order crashes)
const useOnlineStatusMock = vi.fn<boolean, []>();

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => useOnlineStatusMock(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => <div {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { OfflineIndicator } from '../OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useOnlineStatusMock.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should show offline banner when offline', () => {
    useOnlineStatusMock.mockReturnValue(false);
    render(<OfflineIndicator />);

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.getByText(/showing cached content/i)).toBeInTheDocument();
  });

  it('should not show banner when online', () => {
    useOnlineStatusMock.mockReturnValue(true);
    render(<OfflineIndicator />);

    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
  });

  it('should show reconnection message when coming back online', () => {
    useOnlineStatusMock.mockReturnValue(false);
    const { rerender } = render(<OfflineIndicator />);

    act(() => {
      useOnlineStatusMock.mockReturnValue(true);
      rerender(<OfflineIndicator />);
    });

    expect(screen.getByText(/back online/i)).toBeInTheDocument();
    expect(screen.getByText(/content updated/i)).toBeInTheDocument();
  });

  it('should auto-dismiss reconnection message after 3 seconds', () => {
    useOnlineStatusMock.mockReturnValue(false);
    const { rerender } = render(<OfflineIndicator />);

    act(() => {
      useOnlineStatusMock.mockReturnValue(true);
      rerender(<OfflineIndicator />);
    });

    expect(screen.getByText(/back online/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(/back online/i)).not.toBeInTheDocument();
  });

  it('should have proper ARIA attributes for offline banner', () => {
    useOnlineStatusMock.mockReturnValue(false);
    render(<OfflineIndicator />);

    const banner = screen.getByRole('alert');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
  });

  it('should have proper ARIA attributes for reconnection banner', () => {
    useOnlineStatusMock.mockReturnValue(false);
    const { rerender } = render(<OfflineIndicator />);

    act(() => {
      useOnlineStatusMock.mockReturnValue(true);
      rerender(<OfflineIndicator />);
    });

    const banner = screen.getByRole('alert');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('should show WifiOff icon when offline', () => {
    useOnlineStatusMock.mockReturnValue(false);
    const { container } = render(<OfflineIndicator />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should show Wifi icon when reconnected', () => {
    useOnlineStatusMock.mockReturnValue(false);
    const { rerender, container } = render(<OfflineIndicator />);

    act(() => {
      useOnlineStatusMock.mockReturnValue(true);
      rerender(<OfflineIndicator />);
    });

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should not show reconnection message if never went offline', () => {
    useOnlineStatusMock.mockReturnValue(true);
    render(<OfflineIndicator />);

    expect(screen.queryByText(/back online/i)).not.toBeInTheDocument();
  });

  it('should handle multiple offline/online cycles', () => {
    useOnlineStatusMock.mockReturnValue(false);
    const { rerender } = render(<OfflineIndicator />);

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();

    act(() => {
      useOnlineStatusMock.mockReturnValue(true);
      rerender(<OfflineIndicator />);
    });
    expect(screen.getByText(/back online/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    act(() => {
      useOnlineStatusMock.mockReturnValue(false);
      rerender(<OfflineIndicator />);
    });
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();

    act(() => {
      useOnlineStatusMock.mockReturnValue(true);
      rerender(<OfflineIndicator />);
    });
    expect(screen.getByText(/back online/i)).toBeInTheDocument();
  });
});
