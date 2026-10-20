import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({
  Redirect: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
}));

import AgentReferrals from './AgentReferrals';

afterEach(() => cleanup());

describe('AgentReferrals legacy route', () => {
  it('redirects to the canonical partner overview', () => {
    render(<AgentReferrals />);

    expect(screen.getByTestId('redirect')).toHaveTextContent('/distribution/partner/overview');
  });
});
