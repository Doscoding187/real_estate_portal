import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  user: { id: 1, role: 'property_developer' } as { id: number; role: string },
  unitTypes: [] as any[],
  ownership: ['full-title'] as string[],
  saved: [] as any[],
  reserve: vi.fn(),
  confirm: vi.fn(),
  presign: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock('@/hooks/usePublisherContext', () => ({ usePublisherContext: () => ({ context: null }) }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      reserveMediaUpload: { useMutation: () => ({ mutateAsync: h.reserve }) },
      confirmMediaUpload: { useMutation: () => ({ mutateAsync: h.confirm }) },
    },
    upload: { presign: { useMutation: () => ({ mutateAsync: h.presign }) } },
  },
}));
vi.mock('@/hooks/useDevelopmentWizard', () => {
  const state = () => ({
    unitTypes: h.unitTypes,
    transactionType: 'for_sale',
    developmentData: { transactionType: 'for_sale' },
    editingId: null,
    unitTypeDraft: null,
    addUnitType: vi.fn(),
    updateUnitType: vi.fn(),
    removeUnitType: vi.fn(),
    validatePhase: vi.fn(),
    setUnitTypeDraft: vi.fn(),
    getWizardData: () => ({ ownershipTypes: h.ownership }),
    saveWorkflowStepData: (step: string, data: any) => {
      h.saved.push({ step, data });
      if (step === 'unit_types') h.unitTypes = data.unitTypes;
    },
  });
  const useDevelopmentWizard: any = (selector?: (s: any) => any) =>
    selector ? selector(state()) : state();
  return { useDevelopmentWizard };
});
vi.mock('sonner', () => ({
  toast: { error: h.toastError, success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { UnitTypesPhase } from './UnitTypesPhase';

const unit = (over: Record<string, any> = {}) => ({
  id: 'u1',
  name: '91 m² 4-bedroom house',
  nameAuto: true,
  bedrooms: 4,
  bathrooms: 2,
  unitSize: 91,
  priceFrom: 1930000,
  availableUnits: 50,
  unitCategory: 'house',
  unitSubType: 'freestanding-house',
  structuralType: 'freestanding-house',
  baseMedia: { gallery: [{ id: 'p', url: 'https://img/p.jpg' }], floorPlans: [] },
  ...over,
});

const openTab = (name: string) => {
  const tab = screen.getByRole('tab', { name });
  fireEvent.mouseDown(tab, { button: 0 });
  fireEvent.click(tab);
};

describe('House type cards', () => {
  beforeEach(() => {
    h.unitTypes = [];
    h.ownership = ['full-title'];
    h.saved = [];
    h.user = { id: 1, role: 'property_developer' };
  });

  it('renders one card per house type with photo, price, tags and Edit / Duplicate', () => {
    h.unitTypes = [unit(), unit({ id: 'u2', name: 'Other', nameAuto: false, baseMedia: undefined })];
    render(<UnitTypesPhase />);
    const cards = screen.getAllByTestId('house-type-card');
    expect(cards).toHaveLength(2);
    const first = within(cards[0]);
    expect(first.getByText('91 m² 4-bedroom house')).toBeTruthy();
    expect(first.getByText('R1,930,000')).toBeTruthy();
    expect(first.getByText('For sale')).toBeTruthy();
    expect(first.getByText('50 available')).toBeTruthy();
    expect(first.getByText('1 photo')).toBeTruthy();
    expect(first.getByRole('img').getAttribute('src')).toBe('https://img/p.jpg');
    expect(first.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(first.getByRole('button', { name: 'Duplicate' })).toBeTruthy();
    // No per-unit sale/rent choice anywhere on the step.
    expect(screen.queryByText(/for rent/i)).toBeNull();
    expect(within(cards[1]).getByText('No photos yet')).toBeTruthy();
  });

  it('Duplicate adds a copy with a new id and a "(copy)" name', () => {
    h.unitTypes = [unit()];
    render(<UnitTypesPhase />);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    const saved = h.saved.at(-1);
    expect(saved.step).toBe('unit_types');
    expect(saved.data.unitTypes).toHaveLength(2);
    const copy = saved.data.unitTypes[1];
    expect(copy.id).not.toBe('u1');
    expect(copy.name).toBe('91 m² 4-bedroom house (copy)');
  });

  it('suggests the name from size, beds and home type, and stops once the name is edited', async () => {
    h.unitTypes = [unit()];
    render(<UnitTypesPhase />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const size = await screen.findByPlaceholderText('e.g. 70');
    fireEvent.change(size, { target: { value: '120' } });
    const name = screen.getByLabelText('House type name') as HTMLInputElement;
    await waitFor(() => expect(name.value).toBe('120 m² 4-bedroom house'));
    fireEvent.change(size, { target: { value: '91' } });
    await waitFor(() => expect(name.value).toBe('91 m² 4-bedroom house'));
    fireEvent.change(name, { target: { value: 'The Ebony' } });
    fireEvent.change(size, { target: { value: '120' } });
    expect((screen.getByLabelText('House type name') as HTMLInputElement).value).toBe('The Ebony');
  });

  it('starts bedrooms, bathrooms, parking type and parking bays empty', async () => {
    render(<UnitTypesPhase />);
    fireEvent.click(screen.getAllByRole('button', { name: /Add house type/ })[0]);
    await screen.findByLabelText('House type name');
    for (const label of ['Bedrooms', 'Bathrooms', 'Parking type']) {
      expect(within(screen.getByLabelText(label)).getByText('Select…')).toBeTruthy();
    }
    const bays = screen.getByLabelText('Parking bays') as HTMLInputElement;
    expect(bays.value).toBe('');
    expect(bays.disabled).toBe(true);
    expect((screen.getByLabelText('House type name') as HTMLInputElement).value).toBe('');
  });

  it('Duplicate still copies the facts', () => {
    h.unitTypes = [unit({ parkingType: 'garage', parkingBays: 2 })];
    render(<UnitTypesPhase />);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    const copy = h.saved.at(-1).data.unitTypes[1];
    expect(copy).toMatchObject({ bedrooms: 4, bathrooms: 2, parkingType: 'garage', parkingBays: 2 });
  });

  it('asks ownership per house type only when the development ownership varies', async () => {
    render(<UnitTypesPhase />);
    fireEvent.click(screen.getAllByRole('button', { name: /Add house type/ })[0]);
    await screen.findByLabelText('House type name');
    expect(screen.queryByLabelText('Ownership')).toBeNull();
  });

  it('asks ownership when it varies', async () => {
    h.ownership = ['varies'];
    render(<UnitTypesPhase />);
    fireEvent.click(screen.getAllByRole('button', { name: /Add house type/ })[0]);
    await screen.findByLabelText('House type name');
    expect(screen.getByLabelText('Ownership')).toBeTruthy();
  });

  it('shows an inline error for a rejected floor plan or oversize photo and uploads nothing', async () => {
    render(<UnitTypesPhase />);
    fireEvent.click(screen.getAllByRole('button', { name: /Add house type/ })[0]);
    await screen.findByLabelText('House type name');
    openTab('Media');
    const big = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 15 * 1024 * 1024 + 1 });
    fireEvent.change(await screen.findByTestId('house-gallery-input'), { target: { files: [big] } });
    expect((await screen.findByTestId('house-gallery-error')).textContent).toBe(
      'huge.jpg: too large (max 15 MB).',
    );
    const xlsx = new File(['x'], 'plan.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(screen.getByTestId('house-floorplan-input'), { target: { files: [xlsx] } });
    expect((await screen.findByTestId('house-floorplan-error')).textContent).toMatch(
      /^plan\.xlsx: Spreadsheets stay private/,
    );
    expect(h.reserve).not.toHaveBeenCalled();
    expect(h.presign).not.toHaveBeenCalled();
  });

  it('keeps Parking Bays when switching tabs and back', async () => {
    h.unitTypes = [unit({ parkingType: 'carport', parkingBays: 1 })];
    render(<UnitTypesPhase />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const bays = (await screen.findByLabelText('Parking bays')) as HTMLInputElement;
    fireEvent.change(bays, { target: { value: '2' } });
    expect(bays.value).toBe('2');
    openTab('Pricing');
    openTab('Stock');
    openTab('Basic Info');
    expect(((await screen.findByLabelText('Parking bays')) as HTMLInputElement).value).toBe('2');
  });

  it('keeps Parking Bays typed after choosing a parking type on a NEW house type', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    (Element.prototype as any).hasPointerCapture = vi.fn();
    (Element.prototype as any).releasePointerCapture = vi.fn();
    render(<UnitTypesPhase />);
    fireEvent.click(screen.getAllByRole('button', { name: /Add house type/ })[0]);
    const trigger = await screen.findByLabelText('Parking type');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Carport' }));
    const bays = (await screen.findByLabelText('Parking bays')) as HTMLInputElement;
    fireEvent.change(bays, { target: { value: '2' } });
    expect(bays.value).toBe('2');
    openTab('Pricing');
    openTab('Media');
    openTab('Stock');
    openTab('Basic Info');
    expect(((await screen.findByLabelText('Parking bays')) as HTMLInputElement).value).toBe('2');
  });

  it('a failed save from Stock goes to Basic Info, shows the message, focuses the field and toasts', async () => {
    h.unitTypes = [unit({ parkingType: 'carport', parkingBays: 1 })];
    render(<UnitTypesPhase />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const bays = (await screen.findByLabelText('Parking bays')) as HTMLInputElement;
    fireEvent.change(bays, { target: { value: '' } });
    openTab('Stock');
    expect(screen.queryByLabelText('Parking bays')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Update house type|Save house type/ }));
    const field = (await screen.findByLabelText('Parking bays')) as HTMLInputElement;
    expect(screen.getByTestId('house-form-error').textContent).toBe('Parking bays is missing — Basic info');
    await waitFor(() => expect(document.activeElement).toBe(field));
    expect(h.toastError).toHaveBeenCalledWith('Parking bays is missing — Basic info');
    expect(h.saved).toHaveLength(0);
  });
});
