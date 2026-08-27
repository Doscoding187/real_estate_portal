import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HomeJourneySection } from './HomeJourneySection';

describe('HomeJourneySection', () => {
  it('explains the discovery, decision and connection bridge before professional entry', () => {
    render(<HomeJourneySection />);

    expect(screen.getByRole('heading', { name: /make every property move/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Discover' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Decide' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Connect' })).toBeInTheDocument();
  });
});
