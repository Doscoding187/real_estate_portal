import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const { profileResult, mutation, setLocation, info, authResult } = vi.hoisted(() => ({
  profileResult: { current: {} as any },
  mutation: vi.fn(),
  setLocation: vi.fn(),
  info: vi.fn(),
  authResult: { data: { id: 31, email: 'owner@example.com' }, isLoading: false },
}));
vi.mock('wouter', () => ({ useLocation: () => ['/developer/setup', setLocation] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info } }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    auth: {
      me: { useQuery: () => authResult },
    },
    developer: {
      getProfile: { useQuery: () => profileResult.current },
      createProfile: { useMutation: () => ({ mutateAsync: mutation, isPending: false }) },
    },
  },
}));
// Native selects expose the same controlled value/change contract; the real
// wizard, form, steps, review, account-owned draft and autosave remain mounted.
vi.mock('@/components/ui/GradientSelect', () => ({
  GradientSelect: ({
    value,
    onValueChange,
    children,
    placeholder,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: ReactNode;
    placeholder: string;
  }) => (
    <select aria-label={placeholder} value={value} onChange={e => onValueChange?.(e.target.value)}>
      <option value="">{placeholder}</option>
      {children}
    </select>
  ),
  GradientSelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import DeveloperSetupWizardEnhanced from '../DeveloperSetupWizardEnhanced';

const counts = ['completedProjects', 'currentProjects', 'upcomingProjects'];
const draftKey = 'developer-registration-draft:user-31';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  localStorage.clear();
  profileResult.current = {
    data: undefined,
    isLoading: false,
    error: { data: { code: 'NOT_FOUND' } },
  };
  mutation.mockImplementation(async input => ({
    ...input,
    id: 41,
    organisationId: 41,
    status: 'pending',
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function next() {
  fireEvent.click(screen.getByRole('button', { name: 'Next Step', exact: true }));
}
function assertNoCounts() {
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  for (const label of ['Completed Projects', 'Current Projects', 'Upcoming Projects']) {
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  }
}
async function submit() {
  fireEvent.click(screen.getByLabelText(/I agree to the terms and conditions/));
  fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }));
  await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
  const input = mutation.mock.calls[0][0];
  for (const key of counts) expect(input).not.toHaveProperty(key);
  return input;
}

describe('Developer registration canonical save and reload', () => {
  it('collects and submits supported organisation details without asking for unsaved counts', async () => {
    const view = render(<DeveloperSetupWizardEnhanced />);
    fireEvent.change(screen.getByPlaceholderText('Enter your company name'), {
      target: { value: 'Example Residential Company' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Select your primary focus' }), {
      target: { value: 'residential' },
    });
    next();
    fireEvent.change(screen.getByPlaceholderText('123 Business Street, Business Park'), {
      target: { value: 'Parktown' },
    });
    fireEvent.change(screen.getByPlaceholderText('Cape Town'), {
      target: { value: 'Johannesburg' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Select province' }), {
      target: { value: 'Gauteng' },
    });
    next();
    expect(screen.getByRole('heading', { name: 'Development Expertise' })).toBeInTheDocument();
    assertNoCounts();
    fireEvent.click(screen.getByRole('button', { name: 'Select Residential specialization' }));
    next();
    assertNoCounts();
    const input = await submit();
    expect(input).toMatchObject({
      name: 'Example Residential Company',
      city: 'Johannesburg',
      province: 'Gauteng',
      address: 'Parktown',
      category: 'residential',
      specializations: ['residential'],
    });
    await waitFor(() =>
      expect(setLocation).toHaveBeenCalledWith('/developer/dashboard?setup=complete'),
    );
    view.unmount();
    // Reload through the saved canonical profile read, not form defaults.
    profileResult.current = {
      data: { ...input, id: 41, organisationId: 41, status: 'pending' },
      isLoading: false,
    };
    render(<DeveloperSetupWizardEnhanced />);
    expect(screen.getByRole('heading', { name: 'Application under review' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit Application' })).not.toBeInTheDocument();
    expect(localStorage.getItem(draftKey)).toBeNull();
  });

  it('resumes an older owned draft with an explicit count notice and saves only supported fields', async () => {
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        ownerUserId: '31',
        draft: {
          step: 3,
          name: 'Example Residential Company',
          category: 'residential',
          email: 'owner@example.com',
          city: 'Johannesburg',
          province: 'Gauteng',
          specializations: ['residential'],
          completedProjects: 5,
          currentProjects: 5,
          upcomingProjects: 5,
        },
      }),
    );
    render(<DeveloperSetupWizardEnhanced />);
    fireEvent.click(await screen.findByRole('button', { name: 'Resume Draft', exact: true }));
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining('Project counts from your older draft will not be submitted'),
    );
    assertNoCounts();
    next();
    await waitFor(
      () => {
        const saved = JSON.parse(localStorage.getItem(draftKey)!);
        expect(saved.draft.step).toBe(4);
        expect(saved.draft.specializations).toEqual(['residential']);
        for (const key of counts) expect(saved.draft).not.toHaveProperty(key);
      },
      { timeout: 4000 },
    );
    assertNoCounts();
    const input = await submit();
    expect(input).toMatchObject({
      name: 'Example Residential Company',
      category: 'residential',
      specializations: ['residential'],
    });
  });
});
