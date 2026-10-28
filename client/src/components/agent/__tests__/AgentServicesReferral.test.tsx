import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => ['/agent/listings', vi.fn()],
  };
});

import { AgentServicesReferral } from '../AgentServicesReferral';

describe('AgentServicesReferral', () => {
  it('carries the agent attribution and the listing context into Services', () => {
    render(
      <AgentServicesReferral
        listingId={217}
        propertyId={990}
        canonicalPlaceId="pl-place-01-6a145c6d642ba208a2c12de7"
      />,
    );

    const link = screen.getByRole('link', { name: /find listing media providers/i });
    const href = link.getAttribute('href') || '';

    expect(href).toContain('/services/media-marketing');
    expect(href).toContain('sourceSurface=agent_dashboard');
    expect(href).toContain('intentStage=agent_dashboard');
    expect(href).toContain('reasonKey=agent_listing_preparation');
    expect(href).toContain('listingId=217');
    expect(href).toContain('propertyId=990');
    expect(href).toContain('canonicalPlaceId=pl-place-01-6a145c6d642ba208a2c12de7');
    expect(href).not.toContain('suburb=');
    expect(href).not.toContain('city=');
    expect(href).not.toContain('province=');
  });

  it('omits listing context the workspace does not hold', () => {
    render(<AgentServicesReferral />);

    const href = screen.getByRole('link', { name: /find listing media providers/i }).getAttribute('href') || '';

    expect(href).toContain('sourceSurface=agent_dashboard');
    expect(href).not.toContain('listingId=');
    expect(href).not.toContain('propertyId=');
  });
});
