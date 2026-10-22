import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createMutationMock,
  detailQueryMock,
  getByIdInvalidateMock,
  listInvalidateMock,
  listQueryMock,
  listRefetchMock,
  updateMutationMock,
} = vi.hoisted(() => ({
  createMutationMock: vi.fn(),
  detailQueryMock: vi.fn(),
  getByIdInvalidateMock: vi.fn(),
  listInvalidateMock: vi.fn(),
  listQueryMock: vi.fn(),
  listRefetchMock: vi.fn(),
  updateMutationMock: vi.fn(),
}));

vi.mock('@/components/agent/AgentAppShell', () => ({
  AgentAppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      contacts: {
        list: { invalidate: listInvalidateMock },
        getById: { invalidate: getByIdInvalidateMock },
      },
    }),
    contacts: {
      list: { useQuery: (...args: unknown[]) => listQueryMock(...args) },
      getById: { useQuery: (...args: unknown[]) => detailQueryMock(...args) },
      create: { useMutation: () => createMutationMock() },
      update: { useMutation: () => updateMutationMock() },
    },
  },
}));

import AgentContacts from './AgentContacts';

const emptyData = {
  contacts: [],
  scope: { canShareWithAgency: false, isManager: false },
};

beforeEach(() => {
  vi.clearAllMocks();
  listQueryMock.mockReturnValue({
    data: emptyData,
    isLoading: false,
    isError: false,
    refetch: listRefetchMock,
  });
  detailQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  createMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
  updateMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
});

afterEach(() => cleanup());

describe('AgentContacts workplace surface', () => {
  it('shows a truthful empty state and opens a create form from it', async () => {
    const user = userEvent.setup();
    const createMutate = vi.fn();
    createMutationMock.mockReturnValue({ mutate: createMutate, isPending: false });

    render(<AgentContacts />);

    expect(screen.getByText('Your Contacts space is ready')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Add the people you maintain relationships with. Contacts stay under your permitted ownership and visibility scope.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('No Contacts match that search.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add your first contact' }));
    expect(screen.getByRole('heading', { name: 'Add a contact' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/full name/i), 'Thandi Mokoena');
    await user.type(screen.getByLabelText('Email'), 'thandi@example.test');
    await user.click(screen.getByRole('button', { name: 'Create contact' }));

    expect(createMutate).toHaveBeenCalledWith({
      fullName: 'Thandi Mokoena',
      email: 'thandi@example.test',
      phone: '',
      company: '',
      notes: '',
      visibility: 'private',
    });
  });

  it('does not represent an authorization or API failure as an empty Contacts list', () => {
    listQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: listRefetchMock,
    });

    render(<AgentContacts />);

    expect(screen.getByText('Contacts are unavailable right now')).toBeInTheDocument();
    expect(screen.queryByText('Your Contacts space is ready')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(listRefetchMock).toHaveBeenCalledTimes(1);
  });

  it('finds a permitted Contact and presents it as view-only when the server says it cannot be edited', async () => {
    const user = userEvent.setup();
    const sharedContact = {
      id: 17,
      fullName: 'Shared Agency Contact',
      email: 'shared@example.test',
      phone: null,
      company: 'Example Holdings',
      notes: 'Shared relationship note',
      visibility: 'agency_shared' as const,
      createdAt: '2026-09-18 10:00:00',
      updatedAt: '2026-09-18 10:00:00',
      canEdit: false,
    };
    listQueryMock.mockReturnValue({
      data: { contacts: [sharedContact], scope: { canShareWithAgency: true, isManager: false } },
      isLoading: false,
      isError: false,
      refetch: listRefetchMock,
    });
    detailQueryMock.mockReturnValue({ data: sharedContact, isLoading: false, isError: false });

    render(<AgentContacts />);
    await user.type(screen.getByRole('textbox', { name: 'Search contacts' }), 'Shared');
    expect(listQueryMock).toHaveBeenLastCalledWith(
      { query: 'Shared', limit: 60 },
      expect.objectContaining({ retry: false }),
    );
    await user.click(screen.getByRole('listitem'));

    expect(await screen.findByText('Shared relationship note')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This Contact is visible to you but maintained by its owner or an authorised manager.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
