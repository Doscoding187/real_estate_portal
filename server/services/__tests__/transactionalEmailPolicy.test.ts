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

  it.each(['agent_launch_access', 'agency_launch_access', 'developer_launch_access'] as const)(
    'renders invoice, exact reference and bank instructions for %s',
    product => {
      const message = renderLaunchEmail({
        purpose: 'invoice_issued',
        product,
        publicOrigin: 'https://www.propertylistifysa.co.za',
        invoice: {
          invoiceNumber: 'TEST-INVOICE',
          paymentReference: 'EXACT-REFERENCE',
          amountDue: 49900,
          currency: 'ZAR',
          legalBundleId: 'released-bundle-1',
          bankDetails: {
            accountName: 'TEST COMPANY',
            bankName: 'TEST BANK',
            accountNumber: '0000000000',
            branchCode: '000000',
            accountType: 'TEST ACCOUNT',
          },
        },
      });
      expect(message.subject).toBe('Property Listify invoice issued');
      for (const content of [message.text, message.html]) {
        expect(content).toContain('TEST-INVOICE');
        expect(content).toContain('EXACT-REFERENCE');
        expect(content).toContain('499');
        expect(content).toContain('TEST COMPANY');
        expect(content).toContain('0000000000');
        expect(content).toContain('000000');
        expect(content).toContain('Copy the invoice reference exactly');
        expect(content).toContain('no document is required');
        expect(content).toContain('/legal/terms?bundle=released-bundle-1');
        expect(content).toContain('/legal/privacy?bundle=released-bundle-1');
      }
      expect(message.text).not.toMatch(/card|PayFast|monthly|VAT charged/i);
    },
  );

  it('distinguishes a pending customer notice from bank receipt and approved access', () => {
    const notice = renderLaunchEmail({
      purpose: 'payment_notice_received',
      product: 'agent_launch_access',
      publicOrigin: 'https://www.propertylistifysa.co.za',
    });
    expect(requiredBillingEmailPurpose('payment_notice_received')).toBe('payment_notice_received');
    expect(notice.subject).toContain('verification pending');
    expect(notice.text).toContain('not confirmation of received bank funds');
    expect(notice.text).not.toContain('term was activated');
    const approved = renderLaunchEmail({
      purpose: 'payment_approved',
      product: 'agent_launch_access',
      publicOrigin: 'https://www.propertylistifysa.co.za',
      term: { start: '2026-10-13 10:00:00', end: '2027-01-11 10:00:00' },
    });
    expect(approved.subject).toContain('Launch Access activated');
    expect(approved.text).toContain('fully settled invoice');
    expect(approved.text).toContain('2026-10-13 10:00:00 UTC');
    expect(approved.text).toContain('2027-01-11 10:00:00 UTC');
    expect(approved.text).toContain('Publication remains subject to moderation');
  });

  it.each(['payment_rejected', 'payment_correction_requested', 'partial_payment'] as const)(
    'keeps %s clearly distinct from approved access',
    purpose => {
      const message = renderLaunchEmail({
        purpose,
        product: 'agent_launch_access',
        publicOrigin: 'https://www.propertylistifysa.co.za',
      });
      expect(message.subject).not.toContain('activated');
      expect(message.text).not.toContain('term was activated');
      expect(message.text).toContain('support@propertylistifysa.co.za');
    },
  );

  it('does not ask for another EFT or claim review is pending when an email is delayed past settlement', () => {
    const invoice = renderLaunchEmail({
      purpose: 'invoice_issued',
      product: 'agent_launch_access',
      publicOrigin: 'https://www.propertylistifysa.co.za',
      invoice: {
        invoiceNumber: 'TEST',
        paymentReference: 'EXACT',
        amountDue: 49900,
        amountPaid: 49900,
        currency: 'ZAR',
        status: 'paid',
      },
    });
    expect(invoice.text).toContain('Do not pay it again');
    expect(invoice.text).not.toContain('Pay by EFT');
    const notice = renderLaunchEmail({
      purpose: 'payment_notice_received',
      product: 'agent_launch_access',
      publicOrigin: 'https://www.propertylistifysa.co.za',
      noticeReviewed: true,
    });
    expect(notice.subject).not.toContain('pending');
    expect(notice.text).toContain('review status has changed');
    expect(notice.text).not.toContain('Verification is pending');
  });

  it('escapes invoice and bank content before rendering HTML', () => {
    const message = renderLaunchEmail({
      purpose: 'invoice_issued',
      product: 'agent_launch_access',
      publicOrigin: 'https://www.propertylistifysa.co.za',
      invoice: {
        invoiceNumber: '<script>bad</script>',
        paymentReference: '<img src=x>',
        amountDue: 49900,
        currency: 'ZAR',
      },
    });
    expect(message.html).not.toContain('<script>');
    expect(message.html).not.toContain('<img');
    expect(message.html).toContain('&lt;script&gt;');
  });

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
