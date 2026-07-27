import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NotFoundState,
} from '@/components/ui/feedback-state';

describe('shared feedback-state contract', () => {
  it('distinguishes page loading with an announced status', () => {
    render(
      <LoadingState title="Loading saved properties" description="Fetching your saved items." />,
    );

    expect(screen.getByRole('status', { name: 'Loading saved properties' })).toBeInTheDocument();
    expect(screen.getByText('Fetching your saved items.')).toHaveClass('sr-only');
  });

  it('provides an accessible error and optional retry action', () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="Could not load properties"
        description="Check your connection and try again."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load properties');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('supports meaningful empty and not-found actions with structural headings', () => {
    render(
      <>
        <EmptyState
          title="No saved properties"
          description="Browse properties to save one."
          action={<Button>Browse properties</Button>}
        />
        <NotFoundState
          title="Page not found"
          description="The page does not exist."
          action={<Button>Go home</Button>}
        />
      </>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'No saved properties' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse properties' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go home' })).toBeInTheDocument();
  });

  it('assigns each EmptyState section a unique associated heading ID', () => {
    render(
      <>
        <EmptyState title="First empty state" />
        <EmptyState title="Second empty state" />
      </>,
    );

    const sections = [...document.querySelectorAll<HTMLElement>('[data-slot="empty-state"]')];
    const firstHeading = sections[0].querySelector('h2');
    const secondHeading = sections[1].querySelector('h2');

    expect(sections).toHaveLength(2);
    expect(firstHeading).not.toBeNull();
    expect(secondHeading).not.toBeNull();
    expect(firstHeading?.id).toBeTruthy();
    expect(secondHeading?.id).toBeTruthy();
    expect(firstHeading?.id).not.toBe(secondHeading?.id);
    expect(sections[0]).toHaveAttribute('aria-labelledby', firstHeading?.id);
    expect(sections[1]).toHaveAttribute('aria-labelledby', secondHeading?.id);
  });

  it('assigns each NotFoundState section a unique associated heading ID', () => {
    render(
      <>
        <NotFoundState title="First missing page" />
        <NotFoundState title="Second missing page" />
      </>,
    );

    const sections = [...document.querySelectorAll<HTMLElement>('[data-slot="not-found-state"]')];
    const firstHeading = sections[0].querySelector('h1');
    const secondHeading = sections[1].querySelector('h1');

    expect(sections).toHaveLength(2);
    expect(firstHeading).not.toBeNull();
    expect(secondHeading).not.toBeNull();
    expect(firstHeading?.id).toBeTruthy();
    expect(secondHeading?.id).toBeTruthy();
    expect(firstHeading?.id).not.toBe(secondHeading?.id);
    expect(sections[0]).toHaveAttribute('aria-labelledby', firstHeading?.id);
    expect(sections[1]).toHaveAttribute('aria-labelledby', secondHeading?.id);
  });
});
