import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PropertyTypeStep from './PropertyTypeStep';

const store = vi.hoisted(() => ({
  action: 'sell' as const,
  propertyType: undefined as string | undefined,
  setPropertyType: vi.fn(),
}));

vi.mock('@/hooks/useListingWizard', () => ({
  useListingWizardStore: () => store,
}));

vi.mock('@/hooks/useFieldValidation', () => ({
  useFieldValidation: () => ({ error: undefined, clearError: vi.fn() }),
}));

describe('PropertyTypeStep', () => {
  beforeEach(() => {
    store.propertyType = undefined;
    store.setPropertyType.mockReset();
  });

  it('renders only active manual choices with accessible radio semantics', () => {
    render(<PropertyTypeStep />);

    expect(screen.getByRole('radiogroup', { name: /what kind of property/i })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: /apartment/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /cluster home/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /^Land \/ Plot/i })).toBeNull();
    expect(screen.queryByRole('radio', { name: /^Commercial/i })).toBeNull();
    expect(screen.queryByRole('radio', { name: /^Shared Living/i })).toBeNull();
  });

  it('supports keyboard selection and arrow movement', () => {
    render(<PropertyTypeStep />);
    const first = screen.getByRole('radio', { name: /apartment/i });

    fireEvent.keyDown(first, { key: 'ArrowDown' });

    expect(store.setPropertyType).toHaveBeenCalledWith('house');
  });

  it('selects an active type when a card is clicked', () => {
    render(<PropertyTypeStep />);

    fireEvent.click(screen.getByRole('radio', { name: /townhouse/i }));

    expect(store.setPropertyType).toHaveBeenCalledWith('townhouse');
  });
});
