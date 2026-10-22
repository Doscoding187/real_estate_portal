import { describe, expect, it } from 'vitest';
import { createPayFastSignature, createPayFastCheckout } from './payfastService';

describe('PayFast adapter', () => {
  it('creates a deterministic signature without including the signature field', () => {
    const fields = {
      merchant_id: '10000100',
      amount: '1499.00',
      item_name: 'Developer Launch Access',
    };

    expect(createPayFastSignature(fields, 'test-passphrase')).toBe(
      '97c52d41c1d8d498ca53886bf9d57c47',
    );
    expect(createPayFastSignature({ ...fields, signature: 'ignored' }, 'test-passphrase')).toBe(
      createPayFastSignature(fields, 'test-passphrase'),
    );
  });

  it('builds a once-off sandbox checkout form', () => {
    const previous = {
      merchantId: process.env.PAYFAST_MERCHANT_ID,
      merchantKey: process.env.PAYFAST_MERCHANT_KEY,
      passphrase: process.env.PAYFAST_PASSPHRASE,
      sandbox: process.env.PAYFAST_SANDBOX,
    };
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = 'abc123';
    process.env.PAYFAST_PASSPHRASE = 'secret';
    process.env.PAYFAST_SANDBOX = 'true';

    const checkout = createPayFastCheckout({
      invoiceId: 7,
      paymentReference: 'PLDV1-ABC123',
      amountMinor: 149900,
      currency: 'ZAR',
      itemName: 'Developer Launch Access',
      customer: { email: 'buyer@example.test', name: 'Test Buyer' },
      returnUrl: 'http://localhost:3009/developer/subscription',
      cancelUrl: 'http://localhost:3009/developer/plans',
    });

    expect(checkout.action).toBe('https://sandbox.payfast.co.za/eng/process');
    expect(checkout.fields.m_payment_id).toBe('PLDV1-ABC123');
    expect(checkout.fields.amount).toBe('1499.00');
    expect(checkout.fields.signature).toHaveLength(32);

    process.env.PAYFAST_MERCHANT_ID = previous.merchantId;
    process.env.PAYFAST_MERCHANT_KEY = previous.merchantKey;
    process.env.PAYFAST_PASSPHRASE = previous.passphrase;
    process.env.PAYFAST_SANDBOX = previous.sandbox;
  });
});
