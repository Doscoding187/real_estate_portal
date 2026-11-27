import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  caseState: 'approved',
  listingStatus: 'approved',
  mutation: () => ({ useMutation: () => ({ mutateAsync: () => Promise.resolve({}), isPending: false }) }),
}));
vi.mock('wouter', () => ({ useLocation: () => ['/agent/land/4', vi.fn()], useParams: () => ({ listingId: '4' }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/agent/AgentAppShell', () => ({ AgentAppShell: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/location/CanonicalPlaceSelector', () => ({ CanonicalPlaceSelector: () => null }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    land: {
      createDraft: harness.mutation(), addClaims: harness.mutation(), declareAuthority: harness.mutation(), requestPrivateEvidenceUpload: harness.mutation(),
      addPrivateEvidence: harness.mutation(), attachMarketingMedia: harness.mutation(), submit: harness.mutation(), close: harness.mutation(),
      getWorkspace: {
        useQuery: () => ({
          data: {
            listing: { title: 'Stand', askingPrice: '1200000', status: harness.listingStatus },
            reviewCase: { state: harness.caseState }, reviewEvents: [], evidence: [], claims: [],
            readiness: { submissionReady: true, blockers: { draft: [], submission: [] } },
          },
          refetch: vi.fn(),
        }),
      },
    },
    listing: { uploadMedia: harness.mutation(), confirmMediaUpload: harness.mutation() },
  },
}));

import LandAuthoringWorkspace from './LandAuthoringWorkspace';

describe('Land authoring lifecycle', () => {
  it('offers Sold and Withdraw and locks editing for approved live land', () => {
    harness.caseState = 'approved'; harness.listingStatus = 'approved';
    const { container } = render(<LandAuthoringWorkspace />);
    expect(screen.getByRole('button', { name: 'Mark as sold' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeEnabled();
    expect(container.querySelector('fieldset')?.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Submit for Land review' })).toBeDisabled();
  });

  it('shows Sold with no further actions once closed out', () => {
    harness.caseState = 'approved'; harness.listingStatus = 'sold';
    render(<LandAuthoringWorkspace />);
    expect(screen.getByText('Sold')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as sold' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull();
  });

  it('keeps editing open for a draft and offers no close-out', () => {
    harness.caseState = 'draft'; harness.listingStatus = 'draft';
    const { container } = render(<LandAuthoringWorkspace />);
    expect(container.querySelector('fieldset')?.disabled).toBe(false);
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull();
  });
});
