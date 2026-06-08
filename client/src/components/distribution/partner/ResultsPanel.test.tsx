import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultsPanel } from './ResultsPanel';
import type { AcceleratorAssessment } from './acceleratorTypes';

const assessment: AcceleratorAssessment = {
  assessmentId: 'assessment-1',
  subjectName: null,
  subjectPhone: null,
  grossIncomeMonthly: 50000,
  deductionsMonthly: 0,
  depositAmount: 0,
  assumptions: {
    interestRateAnnual: 11.75,
    termMonths: 240,
    maxRepaymentRatio: 0.3,
    calcVersion: 'v1',
  },
  outputs: {
    maxMonthlyRepayment: 15000,
    indicativeLoanAmount: 1500000,
    indicativePurchaseMin: 1500000,
    indicativePurchaseMax: 1500000,
    purchasePrice: 1500000,
    confidenceLabel: 'Indicative',
    confidenceLevel: 'standard',
  },
  locationFilter: null,
  creditCheck: {
    consentGiven: false,
    requestedAt: null,
  },
  disclaimers: [],
  createdAt: '2026-06-08T00:00:00.000Z',
};

describe('ResultsPanel', () => {
  it('uses a transaction-neutral affordability ceiling label', () => {
    const onGetMatches = vi.fn();

    render(
      <ResultsPanel
        assessment={assessment}
        onGetMatches={onGetMatches}
        isLoadingMatches={false}
      />,
    );

    expect(screen.getByText('Indicative affordability ceiling')).toBeInTheDocument();
    expect(screen.queryByText('Indicative purchase price')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Get matches' }));
    expect(onGetMatches).toHaveBeenCalled();
  });
});
