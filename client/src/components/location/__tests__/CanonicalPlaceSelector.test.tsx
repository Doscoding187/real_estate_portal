import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  CanonicalPlaceSelectorView,
  type CanonicalPlaceDiscovery,
  type CanonicalPlaceSelection,
} from '../CanonicalPlaceSelector';

const id = 'pl-place-01-000000000000000000000001';
const otherId = 'pl-place-01-000000000000000000000002';
const option = {
  placeId: id,
  preferredPublicLabel: 'Dunvegan',
  placeType: 'suburb',
  searchEligible: true,
  searchScope: 'locality' as const,
  context: { administrativeContext: 'Gauteng / Ekurhuleni' },
  matchedName: 'Dunvegan',
  isAliasMatch: false,
};
const response: CanonicalPlaceDiscovery = {
  query: 'dunvegan',
  outcome: 'ambiguous',
  results: [
    option,
    {
      ...option,
      placeId: otherId,
      context: { administrativeContext: 'Eastern Cape / Municipality' },
    },
  ],
};

function Harness({
  discovery = response,
  pending = false,
  error = false,
  initial = null,
  changed = vi.fn(),
}: {
  discovery?: CanonicalPlaceDiscovery;
  pending?: boolean;
  error?: boolean;
  initial?: CanonicalPlaceSelection | null;
  changed?: (value: CanonicalPlaceSelection | null) => void;
}) {
  const [query, setQuery] = useState(initial?.label ?? 'Dunvegan');
  const [value, setValue] = useState(initial);
  return (
    <CanonicalPlaceSelectorView
      query={query}
      onQueryChange={setQuery}
      value={value}
      onChange={next => {
        setValue(next);
        changed(next);
      }}
      discovery={discovery}
      pending={pending}
      error={error}
    />
  );
}

describe('Canonical Place customer selection', () => {
  it('requires explicit selection for same-name Places and carries the chosen identity', () => {
    const changed = vi.fn();
    render(<Harness changed={changed} />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByRole('status')).toHaveTextContent('Several locations match');
    expect(changed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('option', { name: /Dunvegan suburb · Eastern Cape/ }));
    expect(changed).toHaveBeenLastCalledWith({
      canonicalPlaceId: otherId,
      label: 'Dunvegan',
      placeType: 'suburb',
      scope: 'locality',
      administrativeContext: 'Eastern Cape / Municipality',
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clears the selected identity immediately when its text changes', () => {
    const changed = vi.fn();
    render(
      <Harness
        changed={changed}
        initial={{
          canonicalPlaceId: id,
          label: 'Dunvegan',
          placeType: 'suburb',
          scope: 'locality',
          administrativeContext: 'Gauteng',
        }}
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Another name' } });
    expect(changed).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).not.toHaveTextContent('selected');
  });

  it.each([
    { pending: true },
    { error: true },
    { discovery: { ...response, query: 'earlier query' } },
  ])('does not allow stale, pending or failed results to assign a Place: %j', patch => {
    const changed = vi.fn();
    render(<Harness {...patch} changed={changed} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(changed).not.toHaveBeenCalled();
  });

  it('lets keyboard users choose an explicit disambiguated option', () => {
    const changed = vi.fn();
    render(<Harness changed={changed} />);
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ canonicalPlaceId: otherId }),
    );
  });

  it('starts ArrowUp at the last choice and dismisses the list on blur', () => {
    render(<Harness />);
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
    fireEvent.blur(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not submit a containing form when Enter has no explicit choice', () => {
    const changed = vi.fn();
    render(<Harness pending changed={changed} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false);
    expect(changed).not.toHaveBeenCalled();
  });

  it('shows aliases as evidence while selecting the canonical preferred label', () => {
    const changed = vi.fn();
    render(
      <Harness
        changed={changed}
        discovery={{
          ...response,
          outcome: 'resolved',
          results: [
            {
              ...option,
              preferredPublicLabel: 'Preferred locality',
              matchedName: 'Dunvegan',
              isAliasMatch: true,
            },
          ],
        }}
      />,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(
      screen.getByRole('option', { name: /Preferred locality.*Also known as Dunvegan/ }),
    );
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ canonicalPlaceId: id, label: 'Preferred locality' }),
    );
    expect(screen.getByRole('combobox')).toHaveValue('Preferred locality');
  });

  it('does not require a city context or show provisional alarm labels', () => {
    render(
      <Harness
        discovery={{
          ...response,
          outcome: 'resolved',
          results: [
            {
              ...option,
              placeType: 'village',
              context: { administrativeContext: 'Limpopo / Local Municipality' },
            },
          ],
        }}
      />,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByRole('option')).toHaveTextContent('village · Limpopo / Local Municipality');
    expect(screen.queryByText(/provisional|unverified/i)).not.toBeInTheDocument();
  });

  it('reports unsupported locations without making a provider result selectable', () => {
    render(<Harness discovery={{ query: 'dunvegan', outcome: 'no_result', results: [] }} />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByRole('status')).toHaveTextContent('No approved location found');
    expect(screen.getByRole('status')).toHaveTextContent('unfinished draft');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it.each([
    { placeId: 'provider-key' },
    { searchEligible: false },
    { searchScope: null },
    { preferredPublicLabel: null },
    { preferredPublicLabel: '   ' },
  ])('refuses an unusable discovered candidate: %j', patch => {
    render(<Harness discovery={{ ...response, results: [{ ...option, ...patch }] }} />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
