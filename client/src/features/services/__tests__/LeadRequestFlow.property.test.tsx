import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LeadRequestFlow } from '../LeadRequestFlow';

const PLACE_ID = 'pl-place-01-000000000000000000000000';
const selectedPlace = {
  canonicalPlaceId: PLACE_ID,
  label: 'Melville, City of Johannesburg, Gauteng',
  placeType: 'suburb',
  scope: 'locality' as const,
  administrativeContext: 'City of Johannesburg, Gauteng',
  canonicalPath: '/gauteng/melville',
  parentPlaceId: 'pl-place-01-111111111111111111111111',
};

vi.mock('@/components/location/CanonicalPlaceSelector', () => ({
  CanonicalPlaceSelector: ({
    value,
    onChange,
    label,
  }: {
    value: typeof selectedPlace | null;
    onChange: (value: typeof selectedPlace | null) => void;
    label: string;
  }) => (
    <div>
      <label htmlFor="mock-place-input">{label}</label>
      <input
        id="mock-place-input"
        value={value?.label || ''}
        onChange={() => onChange(null)}
      />
      <button type="button" onClick={() => onChange(selectedPlace)}>
        Select approved test Place
      </button>
    </div>
  ),
}));

function goToPlaceStep() {
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
}

function selectPlaceAndContinue() {
  fireEvent.click(screen.getByRole('button', { name: /select approved test place/i }));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
}

describe('LeadRequestFlow canonical Place contract', () => {
  it('requires an explicitly selected Place; typed display text does not supply authority', () => {
    const onSubmit = vi.fn();
    render(<LeadRequestFlow defaultCategory="home_improvement" onSubmit={onSubmit} />);
    goToPlaceStep();

    fireEvent.change(screen.getByLabelText(/project place/i), {
      target: { value: 'Melville, Johannesburg' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/select an approved place/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the exact selected Place ID with the request', () => {
    const onSubmit = vi.fn();
    render(<LeadRequestFlow defaultCategory="home_improvement" onSubmit={onSubmit} />);
    goToPlaceStep();
    selectPlaceAndContinue();

    fireEvent.change(screen.getByPlaceholderText(/describe what you need/i), {
      target: { value: 'Repair a leaking tap.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalPlaceId: PLACE_ID,
        notes: 'Repair a leaking tap.',
        intentStage: 'general',
        sourceSurface: 'directory',
      }),
    );
  });

  it('preserves the selected Place and project notes when moving back', () => {
    render(<LeadRequestFlow defaultCategory="moving" onSubmit={vi.fn()} />);
    goToPlaceStep();
    selectPlaceAndContinue();
    fireEvent.change(screen.getByPlaceholderText(/describe what you need/i), {
      target: { value: 'Move a two bedroom home.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByLabelText(/project place/i)).toHaveValue(selectedPlace.label);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByPlaceholderText(/describe what you need/i)).toHaveValue(
      'Move a two bedroom home.',
    );
  });

  it('does not expose internal journey jargon', () => {
    const { container } = render(
      <LeadRequestFlow defaultCategory="home_improvement" onSubmit={vi.fn()} />,
    );
    const text = container.textContent?.toLowerCase() || '';
    expect(text).not.toContain('intent stage');
    expect(text).not.toContain('source surface');
    expect(text).not.toContain('journey stage');
  });
});
