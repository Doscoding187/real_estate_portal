import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CanYouAffordPanel, computeAffordabilityScenario } from '../CanYouAffordPanel';
import { calculateMonthlyRepayment } from '@/lib/bond-calculator';
import { estimateTransferDuty } from '@/lib/transferDuty';

// Locale formatting uses non-breaking spaces; compare the rounded rand digits instead.
const digitsOf = (element: HTMLElement) => (element.textContent ?? '').replace(/\D/g, '');
const randDigits = (value: number) => String(Math.round(value));

describe('computeAffordabilityScenario', () => {
  it('derives deposit, repayment, qualifying income and transfer duty', () => {
    const result = computeAffordabilityScenario({
      propertyPrice: 2_000_000,
      depositPercent: 20,
      interestRate: 10,
      termYears: 20,
    });
    expect(result.depositAmount).toBe(400_000);
    expect(result.loanAmount).toBe(1_600_000);
    expect(result.bondRepayment).toBe(calculateMonthlyRepayment(1_600_000, 10, 20));
    expect(result.qualifyingIncome).toBeCloseTo(result.bondRepayment / 0.3, 6);
    expect(result.transferDuty).toBe(estimateTransferDuty(2_000_000));
  });
});

describe('CanYouAffordPanel', () => {
  it('renders nothing without a usable price', () => {
    const { container } = render(<CanYouAffordPanel price={null} runningCosts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels the rate as an example and recalculates when the inputs are edited', () => {
    render(<CanYouAffordPanel price={2_000_000} runningCosts={[]} onShareWithAgent={vi.fn()} />);

    expect(
      screen.getByText(/Example rate — check the current rate with your bank/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Transfer duty estimate using SARS rates effective 1 March 2025/))
      .toBeInTheDocument();

    const defaultBond = calculateMonthlyRepayment(1_800_000, 11.5, 30);
    expect(digitsOf(screen.getByTestId('afford-bond'))).toBe(randDigits(defaultBond));
    expect(digitsOf(screen.getByTestId('afford-transfer-duty'))).toBe(
      randDigits(estimateTransferDuty(2_000_000)),
    );

    fireEvent.change(screen.getByLabelText('Interest rate (% per year)'), {
      target: { value: '9' },
    });
    fireEvent.change(screen.getByLabelText('Deposit'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: '20 years' }));

    const editedBond = calculateMonthlyRepayment(1_600_000, 9, 20);
    expect(digitsOf(screen.getByTestId('afford-bond'))).toBe(randDigits(editedBond));
    expect(digitsOf(screen.getByTestId('afford-monthly-total'))).toBe(randDigits(editedBond));
  });

  it('falls back to the example rate while the typed rate is out of range', () => {
    render(<CanYouAffordPanel price={2_000_000} runningCosts={[]} />);
    fireEvent.change(screen.getByLabelText('Interest rate (% per year)'), {
      target: { value: '80' },
    });
    expect(digitsOf(screen.getByTestId('afford-bond'))).toBe(
      randDigits(calculateMonthlyRepayment(1_800_000, 11.5, 30)),
    );
    expect(screen.getByLabelText('Interest rate (% per year)')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
