import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isTransactionalEmailConfigured,
  resolveTransactionalEmailConfiguration,
  transactionalEmailOrigin,
} from '../../_core/transactionalEmailConfig';
import { renderLaunchEmail, requiredBillingEmailPurpose } from '../transactionalEmailPolicy';

afterEach(() => vi.unstubAllEnvs());

describe('Paid MVP transactional email policy', () => {
  it('selects only customer-action billing events', () => {
    expect(requiredBillingEmailPurpose('invoice_issued')).toBe('invoice_issued');
    expect(requiredBillingEmailPurpose('payment_request_correction')).toBe(
      'payment_correction_requested',
    );
    expect(requiredBillingEmailPurpose('payment_approved_subscription_activated')).toBe(
      'payment_approved',
    );
    expect(requiredBillingEmailPurpose('payment_proof_received')).toBeNull();
    expect(requiredBillingEmailPurpose('payment_approved_invoice_already_paid')).toBeNull();
    expect(requiredBillingEmailPurpose('unrelated_internal_event')).toBeNull();
  });

  it.each([
    ['agent_launch_access', 'R499'],
    ['agency_launch_access', 'R999'],
    ['developer_launch_access', 'R1,499'],
  ] as const)('renders exact once-off terms for %s', (product, price) => {
    const message = renderLaunchEmail({
      purpose: 'invoice_issued',
      product,
      publicOrigin: 'https://www.propertylistifysa.co.za',
    });
    expect(message.text).toContain(price);
    expect(message.text).toContain('once-off for 90 days');
    expect(message.text).toContain('no automatic renewal');
    expect(message.text).toContain('funds reconciliation and finance approval');
    expect(message.text).toContain('Property Listify (Pty) Ltd is not VAT registered');
    expect(message.text).not.toMatch(/card|PayFast|monthly|VAT charged/i);
  });

  it('includes the canonical EFT reference and amount on an invoice email', () => {
    const message = renderLaunchEmail({
      purpose: 'invoice_issued',
      product: 'agent_launch_access',
      publicOrigin: 'https://www.propertylistifysa.co.za',
      invoice: {
        invoiceNumber: 'PL-AG-123',
        paymentReference: 'PL-AG-PAY-123',
        amountDue: 49900,
        currency: 'ZAR',
      },
    });
    expect(message.text).toContain('Invoice: PL-AG-123');
    expect(message.text).toContain('EFT payment reference: PL-AG-PAY-123');
    expect(message.text).toContain('Invoice total:');
    expect(message.html).toContain('PL-AG-PAY-123');
  });

  it.each(['agent_launch_access', 'agency_launch_access', 'developer_launch_access'] as const)(
    'links %s invoice emails to their issued legal bundle and confirmed payee',
    product => {
      const message = renderLaunchEmail({
        purpose: 'invoice_issued',
        product,
        publicOrigin: 'https://www.propertylistifysa.co.za',
        invoice: {
          invoiceNumber: 'TEST-INVOICE',
          paymentReference: 'TEST-REFERENCE',
          amountDue: 49900,
          currency: 'ZAR',
          legalBundleId: 'released-bundle-1',
        },
      });
      for (const content of [message.text, message.html]) {
        expect(content).toContain('/legal/terms?bundle=released-bundle-1');
        expect(content).toContain('/legal/privacy?bundle=released-bundle-1');
        expect(content).toContain('Supplier and EFT payee: Property Listify (Pty) Ltd');
        expect(content).toContain('Uploading proof alone does not activate access');
        expect(content).toContain('support@propertylistifysa.co.za');
      }
    },
  );

  it('encodes legal identity as a query value without creating an injected HTML attribute', () => {
    const message = renderLaunchEmail({
      purpose: 'invoice_issued',
      product: 'agent_launch_access',
      publicOrigin: 'https://www.propertylistifysa.co.za',
      invoice: {
        invoiceNumber: 'TEST',
        paymentReference: 'TEST',
        amountDue: 49900,
        currency: 'ZAR',
        legalBundleId: 'bundle&other=1" onclick="attack',
      },
    });
    expect(message.html).toContain('bundle%26other%3D1%22%20onclick%3D%22attack');
    expect(message.html).not.toContain('onclick="attack');
  });

  it('rejects malformed sender and deployed callback origins', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', 're_live_test_key');
    vi.stubEnv('RESEND_FROM_EMAIL', 'Property Listify <not-an-email>');
    expect(isTransactionalEmailConfigured()).toBe(false);
    vi.stubEnv('RESEND_FROM_EMAIL', 'Property Listify <hello@propertylistifysa.co.za>');
    expect(isTransactionalEmailConfigured()).toBe(true);
    vi.stubEnv('APP_URL', 'http://localhost:5173');
    expect(() => transactionalEmailOrigin('app')).toThrow();
    vi.stubEnv('APP_URL', 'https://www.propertylistifysa.co.za/path');
    expect(() => transactionalEmailOrigin('app')).toThrow();
    vi.stubEnv('APP_URL', 'https://www.propertylistifysa.co.za');
    vi.stubEnv('VITE_API_URL', 'https://api.propertylistifysa.co.za');
    expect(transactionalEmailOrigin('app')).toBe('https://www.propertylistifysa.co.za');
    expect(transactionalEmailOrigin('api')).toBe('https://api.propertylistifysa.co.za');
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('API_URL', '');
    expect(() => transactionalEmailOrigin('api')).toThrow();
  });

  it('requires both the Resend key and one valid canonical sender', () => {
    const senderOnly = resolveTransactionalEmailConfiguration({
      RESEND_FROM_EMAIL: 'Property Listify <hello@propertylistifysa.co.za>',
    } as NodeJS.ProcessEnv);
    expect(senderOnly.apiKeyConfigured).toBe(false);
    expect(senderOnly.fromConfigured).toBe(true);
    const keyOnly = resolveTransactionalEmailConfiguration({
      RESEND_API_KEY: 're_live_key',
    } as NodeJS.ProcessEnv);
    expect(keyOnly.apiKeyConfigured).toBe(true);
    expect(keyOnly.fromConfigured).toBe(false);
  });
});
