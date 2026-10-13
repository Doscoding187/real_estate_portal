import { describe, expect, it } from 'vitest';
import { assessFinanceRetention, type FinanceRetentionFacts } from '../financeRetentionPolicy';

const base: FinanceRetentionFacts = {
  financialYearEndedOn: '2026-02-28',
  tax: { kind: 'return_filed', filedOn: '2026-09-01' },
  holds: [],
};
describe('Provisional finance retention review', () => {
  it('keeps accounting records through seven completed financial years', () => {
    expect(assessFinanceRetention(base, '2033-02-28')).toMatchObject({
      disposition: 'retain',
      retainThrough: '2033-02-28',
    });
    expect(assessFinanceRetention(base, '2033-03-01').disposition).toBe('review_due');
  });
  it('uses a later tax filing trigger when that extends the company floor', () => {
    expect(
      assessFinanceRetention(
        { ...base, tax: { kind: 'return_filed', filedOn: '2030-09-01' } },
        '2034-01-01',
      ),
    ).toMatchObject({ disposition: 'retain', retainThrough: '2035-09-01' });
  });
  it('keeps an unfiled return beyond the calculated company floor', () => {
    expect(
      assessFinanceRetention({ ...base, tax: { kind: 'return_outstanding' } }, '2040-01-01'),
    ).toMatchObject({ disposition: 'retain', reasons: ['tax_return_outstanding'] });
  });
  it.each(['audit', 'dispute', 'investigation', 'unresolved_refund'])(
    'retains a relevant %s hold beyond ordinary dates',
    hold => {
      expect(assessFinanceRetention({ ...base, holds: [hold] }, '2040-01-01').disposition).toBe(
        'retain',
      );
    },
  );
  it('uses the tax-period end only where no return is required', () => {
    expect(
      assessFinanceRetention(
        { ...base, tax: { kind: 'no_return_required', periodEndedOn: '2026-02-28' } },
        '2033-03-01',
      ).disposition,
    ).toBe('review_due');
  });
  it.each(['not-a-date', '2026-02-30', '2026-2-28'])(
    'fails closed on invalid financial year %s',
    financialYearEndedOn => {
      expect(
        assessFinanceRetention({ ...base, financialYearEndedOn }, '2040-01-01').disposition,
      ).toBe('retain');
    },
  );
  it('rejects an unverified future filing trigger', () => {
    expect(
      assessFinanceRetention(
        { ...base, tax: { kind: 'return_filed', filedOn: '2030-01-01' } },
        '2026-10-13',
      ).disposition,
    ).toBe('retain');
  });
  it('clamps a leap-day fiscal boundary to the final day of that month', () => {
    expect(
      assessFinanceRetention(
        {
          ...base,
          financialYearEndedOn: '2024-02-29',
          tax: { kind: 'return_filed', filedOn: '2024-09-01' },
        },
        '2030-01-01',
      ).retainThrough,
    ).toBe('2031-02-28');
  });
});
