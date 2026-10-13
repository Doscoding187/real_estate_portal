/** Internal review selector only: no database, deletion or authorisation side effects. */
export interface FinanceRetentionFacts {
  financialYearEndedOn: string;
  tax:
    | { kind: 'return_filed'; filedOn: string }
    | { kind: 'no_return_required'; periodEndedOn: string }
    | { kind: 'return_outstanding' };
  holds: string[];
}

function date(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const result = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(result.getTime()) && result.toISOString().slice(0, 10) === value
    ? result
    : undefined;
}

function yearsAfter(value: Date, years: number): string {
  const year = value.getUTCFullYear() + years;
  const month = value.getUTCMonth();
  const day = Math.min(value.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/** Accounting row's financial year plus seven completed years; tax duty is
 * evaluated separately. A due date permits review, never automatic disposal.
 * Input financial-year and return facts must come from verified records. */
export function assessFinanceRetention(
  facts: FinanceRetentionFacts,
  asOf: string,
): {
  disposition: 'retain' | 'review_due';
  retainThrough?: string;
  reasons: string[];
} {
  const now = date(asOf);
  const financialYearEnd = date(facts.financialYearEndedOn);
  if (!now || !financialYearEnd || !Array.isArray(facts.holds))
    return { disposition: 'retain', reasons: ['missing_or_invalid_record_facts'] };
  const companyDate = yearsAfter(financialYearEnd, 7);
  if (facts.tax.kind === 'return_outstanding') {
    return {
      disposition: 'retain',
      retainThrough: companyDate,
      reasons: ['tax_return_outstanding', ...facts.holds],
    };
  }
  const taxDate = date(
    facts.tax.kind === 'return_filed' ? facts.tax.filedOn : facts.tax.periodEndedOn,
  );
  if (!taxDate || taxDate > now)
    return { disposition: 'retain', reasons: ['missing_or_invalid_tax_trigger'] };
  const taxThrough = yearsAfter(taxDate, 5);
  const retainThrough = companyDate > taxThrough ? companyDate : taxThrough;
  if (facts.holds.length)
    return { disposition: 'retain', retainThrough, reasons: ['unresolved_hold', ...facts.holds] };
  return {
    disposition: asOf > retainThrough ? 'review_due' : 'retain',
    retainThrough,
    reasons: [
      asOf > retainThrough
        ? 'minimum_periods_elapsed_review_necessity_before_disposal'
        : 'company_or_tax_minimum',
    ],
  };
}
