import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { setLocationMock } = vi.hoisted(() => ({
  setLocationMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/dashboard', setLocationMock],
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Dev Owner', email: 'owner@example.com', role: 'property_developer' },
    logout: vi.fn(async () => {}),
  }),
}));

import { DeveloperTopNav } from '../DeveloperTopNav';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DeveloperTopNav quick actions', () => {
  // Radix menu portals do not open under synthetic events in jsdom, so the
  // menu items are pinned through the same source-contract style used by the
  // route registration tests.
  it('never emits quick actions whose destinations do not exist', () => {
    const source = readRepoFile('client/src/components/developer/DeveloperTopNav.tsx');

    expect(source).toContain("setLocation('/developer/create-development')");
    // These destinations have no route anywhere in the developer router; a
    // silent bounce back to the dashboard is worse than no action at all.
    expect(source).not.toContain('/developer/units/new');
    expect(source).not.toContain('/developer/leads/new');
  });

  it('does not render an inert global search input', () => {
    render(<DeveloperTopNav />);
    expect(
      screen.queryByPlaceholderText(/search developments, leads, units/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('removes empty notification and message controls from the workspace chrome', () => {
    render(<DeveloperTopNav />);
    expect(screen.getByRole('button', { name: /quick action/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /messages/i })).not.toBeInTheDocument();
  });
});
