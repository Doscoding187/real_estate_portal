import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AffordabilityForm } from './AffordabilityForm';

const values = {
  subjectName: '',
  subjectPhone: '',
  grossIncomeMonthly: '',
  deductionsMonthly: '0',
  depositAmount: '0',
  province: '',
  city: '',
  suburb: '',
};

describe('AffordabilityForm', () => {
  it('uses client-first language for accelerator capture', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <AffordabilityForm
        values={values}
        onChange={onChange}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    expect(screen.getByPlaceholderText('Client name (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Client phone (optional)')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Buyer name (optional)')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Calculate Snapshot' }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
