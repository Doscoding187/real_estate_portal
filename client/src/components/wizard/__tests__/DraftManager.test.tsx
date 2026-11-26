import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DraftManager } from '../DraftManager';

const props = (over: Record<string, unknown> = {}) => ({
  open: true,
  onResume: vi.fn(),
  onStartFresh: vi.fn(),
  wizardType: 'development' as const,
  draftData: { currentStep: 2, totalSteps: 8, ...over },
});

describe('DraftManager draft details (development)', () => {
  it('shows the draft name and when it was last saved', () => {
    render(
      <DraftManager
        {...props({
          developmentName: 'Baltimore Lifestyle Estate',
          lastModified: new Date(Date.now() - 10 * 60 * 1000),
        })}
      />,
    );
    expect(screen.getByTestId('draft-name')).toHaveTextContent('Baltimore Lifestyle Estate');
    expect(screen.getByTestId('draft-last-saved')).toHaveTextContent('10 minutes ago');
  });

  it('shows "Untitled" when the draft has no name yet', () => {
    render(<DraftManager {...props({ developmentName: '' })} />);
    expect(screen.getByTestId('draft-name')).toHaveTextContent('Untitled');
    render(<DraftManager {...props({})} />);
    expect(screen.getAllByTestId('draft-name')[1]).toHaveTextContent('Untitled');
  });

  it('is honest when no server save time is known', () => {
    render(<DraftManager {...props({ developmentName: 'Baltimore' })} />);
    expect(screen.getByTestId('draft-last-saved')).toHaveTextContent('only on this device so far');
  });
});
