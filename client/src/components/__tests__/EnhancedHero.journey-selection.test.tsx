import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setLocation } = vi.hoisted(() => ({
  setLocation: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', setLocation],
}));

vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: (props: any) => (
    <>
      <input
        ref={props.inputRef}
        aria-describedby={props.inputAriaDescribedBy}
        aria-label="Search by city, suburb, or area"
        onChange={event => props.onChange?.(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') props.onSubmit?.();
        }}
        placeholder={props.placeholder}
        role="combobox"
      />
      {props.selectedLocations?.map((location: any) => (
        <span key={location.id} data-testid={`selected-location-${location.id}`}>
          {location.name}
        </span>
      ))}
      <button
        type="button"
        data-testid="select-johannesburg"
        onClick={() =>
          props.onSelect?.({
            id: 'city:12',
            name: 'Johannesburg',
            slug: 'johannesburg',
            type: 'city',
            provinceSlug: 'gauteng',
          })
        }
      >
        Select Johannesburg
      </button>
      <button
        type="button"
        data-testid="select-sandton"
        onClick={() =>
          props.onSelect?.({
            id: 'suburb:34',
            name: 'Sandton',
            slug: 'sandton',
            type: 'suburb',
            provinceSlug: 'gauteng',
            citySlug: 'johannesburg',
          })
        }
      >
        Select Sandton
      </button>
      <button
        type="button"
        data-testid="select-invalid-location"
        onClick={() =>
          props.onSelect?.({
            id: 'google-place-123',
            name: 'Unresolved place',
            slug: 'unresolved-place',
            type: 'city',
          })
        }
      >
        Select unresolved place
      </button>
    </>
  ),
}));

import { EnhancedHero } from '../EnhancedHero';

describe('EnhancedHero explicit journey selection', () => {
  beforeEach(() => {
    setLocation.mockClear();
  });

  it('starts neutral while keeping location search usable and Search non-submittable', () => {
    render(<EnhancedHero />);

    screen
      .getAllByRole('button', { name: 'Buy' })
      .forEach(button => expect(button).toHaveAttribute('aria-pressed', 'false'));
    screen
      .getAllByRole('button', { name: 'Find an Agent' })
      .forEach(button => expect(button).toHaveAttribute('aria-pressed', 'false'));
    expect(screen.getByRole('combobox')).not.toBeDisabled();
    expect(screen.getByText('Choose how you would like to start.')).toBeInTheDocument();
    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).toBeDisabled());

    fireEvent.submit(screen.getByRole('combobox').closest('form')!);
    expect(setLocation).not.toHaveBeenCalled();
  });

  it('activates Search for a location-first selection without inferring a journey', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));

    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).not.toBeDisabled());
    expect(setLocation).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    expect(setLocation).toHaveBeenCalledWith('/gauteng/johannesburg');
  });

  it('uses the same neutral destination for Enter as Search click', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', code: 'Enter' });

    expect(setLocation).toHaveBeenCalledWith('/gauteng/johannesburg');
  });

  it('preserves multiple canonical locations for location-first intent', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.click(screen.getByTestId('select-sandton'));

    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).not.toBeDisabled());
    expect(
      screen.getByText('What are you looking for in Johannesburg and Sandton?'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    expect(
      screen.getByRole('heading', {
        name: 'What are you looking for in Johannesburg and Sandton?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('selected-location-city:12')).toHaveTextContent('Johannesburg');
    expect(screen.getByTestId('selected-location-suburb:34')).toHaveTextContent('Sandton');
    expect(screen.getByTestId('homepage-location-intent-buy')).toBeDisabled();
    expect(setLocation).not.toHaveBeenCalled();
  });

  it('rejects an unresolved location identity from activating Search', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-invalid-location'));

    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).toBeDisabled());
    expect(setLocation).not.toHaveBeenCalled();
  });

  it('routes a single location through the existing Buy contract after Buy is selected', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);

    screen
      .getAllByRole('button', { name: 'Buy' })
      .forEach(button => expect(button).toHaveAttribute('aria-pressed', 'true'));
    expect(setLocation).toHaveBeenCalledWith(expect.stringContaining('locationId=city%3A12'));
  });

  it('supports journey-first selection but waits for a canonical location', () => {
    render(<EnhancedHero />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Buy' })[0]);

    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).toBeDisabled());
    expect(setLocation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('select-johannesburg'));

    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).not.toBeDisabled());

    fireEvent.click(screen.getAllByRole('button', { name: 'Search', exact: true })[0]);
    expect(setLocation).toHaveBeenCalledWith(expect.stringContaining('locationId=city%3A12'));
  });

  it('retains a location when Buy is selected after location-first input', () => {
    const onTabChange = vi.fn();
    render(<EnhancedHero onTabChange={onTabChange} />);

    fireEvent.click(screen.getByTestId('select-johannesburg'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Buy' })[0]);

    expect(onTabChange).toHaveBeenCalledWith('buy');
    expect(screen.getByTestId('selected-location-city:12')).toHaveTextContent('Johannesburg');
    screen
      .getAllByRole('button', { name: 'Search', exact: true })
      .forEach(button => expect(button).not.toBeDisabled());
  });
});
