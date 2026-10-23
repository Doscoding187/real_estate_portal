import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectedLocationChip } from '../SelectedLocationChip';

describe('the selected location chip', () => {
  it('names the place and the parent it sits in', () => {
    render(<SelectedLocationChip label="Melville" contextLabel="Johannesburg" />);
    expect(screen.getByText('Melville')).toBeInTheDocument();
    expect(screen.getByText('Johannesburg')).toBeInTheDocument();
  });

  it('lets the customer take the location away', async () => {
    const onRemove = vi.fn();
    render(<SelectedLocationChip label="Melville" contextLabel="Johannesburg" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove the Melville location filter' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('lets the customer change the location', async () => {
    const onChange = vi.fn();
    render(<SelectedLocationChip label="Melville" contextLabel="Johannesburg" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Melville' }));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('shows a plain label when the surface has no picker', () => {
    render(<SelectedLocationChip label="Melville" contextLabel="Johannesburg" />);
    expect(screen.queryByRole('button', { name: 'Melville' })).not.toBeInTheDocument();
  });
});
