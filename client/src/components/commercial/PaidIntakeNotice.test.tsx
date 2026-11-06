// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PAID_INTAKE_CLOSED_MESSAGE,
  PAID_SALES_PAUSED_MESSAGE,
  PAID_WAITLIST_LABEL,
  PAID_WAITLIST_MAILTO,
} from '@shared/paidIntakeCopy';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError } }));

import { PaidIntakeNotice, toastPaidError } from './PaidIntakeNotice';
import { SalesPauseNotice } from './SalesPauseNotice';

describe('paid intake messaging', () => {
  beforeEach(() => toastError.mockClear());

  it('shows the join-list link for the intake-closed error', () => {
    toastPaidError(new Error(PAID_INTAKE_CLOSED_MESSAGE), 'fallback');
    const element = toastError.mock.calls[0][0];
    render(element);
    expect(screen.getByText(PAID_INTAKE_CLOSED_MESSAGE)).toBeTruthy();
    expect(screen.getByRole('link', { name: PAID_WAITLIST_LABEL }).getAttribute('href')).toBe(
      PAID_WAITLIST_MAILTO,
    );
  });

  it('leaves other errors as plain toasts', () => {
    toastPaidError(new Error('Boom'), 'fallback');
    toastPaidError(new Error(''), 'fallback');
    expect(toastError).toHaveBeenNthCalledWith(1, 'Boom');
    expect(toastError).toHaveBeenNthCalledWith(2, 'fallback');
  });

  it('renders the notice component', () => {
    render(<PaidIntakeNotice />);
    expect(screen.getByRole('link', { name: PAID_WAITLIST_LABEL })).toBeTruthy();
  });

  it('pause banner shows the neutral text', () => {
    render(<SalesPauseNotice />);
    expect(screen.getByRole('status').textContent).toContain(PAID_SALES_PAUSED_MESSAGE);
    expect(screen.getByRole('status').textContent).not.toContain('founder');
  });
});
