import { describe, expect, it } from 'vitest';

import {
  formatCommercialStatus,
  formatInvoiceStatus,
  formatReviewEventStatus,
} from '../developerStatusVocabulary';

describe('developer status vocabulary', () => {
  it('translates canonical commercial subscription states without leaking raw enums', () => {
    expect(formatCommercialStatus('active')).toBe('Active');
    expect(formatCommercialStatus('expired')).toBe('Expired');
    expect(formatCommercialStatus('pending_payment')).toBe('Activation required');
    expect(formatCommercialStatus('payment_under_review')).toBe('Payment under review');
    expect(formatCommercialStatus(null)).toBe('Unavailable');
    expect(formatCommercialStatus(undefined)).toBe('Unavailable');
  });

  it('distinguishes invoice-issued from proof-under-review', () => {
    expect(formatInvoiceStatus('issued')).toBe('Invoice issued — awaiting payment');
    expect(formatInvoiceStatus('submitted')).toBe('Proof under review');
    expect(formatInvoiceStatus('partially_paid')).toBe('Partially paid');
    expect(formatInvoiceStatus('overdue')).toBe('Overdue');
    expect(formatInvoiceStatus('paid')).toBe('Paid');
  });

  it('humanizes development review event states', () => {
    expect(formatReviewEventStatus('approved')).toBe('Approved');
    expect(formatReviewEventStatus('changes_requested')).toBe('Changes requested');
    expect(formatReviewEventStatus('reviewing')).toBe('Under review');
    // Unknown future enum degrades to readable text, never raw underscores.
    expect(formatReviewEventStatus('future_state')).toBe('future state');
  });
});
