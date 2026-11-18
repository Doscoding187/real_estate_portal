import { useState } from 'react';
import { Calculator, CheckCircle2, Info, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PublicPropertyDetailFact } from '@shared/public-property-detail-presentation';
import { calculateMonthlyRepayment } from '@/lib/bond-calculator';
import { estimateTransferDuty, TRANSFER_DUTY_LABEL } from '@/lib/transferDuty';

export const EXAMPLE_INTEREST_RATE = 11.5;
export const EXAMPLE_RATE_LABEL = 'Example rate — check the current rate with your bank';
const MIN_INTEREST_RATE = 1;
const MAX_INTEREST_RATE = 30;
const INCOME_SHARE = 0.3;

const zar = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});
const MAX_GROSS_MONTHLY_INCOME = 300_000;

function numberFromText(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0;
  if (typeof value !== 'string') return 0;
  const result = Number(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(result) && result > 0 ? result : 0;
}

function monthlyCostValue(facts: PublicPropertyDetailFact[], key: string): string {
  const fact = facts.find(item => item.key === key);
  if (!fact || fact.status === 'not_supplied') return '';
  return String(numberFromText(fact.value) || '');
}

function parseAmount(value: string): number {
  const amount = Number(value.replace(/[\s,]/g, '').replace(/^R/i, ''));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
}

/** Pure scenario maths for the panel. Every output is an estimate. */
export function computeAffordabilityScenario({
  propertyPrice,
  depositPercent,
  interestRate,
  termYears,
}: {
  propertyPrice: number;
  depositPercent: number;
  interestRate: number;
  termYears: number;
}) {
  const depositAmount = Math.round((propertyPrice * depositPercent) / 100);
  const loanAmount = Math.max(propertyPrice - depositAmount, 0);
  const bondRepayment = calculateMonthlyRepayment(loanAmount, interestRate, termYears);
  return {
    depositAmount,
    loanAmount,
    bondRepayment,
    qualifyingIncome: bondRepayment / INCOME_SHARE,
    transferDuty: estimateTransferDuty(propertyPrice),
  };
}

export function CanYouAffordPanel({
  price,
  runningCosts,
  onShareWithAgent,
}: {
  price: unknown;
  runningCosts: PublicPropertyDetailFact[];
  onShareWithAgent?: (message: string) => void;
}) {
  const propertyPrice = numberFromText(price);
  const initialIncome =
    Math.ceil(
      calculateMonthlyRepayment(propertyPrice * 0.9, EXAMPLE_INTEREST_RATE, 30) /
        INCOME_SHARE /
        1_000,
    ) * 1_000;
  const [depositPercent, setDepositPercent] = useState(10);
  const [interestRateText, setInterestRateText] = useState(String(EXAMPLE_INTEREST_RATE));
  const [termYears, setTermYears] = useState(30);
  const levy = monthlyCostValue(runningCosts, 'levy');
  const ratesAndTaxes = monthlyCostValue(runningCosts, 'rates-and-taxes');
  const [grossIncome, setGrossIncome] = useState(
    String(Math.min(initialIncome, MAX_GROSS_MONTHLY_INCOME)),
  );

  const parsedRate = Number(interestRateText);
  const rateIsValid =
    interestRateText.trim() !== '' &&
    Number.isFinite(parsedRate) &&
    parsedRate >= MIN_INTEREST_RATE &&
    parsedRate <= MAX_INTEREST_RATE;
  // Fall back to the example rate for the maths while the typed value is out of range.
  const interestRate = rateIsValid ? parsedRate : EXAMPLE_INTEREST_RATE;

  const { depositAmount, bondRepayment, qualifyingIncome, transferDuty } =
    computeAffordabilityScenario({ propertyPrice, depositPercent, interestRate, termYears });
  const monthlyLevy = parseAmount(levy);
  const monthlyRatesAndTaxes = parseAmount(ratesAndTaxes);
  const monthlyTotal = bondRepayment + monthlyLevy + monthlyRatesAndTaxes;
  const grossIncomeAmount = parseAmount(grossIncome);
  const incomeSliderMax = MAX_GROSS_MONTHLY_INCOME;

  const incomeMayQualify = grossIncomeAmount >= qualifyingIncome;
  const incomeEstimateMessage = incomeMayQualify
    ? 'Based on the gross income selected, you may qualify for this property.'
    : 'Based on the gross income selected, this property may be above your current range.';
  const shareIncomeEstimate = () =>
    onShareWithAgent?.(
      `Hi, I'm interested in ${propertyPrice ? zar.format(propertyPrice) : 'this property'}. My combined gross monthly income is ${zar.format(grossIncomeAmount)}. Based on the estimated repayment, I ${incomeMayQualify ? 'may meet the income guideline' : 'would like to discuss whether I may qualify'}. Please contact me to discuss my options.`,
    );

  if (propertyPrice <= 0) return null;

  return (
    <>
      <section
        aria-labelledby="can-you-afford-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Calculator className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="can-you-afford-heading" className="text-lg font-extrabold text-slate-950">
              Can you afford it? Work it out here
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Adjust your deposit, interest rate and term to estimate what owning this home could
              cost. All figures are estimates.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6">
          <div className="space-y-5">
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Estimated minimum combined gross income
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-slate-950">
                    {zar.format(qualifyingIncome)}{' '}
                    <span className="text-xs font-semibold">/ mo</span>
                  </p>
                </div>
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Based on this scenario's bond repayment using 30% of gross income.
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <label htmlFor="afford-income-slider" className="font-bold text-slate-800">
                  Your combined gross monthly income
                </label>
                <span className="font-semibold text-slate-700">
                  {zar.format(grossIncomeAmount)}
                </span>
              </div>
              <input
                id="afford-income-slider"
                type="range"
                min="0"
                max={incomeSliderMax}
                step="1000"
                value={Math.min(grossIncomeAmount, incomeSliderMax)}
                onChange={event => {
                  setGrossIncome(event.target.value);
                }}
                aria-label="Adjust combined gross monthly income"
                className="h-2 w-full cursor-pointer accent-blue-700"
              />
              <div className="mt-1 flex justify-between gap-2 text-[10px] text-slate-500">
                <span>Adjust the slider to match your household income.</span>
                <span>Minimum: {zar.format(qualifyingIncome)}</span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <label htmlFor="afford-deposit" className="font-bold text-slate-800">
                  Deposit
                </label>
                <span className="font-semibold text-slate-700">
                  {depositPercent}% · {zar.format(depositAmount)}
                </span>
              </div>
              <input
                id="afford-deposit"
                type="range"
                min="0"
                max="50"
                step="1"
                value={depositPercent}
                onChange={event => {
                  setDepositPercent(Number(event.target.value));
                }}
                className="h-2 w-full cursor-pointer accent-blue-700"
              />
            </div>

            <div>
              <label htmlFor="afford-rate" className="mb-2 block text-xs font-bold text-slate-800">
                Interest rate (% per year)
              </label>
              <input
                id="afford-rate"
                type="number"
                inputMode="decimal"
                min={MIN_INTEREST_RATE}
                max={MAX_INTEREST_RATE}
                step="0.05"
                value={interestRateText}
                onChange={event => setInterestRateText(event.target.value)}
                aria-describedby="afford-rate-note"
                aria-invalid={!rateIsValid}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <p id="afford-rate-note" className="mt-1 text-[11px] text-slate-500">
                {EXAMPLE_RATE_LABEL}
                {!rateIsValid &&
                  ` Enter a rate between ${MIN_INTEREST_RATE}% and ${MAX_INTEREST_RATE}%; the example rate of ${EXAMPLE_INTEREST_RATE}% is used until then.`}
              </p>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-bold text-slate-800">Repayment term</legend>
              <div className="grid grid-cols-3 gap-2">
                {[20, 25, 30].map(term => (
                  <button
                    key={term}
                    type="button"
                    aria-pressed={termYears === term}
                    onClick={() => setTermYears(term)}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                      termYears === term
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    {term} years
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4 sm:p-5">
            <p className="text-xs font-semibold text-slate-700">Estimated monthly cost</p>
            <p
              className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950"
              data-testid="afford-monthly-total"
            >
              {zar.format(monthlyTotal)}
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Bond estimate plus monthly costs supplied for this property.
            </p>
            <div className="mt-4 space-y-2 border-t border-blue-100 pt-3 text-xs">
              <CostLine
                label="Bond repayment (estimate)"
                value={zar.format(bondRepayment)}
                testId="afford-bond"
              />
              <CostLine label="Levy" value={monthlyLevy ? zar.format(monthlyLevy) : 'Not provided'} />
              <CostLine
                label="Rates & taxes"
                value={monthlyRatesAndTaxes ? zar.format(monthlyRatesAndTaxes) : 'Not provided'}
              />
              <CostLine
                label="Estimated minimum combined gross income"
                value={`${zar.format(qualifyingIncome)} / mo`}
              />
            </div>

            <div className="mt-4 space-y-2 border-t border-blue-100 pt-3 text-xs">
              <p className="font-semibold text-slate-800">Cash needed upfront (estimate)</p>
              <CostLine label="Deposit" value={zar.format(depositAmount)} />
              <CostLine
                label="Transfer duty estimate"
                value={zar.format(transferDuty)}
                testId="afford-transfer-duty"
              />
              <CostLine label="Attorney & bond fees" value="Quote on request" />
            </div>

            <Button
              className="mt-4 h-11 w-full bg-orange-500 font-bold text-white hover:bg-orange-600"
              onClick={shareIncomeEstimate}
              disabled={!onShareWithAgent}
            >
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Share estimate with the agent
            </Button>
            <div
              className={`mt-3 rounded-lg border p-3 ${incomeMayQualify ? 'border-emerald-200 bg-emerald-50' : 'border-orange-200 bg-orange-50'}`}
            >
              <p
                className={`flex items-center gap-2 text-sm font-bold ${incomeMayQualify ? 'text-emerald-900' : 'text-orange-900'}`}
              >
                {incomeMayQualify && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                )}
                {incomeMayQualify
                  ? 'You may qualify for this property'
                  : 'You may need a higher combined income'}
              </p>
              <p className="mt-1 text-xs text-slate-700">
                {incomeEstimateMessage} Final affordability depends on debts, deposit, credit
                checks and lender assessment.
              </p>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span>
                Scenario only. {TRANSFER_DUTY_LABEL}; it assumes the sale is not subject to VAT.
                Legal fees vary.
              </span>
            </p>
            <a
              href="https://www.sars.gov.za/tax-rates/transfer-duty/"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[10px] font-semibold text-blue-700 underline"
            >
              View SARS transfer duty rates
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function CostLine({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-slate-600">
      <span>{label}</span>
      <span className="shrink-0 text-right font-semibold text-slate-900" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}
