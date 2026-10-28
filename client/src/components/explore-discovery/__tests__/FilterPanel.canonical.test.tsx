import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FilterPanel } from '../FilterPanel';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';

vi.mock('framer-motion', () => {
  const motionPropNames = new Set([
    'initial',
    'animate',
    'exit',
    'transition',
    'variants',
    'whileHover',
    'whileTap',
  ]);
  const stripMotionProps = ({ children, ...props }: Record<string, any>) => {
    const domProps = Object.fromEntries(
      Object.entries(props).filter(([key]) => !motionPropNames.has(key)),
    );
    return <div {...domProps}>{children}</div>;
  };

  return {
    motion: { div: stripMotionProps, button: stripMotionProps },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

describe('FilterPanel canonical geography boundary', () => {
  beforeEach(() => {
    useExploreFiltersStore.getState().clearFilters();
  });

  it('does not offer a free-text location filter', () => {
    render(<FilterPanel isOpen onClose={vi.fn()} />);

    expect(screen.queryByPlaceholderText('Enter location...')).not.toBeInTheDocument();
    expect(screen.queryByText('Location', { exact: true })).not.toBeInTheDocument();
  });
});
