import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgencyLeadBoard } from './AgencyLeadBoard';

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('agency lead board', () => {
  it('keeps every supplied lead reachable, including leads after the eighth card and terminal stages', () => {
    const leads = [
      ...Array.from({ length: 11 }, (_, index) => ({
        id: index + 1,
        name: `Buyer ${index + 1}`,
        status: 'new',
      })),
      { id: 12, name: 'Qualified buyer', status: 'qualified' },
      { id: 13, name: 'Won buyer', status: 'converted' },
      { id: 14, name: 'Closed buyer', status: 'closed' },
      { id: 15, name: 'Lost buyer', status: 'lost' },
    ];
    render(<AgencyLeadBoard leads={leads} onOpen={vi.fn()} />);
    expect(screen.getAllByTestId('agency-lead-stage')).toHaveLength(7);
    const newStage = screen.getByRole('region', { name: 'New' });
    expect(within(newStage).getAllByRole('button')).toHaveLength(11);
    expect(within(newStage).getByText('11', { exact: true })).toBeDefined();
    expect(
      within(screen.getByRole('region', { name: 'Connected' })).getByText('Qualified buyer'),
    ).toBeDefined();
    expect(
      within(screen.getByRole('region', { name: 'Won' })).getByText('Won buyer'),
    ).toBeDefined();
    expect(
      within(screen.getByRole('region', { name: 'Closed' })).getByText('Closed buyer'),
    ).toBeDefined();
    expect(
      within(screen.getByRole('region', { name: 'Lost' })).getByText('Lost buyer'),
    ).toBeDefined();
  });

  it('opens the selected lead through the existing callback without changing its status', () => {
    const lead = { id: 1, name: 'Local buyer', phone: '0000000000', status: 'viewing_scheduled' };
    const onOpen = vi.fn();
    render(<AgencyLeadBoard leads={[lead]} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Local buyer/ }));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith(lead);
    expect(lead.status).toBe('viewing_scheduled');
  });

  it('treats a missing status as New and preserves the empty-stage guidance', () => {
    render(<AgencyLeadBoard leads={[{ id: 1, name: 'New buyer' }]} onOpen={vi.fn()} />);
    expect(
      within(screen.getByRole('region', { name: 'New' })).getByText('New buyer'),
    ).toBeDefined();
    expect(
      within(screen.getByRole('region', { name: 'Offer' })).getByText('No leads'),
    ).toBeDefined();
  });

  it('scrolls the board with its controls and updates their availability at either end', () => {
    render(<AgencyLeadBoard leads={[]} onOpen={vi.fn()} />);
    const board = screen.getByRole('region', { name: 'Lead pipeline board' });
    const scrollBy = vi.fn();
    Object.defineProperties(board, {
      clientWidth: { value: 500, configurable: true },
      scrollWidth: { value: 2200, configurable: true },
      scrollLeft: { value: 0, configurable: true },
      scrollBy: { value: scrollBy, configurable: true },
    });
    fireEvent.scroll(board);
    const previous = screen.getByRole('button', { name: 'Previous lead stages' });
    const next = screen.getByRole('button', { name: 'Next lead stages' });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(scrollBy).toHaveBeenCalledWith({ left: expect.any(Number), behavior: 'auto' });
    expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0);
    Object.defineProperty(board, 'scrollLeft', { value: 1700, configurable: true });
    fireEvent.scroll(board);
    expect(next).toBeDisabled();
    expect(previous).toBeEnabled();
    fireEvent.click(previous);
    expect(scrollBy.mock.calls[1][0].left).toBeLessThan(0);
  });
});
