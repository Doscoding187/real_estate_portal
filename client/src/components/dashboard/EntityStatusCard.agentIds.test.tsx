import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EntityStatusCard } from './EntityStatusCard';

describe('EntityStatusCard listing action identities', () => {
  it('uses explicit source and public identifiers when they are deliberately unequal', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onView = vi.fn();

    render(
      <EntityStatusCard
        type="listing"
        data={{
          id: 913,
          title: 'Public property row',
          status: 'active',
          price: 1_499_000,
          enquiries: 0,
        }}
        readiness={{ score: 100, missing: {} }}
        editId={217}
        deleteId={913}
        viewId={913}
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
      />,
    );

    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.click(screen.getByTitle('Delete'));
    fireEvent.click(screen.getByRole('button', { name: 'View Property' }));

    expect(onEdit).toHaveBeenCalledWith(217);
    expect(onDelete).toHaveBeenCalledWith(913);
    expect(onView).toHaveBeenCalledWith(913);
  });

  it('disables editing instead of guessing a source listing identity', () => {
    render(
      <EntityStatusCard
        type="listing"
        data={{ id: 913, title: 'Projection without source', status: 'active', price: 1_499_000 }}
        readiness={{ score: 100, missing: {} }}
        editId={null}
        editUnavailableLabel="The source listing is unavailable, so this public projection cannot be edited here."
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByTitle('The source listing is unavailable, so this public projection cannot be edited here.')).toBeDisabled();
    expect(
      screen.getByText('The source listing is unavailable, so this public projection cannot be edited here.'),
    ).toBeInTheDocument();
  });
});
