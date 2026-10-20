import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OfferReadinessChecklist } from './OfferReadinessChecklist';
const incomplete = { viewingCompleted: true, feedbackLogged: true, affordabilityConfirmed: false };
const base = {
  readiness: incomplete,
  canMoveToOffer: false,
  blockers: ['Confirm buyer affordability or qualification before sending an offer.'],
  isLoading: false,
  isSaving: false,
  onToggle: vi.fn(),
};
describe('offer readiness guidance', () => {
  it('explains each recorded confirmation and the actual outstanding requirement', () => {
    render(<OfferReadinessChecklist {...base} />);
    expect(screen.getByRole('status')).toHaveTextContent('2 of 3 confirmations recorded');
    expect(
      screen.getByText(/Calendar completion and saved notes do not automatically tick/),
    ).toBeInTheDocument();
    expect(screen.getByText(base.blockers[0])).toBeInTheDocument();
    expect(
      screen.getByText(/does not send an offer document or confirm a sale/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3. Buyer affordability/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
  it('records only the explicitly selected check', () => {
    const toggle = vi.fn();
    render(<OfferReadinessChecklist {...base} onToggle={toggle} />);
    fireEvent.click(screen.getByRole('button', { name: /3. Buyer affordability/ }));
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledWith('affordabilityConfirmed');
  });
  it('allows recorded confirmations to be undone', () => {
    const toggle = vi.fn();
    render(<OfferReadinessChecklist {...base} onToggle={toggle} />);
    fireEvent.click(screen.getByRole('button', { name: '1. Viewing completed' }));
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledWith('viewingCompleted');
  });
  it('shows every server requirement even when all three checks are recorded', () => {
    render(
      <OfferReadinessChecklist
        {...base}
        readiness={{ ...incomplete, affordabilityConfirmed: true }}
        blockers={['Contact details are missing.', 'Record a contact outcome.']}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('3 of 3');
    expect(screen.getByText('Contact details are missing.')).toBeInTheDocument();
    expect(screen.getByText('Record a contact outcome.')).toBeInTheDocument();
    expect(screen.queryByText(/lead meets the requirements/)).not.toBeInTheDocument();
  });
  it('prevents toggles while loading or saving', () => {
    const { rerender } = render(<OfferReadinessChecklist {...base} isLoading />);
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Loading checks');
    rerender(<OfferReadinessChecklist {...base} isSaving />);
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Saving confirmation');
  });
  it('shows readiness only when the server permits the transition', () => {
    render(
      <OfferReadinessChecklist
        {...base}
        readiness={{ ...incomplete, affordabilityConfirmed: true }}
        canMoveToOffer
        blockers={[]}
      />,
    );
    expect(screen.getByText(/lead meets the requirements/)).toBeInTheDocument();
    expect(screen.queryByText('Why Move to Offer is unavailable')).not.toBeInTheDocument();
  });
});
