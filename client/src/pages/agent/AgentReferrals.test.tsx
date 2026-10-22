import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  Redirect: ({ to }: { to: string }) => {
    redirectMock(to);
    return <div data-testid="legacy-agent-referrals-redirect">{to}</div>;
  },
}));

import AgentReferrals from './AgentReferrals';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('legacy agent referrals route', () => {
  it('opens the canonical Distribution Network workspace', () => {
    render(<AgentReferrals />);

    expect(screen.getByTestId('legacy-agent-referrals-redirect')).toHaveTextContent(
      '/distribution/partner/overview',
    );
    expect(redirectMock).toHaveBeenCalledWith('/distribution/partner/overview');
  });
});
