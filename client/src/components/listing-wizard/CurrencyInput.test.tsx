import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CurrencyInput from './CurrencyInput';

describe('CurrencyInput', () => {
  it('accepts a realistic typed amount without spinner interaction', () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Amount" onValueChange={onValueChange} />);

    const input = screen.getByRole('textbox', { name: 'Amount' });
    fireEvent.change(input, { target: { value: '2500000' } });

    expect(onValueChange).toHaveBeenLastCalledWith(2500000);
    expect(input).toHaveValue('2500000');
  });

  it('preserves explicit zero and clears to undefined rather than coercing blank to zero', () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Amount" onValueChange={onValueChange} />);

    const input = screen.getByRole('textbox', { name: 'Amount' });
    fireEvent.change(input, { target: { value: '0' } });
    expect(onValueChange).toHaveBeenLastCalledWith(0);

    fireEvent.change(input, { target: { value: '' } });
    expect(onValueChange).toHaveBeenLastCalledWith(undefined);
  });
});
