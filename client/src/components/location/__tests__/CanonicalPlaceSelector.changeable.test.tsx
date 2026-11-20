import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: {
      discover: {
        useQuery: () => ({ data: undefined, isFetching: false, isError: false }),
      },
    },
  },
}));

import { CanonicalPlaceSelector, type CanonicalPlaceSelection } from '../CanonicalPlaceSelector';

const id = 'pl-place-01-000000000000000000000001';

/** A parent that rebuilds `value` on every render, as LocationPhase used to. */
function RebuildingParent({ clearable = true }: { clearable?: boolean }) {
  const [stored, setStored] = useState<{ id: string; label: string } | null>({
    id,
    label: 'Kya Sands Informal Settlement',
  });
  const value: CanonicalPlaceSelection | null = stored
    ? {
        canonicalPlaceId: stored.id,
        label: stored.label,
        placeType: 'suburb',
        scope: 'locality',
        administrativeContext: null,
      }
    : null;
  return (
    <CanonicalPlaceSelector
      value={value}
      onChange={next => setStored(next ? { id: next.canonicalPlaceId, label: next.label } : null)}
      inputId="picker"
      clearable={clearable}
    />
  );
}

describe('CanonicalPlaceSelector can be changed', () => {
  it('typing replaces a stored value even when the parent rebuilds `value` every render', () => {
    render(<RebuildingParent />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('Kya Sands Informal Settlement');
    fireEvent.change(input, { target: { value: 'North Rid' } });
    expect(input.value).toBe('North Rid');
    fireEvent.change(input, { target: { value: 'North Riding' } });
    expect(input.value).toBe('North Riding');
  });

  it('a Change button clears the selected place so the user can search again', () => {
    render(<RebuildingParent />);
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
  });

  it('other callers are unaffected: no Change button unless asked for', () => {
    render(<RebuildingParent clearable={false} />);
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
  });
});
