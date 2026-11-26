import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentListingInventoryCard } from './AgentListingInventoryCard';

afterEach(cleanup);

const base = {
  id: 900,
  listingId: 217,
  title: 'Sandton home',
  readiness: { score: 100, missing: {} },
};

const openMenu = () =>
  fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions for Sandton home' }), {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  });

describe('listing lifecycle actions (Sold / Let / Unpublish / Republish)', () => {
  it('offers Mark as sold and Unpublish for a live sale, and asks to confirm before acting', async () => {
    const onLifecycle = vi.fn();
    render(
      <AgentListingInventoryCard
        listing={{ ...base, status: 'available', listingType: 'sale' }}
        view="list"
        onLifecycle={onLifecycle}
      />,
    );
    expect(screen.getByText('Live')).toBeDefined();
    openMenu();
    expect(await screen.findByRole('menuitem', { name: 'Unpublish' })).toBeDefined();
    expect(screen.queryByRole('menuitem', { name: 'Mark as let' })).toBeNull();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mark as sold' }));

    expect(await screen.findByText('Mark this listing as sold?')).toBeDefined();
    expect(onLifecycle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onLifecycle).not.toHaveBeenCalled();

    openMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Mark as sold' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as sold' }));
    expect(onLifecycle).toHaveBeenCalledTimes(1);
    expect(onLifecycle).toHaveBeenCalledWith('sold');
  });

  it('offers Mark as let (not sold) for a live rental', async () => {
    const onLifecycle = vi.fn();
    render(
      <AgentListingInventoryCard
        listing={{ ...base, status: 'available', listingType: 'rent' }}
        view="list"
        onLifecycle={onLifecycle}
      />,
    );
    openMenu();
    expect(await screen.findByRole('menuitem', { name: 'Mark as let' })).toBeDefined();
    expect(screen.queryByRole('menuitem', { name: 'Mark as sold' })).toBeNull();
  });

  it('confirms Unpublish before calling the handler', async () => {
    const onLifecycle = vi.fn();
    render(
      <AgentListingInventoryCard
        listing={{ ...base, status: 'available', listingType: 'sale' }}
        view="list"
        onLifecycle={onLifecycle}
      />,
    );
    openMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Unpublish' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Unpublish' }));
    expect(onLifecycle).toHaveBeenCalledTimes(1);
    expect(onLifecycle).toHaveBeenCalledWith('unpublish');
  });

  it.each([
    ['sold', 'Sold', 'Unpublish'],
    ['rented', 'Let', 'Unpublish'],
    ['archived', 'Unpublished', 'Republish'],
  ] as const)('shows the %s status chip as %s and offers %s', async (status, chip, action) => {
    const onLifecycle = vi.fn();
    render(
      <AgentListingInventoryCard
        listing={{ ...base, status, listingType: 'sale' }}
        view="list"
        onLifecycle={onLifecycle}
      />,
    );
    expect(screen.getByText(chip)).toBeDefined();
    openMenu();
    expect(await screen.findByRole('menuitem', { name: action })).toBeDefined();
    expect(screen.queryByRole('menuitem', { name: 'Mark as sold' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Mark as let' })).toBeNull();
  });

  it('shows no lifecycle actions for drafts or when no handler is supplied', async () => {
    render(
      <AgentListingInventoryCard
        listing={{ ...base, status: 'available' }}
        view="list"
        onDelete={vi.fn()}
      />,
    );
    openMenu();
    await screen.findByRole('menuitem', { name: 'Delete listing' });
    expect(screen.queryByRole('menuitem', { name: 'Unpublish' })).toBeNull();
  });
});
