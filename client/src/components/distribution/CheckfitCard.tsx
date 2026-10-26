import { useMemo, useState } from 'react';
import { ArrowRight, Calculator, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import {
  CHECKFIT_RATE_SOURCE,
  CHECKFIT_RATE_SOURCE_LABEL,
  readCheckfitSnapshot,
  saveCheckfitSnapshot,
  type CheckfitSnapshot,
} from './distributionCheckfitStorage';

function formatRand(value: number) {
  return `R${Math.round(value).toLocaleString('en-ZA')}`;
}

function formatSavedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function parseRandInput(value: string): number | null {
  const normalized = value.replace(/[\s,]/g, '').replace(/^R/i, '');
  if (!normalized) return null;
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function CheckfitCard({
  marketMode,
  onStartIntroduction,
}: {
  marketMode: 'sale' | 'rent';
  onStartIntroduction: () => void;
}) {
  const storedSnapshot = useMemo(() => readCheckfitSnapshot(), []);
  const [stored, setStored] = useState<CheckfitSnapshot | null>(storedSnapshot);
  const [grossIncome, setGrossIncome] = useState(
    storedSnapshot ? String(storedSnapshot.inputs.grossMonthlyIncome) : '',
  );
  const [monthlyDebts, setMonthlyDebts] = useState(
    storedSnapshot && storedSnapshot.inputs.monthlyDebts > 0
      ? String(storedSnapshot.inputs.monthlyDebts)
      : '',
  );
  const [deposit, setDeposit] = useState(
    storedSnapshot && storedSnapshot.inputs.deposit > 0 ? String(storedSnapshot.inputs.deposit) : '',
  );
  const [inputError, setInputError] = useState('');

  const checkfitMutation = trpc.distribution.calculateCheckfit.useMutation();
  type CheckfitOutcome = NonNullable<typeof checkfitMutation.data>;
  const [freshOutcome, setFreshOutcome] = useState<CheckfitOutcome | null>(null);

  const storedOutcome = useMemo(() => {
    if (!stored) return null;
    return {
      available: true as const,
      policyVersion: stored.policyVersion,
      assumptions: {
        annualInterestRate: stored.assumptions.annualInterestRate,
        rateSource: CHECKFIT_RATE_SOURCE,
        rateSourceLabel: CHECKFIT_RATE_SOURCE_LABEL,
        rateUpdatedAt: stored.assumptions.rateUpdatedAt,
        termMonths: stored.assumptions.termMonths,
        repaymentAllowanceRatio: stored.assumptions.repaymentAllowanceRatio,
      },
      inputs: stored.inputs,
      result: stored.result,
      disclaimers: stored.disclaimers,
    };
  }, [stored]);

  const outcome = freshOutcome ?? storedOutcome;

  const handleCheck = () => {
    const gross = parseRandInput(grossIncome);
    const debts = monthlyDebts.trim() ? parseRandInput(monthlyDebts) : 0;
    const depositAmount = deposit.trim() ? parseRandInput(deposit) : 0;

    if (gross === null || gross <= 0) {
      setInputError('Enter the gross monthly income in whole rands.');
      return;
    }
    if (debts === null || depositAmount === null) {
      setInputError('Monthly debt repayments and deposit must be whole rand amounts, or left empty.');
      return;
    }
    setInputError('');
    checkfitMutation.mutate(
      { grossMonthlyIncome: gross, monthlyDebts: debts, deposit: depositAmount },
      {
        onSuccess: data => {
          setFreshOutcome(data);
          if (!data.available) return;
          const snapshot: CheckfitSnapshot = {
            version: 1,
            savedAt: new Date().toISOString(),
            policyVersion: data.policyVersion,
            inputs: data.inputs,
            assumptions: {
              annualInterestRate: data.assumptions.annualInterestRate,
              rateUpdatedAt: data.assumptions.rateUpdatedAt,
              termMonths: data.assumptions.termMonths,
              repaymentAllowanceRatio: data.assumptions.repaymentAllowanceRatio,
            },
            result: data.result,
            disclaimers: data.disclaimers,
          };
          saveCheckfitSnapshot(snapshot);
          setStored(snapshot);
        },
      },
    );
  };

  const savedAtLabel = stored ? formatSavedAt(stored.savedAt) : null;

  return (
    <section
      id="check-fit"
      className="scroll-mt-24 border-b border-t border-slate-200 bg-slate-50 py-16 md:py-24"
    >
      <div className="container">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
              Purchase check-fit
            </div>
            <h2 className="mb-5 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              Check what they may afford.
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-slate-600">
              An indicative purchase range based on the current SARB prime rate, a 20-year loan
              term, and at most 30% of gross monthly income used for the bond repayment. No added
              risk margin is applied.
            </p>
            <ul className="mb-6 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Indicative only — this is not a bond approval or a credit decision.
              </li>
              <li className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Your amounts are used only for this calculation and are not saved on our servers.
              </li>
            </ul>
            {marketMode === 'rent' ? (
              <div className="rounded-r-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                You are browsing rentals. Rental affordability uses a separate model that is not
                available yet — keep browsing rental options by listed monthly rent. This check is
                for a purchase.
              </div>
            ) : null}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] md:p-8">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[100px] bg-blue-50" />

            <div className="relative z-10 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label
                  htmlFor="checkfit-gross-income"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Gross monthly income (R)
                </label>
                <input
                  id="checkfit-gross-income"
                  inputMode="numeric"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  value={grossIncome}
                  onChange={event => setGrossIncome(event.target.value)}
                  placeholder="e.g. 45000"
                />
              </div>
              <div>
                <label
                  htmlFor="checkfit-monthly-debts"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Monthly debt repayments (R)
                </label>
                <input
                  id="checkfit-monthly-debts"
                  inputMode="numeric"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  value={monthlyDebts}
                  onChange={event => setMonthlyDebts(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label
                  htmlFor="checkfit-deposit"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Deposit available (R)
                </label>
                <input
                  id="checkfit-deposit"
                  inputMode="numeric"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  value={deposit}
                  onChange={event => setDeposit(event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {inputError ? (
              <p role="alert" className="mt-3 text-sm font-medium text-amber-700">
                {inputError}
              </p>
            ) : null}

            <Button
              className="mt-5 h-12 w-full text-base font-bold"
              variant="conversion"
              disabled={checkfitMutation.isPending}
              onClick={handleCheck}
            >
              {checkfitMutation.isPending ? 'Checking…' : 'Check indicative range'}
            </Button>

            <div aria-live="polite" className="mt-5">
              {checkfitMutation.isError ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  The check-fit calculated but the request failed. Please try again.
                </p>
              ) : outcome && !outcome.available ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  The check-fit is temporarily unavailable because the current prime rate is not
                  configured. You can still explore options by listed price.
                </p>
              ) : outcome?.available ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Indicative purchase price up to
                  </p>
                  <p className="mb-3 text-2xl font-bold text-slate-900">
                    {formatRand(outcome.result.estimatedPurchasePrice)}
                  </p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    <li>
                      Estimated home loan: <strong>{formatRand(outcome.result.estimatedLoanAmount)}</strong>
                    </li>
                    <li>
                      Monthly repayment allowance used:{' '}
                      <strong>{formatRand(outcome.result.repaymentAllowanceMonthly)}</strong>
                    </li>
                    {outcome.inputs.deposit > 0 ? (
                      <li>
                        Deposit added: <strong>{formatRand(outcome.inputs.deposit)}</strong>
                      </li>
                    ) : null}
                  </ul>
                  <p className="mt-3 text-xs leading-5 text-slate-600">
                    Assumes {outcome.assumptions.annualInterestRate.toFixed(2)}% interest (
                    {outcome.assumptions.rateSourceLabel}), a{' '}
                    {Math.round(outcome.assumptions.termMonths / 12)}-year term, and up to{' '}
                    {Math.round(outcome.assumptions.repaymentAllowanceRatio * 100)}% of gross monthly
                    income for the repayment.
                  </p>
                  {outcome.disclaimers.map(disclaimer => (
                    <p key={disclaimer} className="mt-2 text-xs leading-5 text-slate-500">
                      {disclaimer}
                    </p>
                  ))}
                  {!freshOutcome && savedAtLabel ? (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Saved in this browser · {savedAtLabel}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <Button
              className="mt-5 h-12 w-full text-base font-bold"
              variant="outline"
              onClick={onStartIntroduction}
            >
              Start an introduction
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              This check-fit stays in this browser. Your selected shortlist can be attached to your account when you sign in.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
