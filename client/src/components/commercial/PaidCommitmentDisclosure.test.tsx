import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { usePaidLegalAcceptance } from '@/hooks/usePaidLegalAcceptance';
import { PaidCommitmentDisclosure } from './PaidCommitmentDisclosure';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));
const release = (bundleId = 'test-only-bundle') => ({
  bundleId,
  effectiveAt: '2026-01-01T00:00:00.000Z',
  terms: { version: 'test-terms', path: '/legal/terms', content: 'Synthetic.', sha256: 'test' },
  privacy: {
    version: 'test-privacy',
    path: '/legal/privacy',
    content: 'Synthetic.',
    sha256: 'test',
  },
});
function Commitment({ product = 'agent:49900', submit = vi.fn() }) {
  const legal = usePaidLegalAcceptance(product, { planId: 42, amountDue: 49900, currency: 'ZAR' });
  return (
    <>
      <PaidCommitmentDisclosure legal={legal} />
      <button disabled={!legal.choice} onClick={() => submit(legal.choice)}>
        Request invoice
      </button>
      <button onClick={legal.reload}>Simulate stale response</button>
    </>
  );
}
beforeEach(() => {
  vi.mocked(apiFetch).mockResolvedValue(release());
});

describe('paid commitment', () => {
  it('requires an unchecked explicit choice and links the exact bundle', async () => {
    const submit = vi.fn();
    render(<Commitment submit={submit} />);
    const checkbox = await screen.findByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Request invoice' })).toBeDisabled();
    expect(screen.getByRole('link', { name: /Terms of Service/ })).toHaveAttribute(
      'href',
      '/legal/terms?bundle=test-only-bundle',
    );
    expect(screen.getByRole('link', { name: /Privacy Notice/ })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(
      screen.getByText(/The supplier and EFT payee is Property Listify \(Pty\) Ltd/),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'support@propertylistifysa.co.za' })).toHaveAttribute(
      'href',
      'mailto:support@propertylistifysa.co.za',
    );
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Request invoice' }));
    expect(submit).toHaveBeenCalledWith({
      bundleId: 'test-only-bundle',
      termsAccepted: true,
      purchaseAccepted: true,
      quote: { planId: 42, amountDue: 49900, currency: 'ZAR' },
    });
  });
  it('resets consent when the product or price changes', async () => {
    const view = render(<Commitment />);
    fireEvent.click(await screen.findByRole('checkbox'));
    view.rerender(<Commitment product="agency:99900" />);
    expect(screen.getByRole('button', { name: 'Request invoice' })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());
  });
  it('requires a new choice after a stale response', async () => {
    render(<Commitment />);
    fireEvent.click(await screen.findByRole('checkbox'));
    vi.mocked(apiFetch).mockResolvedValue(release('test-only-new-bundle'));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate stale response' }));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Terms of Service/ })).toHaveAttribute(
        'href',
        '/legal/terms?bundle=test-only-new-bundle',
      ),
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Request invoice' })).toBeDisabled();
  });
  it('fails closed while unavailable and allows a fresh retry', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('unavailable'));
    render(<Commitment />);
    const retry = await screen.findByRole('button', { name: 'Retry legal documents' });
    expect(screen.getByRole('button', { name: 'Request invoice' })).toBeDisabled();
    fireEvent.click(retry);
    expect(await screen.findByRole('checkbox')).not.toBeChecked();
  });
});
