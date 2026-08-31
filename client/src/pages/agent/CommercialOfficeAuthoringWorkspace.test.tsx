import { fireEvent, render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reusableAssets, mutation } = vi.hoisted(() => ({
  reusableAssets: vi.fn(),
  mutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    commercial: {
      createDraft: { useMutation: mutation },
      submit: { useMutation: mutation },
      attachMarketingMedia: { useMutation: mutation },
      reusableAssets: { useQuery: (...args: unknown[]) => reusableAssets(...args) },
    },
    listing: {
      uploadMedia: { useMutation: mutation },
      confirmMediaUpload: { useMutation: mutation },
    },
    location: {
      getLocationHierarchy: { useQuery: () => ({ data: [] }) },
    },
  },
}));

vi.mock('@/components/agent/AgentAppShell', () => ({
  AgentAppShell: ({ children }: PropsWithChildren) => <>{children}</>,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import CommercialOfficeAuthoringWorkspace from './CommercialOfficeAuthoringWorkspace';

describe('CommercialOfficeAuthoringWorkspace', () => {
  beforeEach(() => {
    reusableAssets.mockReset();
    reusableAssets.mockReturnValue({ data: [] });
  });

  it('switches authoring facts to Industrial & Logistics without using the Office form', () => {
    render(<CommercialOfficeAuthoringWorkspace />);

    fireEvent.change(screen.getByLabelText('Commercial use type'), {
      target: { value: 'industrial_logistics' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add lease terms/i }));

    expect(screen.getByText('Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Industrial park')).toBeInTheDocument();
    expect(screen.getByText('Eaves height (m)')).toBeInTheDocument();
    expect(screen.getByText('Power capacity (kVA)')).toBeInTheDocument();
    expect(screen.queryByText('Building grade')).not.toBeInTheDocument();
    expect(reusableAssets).toHaveBeenLastCalledWith({ spaceClass: 'industrial_logistics' });
  });

  it('switches authoring facts to Retail and makes local-context fields available', () => {
    render(<CommercialOfficeAuthoringWorkspace />);

    fireEvent.change(screen.getByLabelText('Commercial use type'), {
      target: { value: 'retail' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add lease terms/i }));

    expect(screen.getByText('Retail centre')).toBeInTheDocument();
    expect(screen.getByText('Frontage / visibility')).toBeInTheDocument();
    expect(screen.getByText('Footfall context')).toBeInTheDocument();
    expect(screen.getByText('Tenant mix context')).toBeInTheDocument();
    expect(screen.getByText(/Zoning and permitted-use evidence/)).toBeInTheDocument();
    expect(reusableAssets).toHaveBeenLastCalledWith({ spaceClass: 'retail' });
  });

  it('requires an explicit description when availability comes from another source', () => {
    render(<CommercialOfficeAuthoringWorkspace />);

    fireEvent.change(screen.getByLabelText('Availability confirmation source'), {
      target: { value: 'other' },
    });

    expect(screen.getByLabelText('Confirmation source details')).toBeInTheDocument();
    expect(
      screen.getByText('Record who supplied the latest availability confirmation.'),
    ).toBeInTheDocument();
  });
});
