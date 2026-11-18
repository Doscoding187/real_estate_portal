import { useState } from 'react';
import { Calculator, ChevronRight } from 'lucide-react';
import type { PublicPropertyDetailFact } from '@shared/public-property-detail-presentation';
import { calculateMonthlyRepayment } from '@/lib/bond-calculator';

const EXAMPLE_ANNUAL_RATE_PERCENT = 11.5;
const EXAMPLE_TERM_YEARS = 30;
const INCOME_SHARE = 0.3;
const EXAMPLE_RATE_LABEL = 'Example rate — check the current rate with your bank';

const zar = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

function numericPrice(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0;
  if (typeof value !== 'string') return 0;
  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function recurringCost(facts: PublicPropertyDetailFact[], key: string): string | undefined {
  const fact = facts.find(item => item.key === key);
  return fact?.value;
}

function Metric({
  label,
  value,
  supportingText,
}: {
  label: string;
  value: string;
  supportingText?: string;
}) {
  return (
    <div className="min-w-0 xl:border-l xl:border-blue-200 xl:pl-3 xl:first:border-l-0 xl:first:pl-0">
      <p className="text-[11px] font-medium leading-tight text-slate-600">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold leading-tight text-slate-950" title={value}>
        {value}
      </p>
      {supportingText && (
        <p className="mt-1 text-[10px] leading-tight text-slate-500">{supportingText}</p>
      )}
    </div>
  );
}

export function PurchaseUnderstandingPanel({
  price,
  runningCosts,
}: {
  price: unknown;
  runningCosts: PublicPropertyDetailFact[];
}) {
  const [showDetails, setShowDetails] = useState(false);
  const askingPrice = numericPrice(price);
  if (askingPrice <= 0) return null;

  const bondRepayment = calculateMonthlyRepayment(
    askingPrice,
    EXAMPLE_ANNUAL_RATE_PERCENT,
    EXAMPLE_TERM_YEARS,
  );
  const grossIncome = bondRepayment / INCOME_SHARE;
  const ratesAndTaxes = recurringCost(runningCosts, 'rates-and-taxes');
  const levy = recurringCost(runningCosts, 'levy');

  return (
    <section
      aria-labelledby="purchase-understanding-heading"
      className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
          <div>
            <h2
              id="purchase-understanding-heading"
              className="text-sm font-extrabold text-slate-950"
            >
              Understanding the purchase
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
              A guide to the costs involved. Figures are estimates.
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={showDetails}
          aria-controls="purchase-understanding-details"
          onClick={() => setShowDetails(value => !value)}
          className="inline-flex items-center justify-center gap-1 self-start justify-self-end rounded-lg border border-blue-200 bg-white px-3 py-2 text-[11px] font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {showDetails ? 'Less details' : 'More details'}
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform ${showDetails ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        className={`mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 ${
          levy ? 'xl:grid-cols-5' : 'xl:grid-cols-4'
        } xl:gap-x-0`}
      >
        <Metric label="Listing price" value={zar.format(askingPrice)} />
        <Metric
          label="Est. bond repayment"
          value={`${zar.format(bondRepayment)} / mo`}
          supportingText={`${EXAMPLE_TERM_YEARS} yrs at ${EXAMPLE_ANNUAL_RATE_PERCENT.toFixed(1)}% (example rate)`}
        />
        <Metric
          label="Est. minimum gross income"
          value={`${zar.format(grossIncome)} / mo`}
          supportingText="At 30% of income"
        />
        <Metric label="Rates & taxes" value={ratesAndTaxes || 'Unavailable'} />
        {levy && <Metric label="Levies" value={levy} />}
      </div>

      <p
        id="purchase-understanding-details"
        hidden={!showDetails}
        className="mt-4 border-t border-blue-200 pt-3 text-xs leading-relaxed text-slate-600"
      >
        {EXAMPLE_RATE_LABEL}. The bond and income figures are illustrative estimates. They assume
        the full listing price is financed over {EXAMPLE_TERM_YEARS} years at a fixed{' '}
        {EXAMPLE_ANNUAL_RATE_PERCENT.toFixed(1)}% annual interest rate, with the repayment equal to
        30% of gross monthly income. Use the calculator below to change the deposit, rate and term.
        Actual loan terms and affordability depend on the lender, deposit, rate and applicant.
        Rates, taxes and levies show only amounts supplied for this listing; no estimate is shown
        when details are missing.
      </p>
    </section>
  );
}
