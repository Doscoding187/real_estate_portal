import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  Loader2,
  MessageCircle,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { formatSARandShort, SA_PRIME_RATE, calculateMonthlyRepayment } from '@/lib/bond-calculator';

const DEFAULT_BOND_TERM_YEARS = 20;

const parseNumberInput = (value: string) => {
  const normalized = value.replace(/[^\d.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateAffordableLoanAmount = (
  monthlyBudget: number,
  annualInterestRate: number,
  termYears: number,
) => {
  if (monthlyBudget <= 0 || termYears <= 0) return 0;
  if (annualInterestRate <= 0) return monthlyBudget * termYears * 12;

  const monthlyRate = annualInterestRate / 100 / 12;
  const numberOfPayments = termYears * 12;
  const factor = Math.pow(1 + monthlyRate, numberOfPayments);

  return Math.round((monthlyBudget * (factor - 1)) / (monthlyRate * factor));
};

export interface PropertyQualificationSnapshot {
  monthlyIncome: number;
  coApplicantIncome: number;
  monthlyExpenses: number;
  monthlyDebts: number;
  availableDeposit: number;
  maxAffordable: number;
  comfortFloor: number;
  estimatedRepayment: number;
  resultTone: 'success' | 'warning' | 'muted';
  resultTitle: string;
  resultBody: string;
  accuracyScore: number;
  summaryMessage: string;
}

interface PropertyQualificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyTitle: string;
  propertyPrice: number;
  onProceedToEnquiry?: (snapshot: PropertyQualificationSnapshot) => void;
  onProceedToWhatsApp?: (snapshot: PropertyQualificationSnapshot) => void;
}

export function PropertyQualificationDrawer({
  open,
  onOpenChange,
  propertyTitle,
  propertyPrice,
  onProceedToEnquiry,
  onProceedToWhatsApp,
}: PropertyQualificationDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [financials, setFinancials] = useState({
    monthlyIncome: '',
    coApplicantIncome: '',
    monthlyExpenses: '',
    monthlyDebts: '',
    availableDeposit: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  const monthlyIncome = parseNumberInput(financials.monthlyIncome);
  const coApplicantIncome = parseNumberInput(financials.coApplicantIncome);
  const monthlyExpenses = parseNumberInput(financials.monthlyExpenses);
  const monthlyDebts = parseNumberInput(financials.monthlyDebts);
  const availableDeposit = parseNumberInput(financials.availableDeposit);
  const totalIncome = monthlyIncome + coApplicantIncome;

  const qualification = useMemo<PropertyQualificationSnapshot | null>(() => {
    if (totalIncome <= 0) return null;

    const completedFields = [
      monthlyIncome > 0,
      coApplicantIncome > 0,
      monthlyExpenses > 0,
      monthlyDebts > 0,
      availableDeposit > 0,
    ].filter(Boolean).length;
    const accuracyScore = Math.min(100, 40 + completedFields * 15);

    const baseRepaymentBudget = totalIncome / 3;
    const monthlyCommitments = monthlyExpenses + monthlyDebts;
    const commitmentRatio = totalIncome > 0 ? Math.min(monthlyCommitments / totalIncome, 0.7) : 0;
    const adjustedRepaymentBudget = Math.max(baseRepaymentBudget * (1 - commitmentRatio * 0.7), 0);
    const affordableLoan = calculateAffordableLoanAmount(
      adjustedRepaymentBudget,
      SA_PRIME_RATE,
      DEFAULT_BOND_TERM_YEARS,
    );
    const maxAffordable = Math.max(affordableLoan + availableDeposit, 0);
    const comfortFloor = Math.max(Math.round(maxAffordable * 0.82), 0);
    const estimatedRepayment = calculateMonthlyRepayment(
      Math.max(propertyPrice - availableDeposit, 0),
      SA_PRIME_RATE,
      DEFAULT_BOND_TERM_YEARS,
    );

    const qualifies = maxAffordable >= propertyPrice;
    const closeFit = !qualifies && maxAffordable >= propertyPrice * 0.9;
    const resultTone = qualifies ? 'success' : closeFit ? 'warning' : 'muted';
    const resultTitle = qualifies
      ? 'You likely qualify for this property'
      : closeFit
        ? 'You are close to qualifying'
        : 'This property may be above your current range';
    const resultBody = qualifies
      ? `Estimated buying power is up to ${formatSARandShort(maxAffordable)} for a property priced at ${formatSARandShort(propertyPrice)}.`
      : closeFit
        ? `You may still qualify with a stronger deposit or lower commitments. You are currently about ${formatSARandShort(Math.max(propertyPrice - maxAffordable, 0))} short of the target price.`
        : `Estimated buying power is around ${formatSARandShort(maxAffordable)}. Speak to the agent to explore next-best options or similar homes in your budget.`;

    const summaryMessage = [
      `I checked my qualification for ${propertyTitle}.`,
      `Estimated affordability range: ${formatSARandShort(comfortFloor)} - ${formatSARandShort(maxAffordable)}.`,
      `Monthly income: ${formatSARandShort(totalIncome)}.`,
      availableDeposit > 0 ? `Available deposit: ${formatSARandShort(availableDeposit)}.` : null,
      `Property price: ${formatSARandShort(propertyPrice)}.`,
      resultTitle,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      monthlyIncome,
      coApplicantIncome,
      monthlyExpenses,
      monthlyDebts,
      availableDeposit,
      maxAffordable,
      comfortFloor,
      estimatedRepayment,
      resultTone,
      resultTitle,
      resultBody,
      accuracyScore,
      summaryMessage,
    };
  }, [
    availableDeposit,
    coApplicantIncome,
    monthlyDebts,
    monthlyExpenses,
    monthlyIncome,
    propertyPrice,
    propertyTitle,
    totalIncome,
  ]);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        <Card className="border-slate-200 bg-slate-950 text-white shadow-none">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-2 text-orange-200">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Property Qualification</p>
                  <p className="text-xs text-slate-300">{propertyTitle}</p>
                </div>
              </div>
              <Badge className="border border-white/10 bg-white/10 text-white hover:bg-white/10">
                {formatSARandShort(propertyPrice)}
              </Badge>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Why use this</p>
              <p className="mt-2 text-sm text-slate-100">
                Check in real time whether this property fits your budget before you enquire or
                start a WhatsApp conversation.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-income">Monthly household income</Label>
            <Input
              id="monthly-income"
              inputMode="numeric"
              placeholder="e.g. 35 000"
              value={financials.monthlyIncome}
              onChange={event =>
                setFinancials(current => ({ ...current, monthlyIncome: event.target.value }))
              }
            />
          </div>

          {!showAdvanced && (
            <Button variant="outline" className="w-full" onClick={() => setShowAdvanced(true)}>
              Improve accuracy with more details
            </Button>
          )}

          {showAdvanced && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="co-income">Partner income</Label>
                <Input
                  id="co-income"
                  inputMode="numeric"
                  placeholder="Optional"
                  value={financials.coApplicantIncome}
                  onChange={event =>
                    setFinancials(current => ({
                      ...current,
                      coApplicantIncome: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit">Available deposit</Label>
                <Input
                  id="deposit"
                  inputMode="numeric"
                  placeholder="Optional"
                  value={financials.availableDeposit}
                  onChange={event =>
                    setFinancials(current => ({
                      ...current,
                      availableDeposit: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenses">Monthly expenses</Label>
                <Input
                  id="expenses"
                  inputMode="numeric"
                  placeholder="Optional"
                  value={financials.monthlyExpenses}
                  onChange={event =>
                    setFinancials(current => ({
                      ...current,
                      monthlyExpenses: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debts">Monthly debts</Label>
                <Input
                  id="debts"
                  inputMode="numeric"
                  placeholder="Optional"
                  value={financials.monthlyDebts}
                  onChange={event =>
                    setFinancials(current => ({ ...current, monthlyDebts: event.target.value }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        {qualification ? (
          <div className="space-y-4">
            <Card
              className={
                qualification.resultTone === 'success'
                  ? 'border-green-200 bg-green-50'
                  : qualification.resultTone === 'warning'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-slate-200 bg-slate-50'
              }
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {qualification.resultTitle}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{qualification.resultBody}</p>
                  </div>
                  <Badge
                    className={
                      qualification.resultTone === 'success'
                        ? 'bg-green-600 text-white hover:bg-green-600'
                        : qualification.resultTone === 'warning'
                          ? 'bg-amber-500 text-white hover:bg-amber-500'
                          : 'bg-slate-700 text-white hover:bg-slate-700'
                    }
                  >
                    {qualification.resultTone === 'success'
                      ? 'Likely Qualifies'
                      : qualification.resultTone === 'warning'
                        ? 'Close Fit'
                        : 'Budget Gap'}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/60 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <TrendingUp className="h-4 w-4 text-orange-500" />
                      Estimated buying power
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {formatSARandShort(qualification.maxAffordable)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Comfortable range starts near {formatSARandShort(qualification.comfortFloor)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Wallet className="h-4 w-4 text-orange-500" />
                      Estimated repayment
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {formatSARandShort(qualification.estimatedRepayment)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Based on a {DEFAULT_BOND_TERM_YEARS}-year bond at prime
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                    <span>Accuracy score</span>
                    <span className="font-semibold text-slate-900">
                      {qualification.accuracyScore}%
                    </span>
                  </div>
                  <Progress value={qualification.accuracyScore} className="h-2" />
                  <p className="mt-2 text-xs text-slate-500">
                    Add deposit, expenses, and debts for a stronger affordability estimate.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Qualification summary</p>
                  <p className="mt-1 text-sm text-slate-600">{qualification.summaryMessage}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Card className="border-dashed border-slate-200 shadow-none">
            <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-500">
              <Loader2 className="h-4 w-4" />
              Add your monthly income to see whether this property fits your budget.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white">
        {isMobile ? (
          <DrawerFooter className="bg-white">
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!qualification}
              onClick={() => qualification && onProceedToEnquiry?.(qualification)}
            >
              {qualification?.resultTone === 'success' ? 'Continue To Enquiry' : 'Talk To Agent'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full border-green-200 text-green-700 hover:bg-green-50"
              disabled={!qualification || !onProceedToWhatsApp}
              onClick={() => qualification && onProceedToWhatsApp?.(qualification)}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Send To WhatsApp
            </Button>
          </DrawerFooter>
        ) : (
          <SheetFooter className="bg-white">
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!qualification}
              onClick={() => qualification && onProceedToEnquiry?.(qualification)}
            >
              {qualification?.resultTone === 'success' ? 'Continue To Enquiry' : 'Talk To Agent'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full border-green-200 text-green-700 hover:bg-green-50"
              disabled={!qualification || !onProceedToWhatsApp}
              onClick={() => qualification && onProceedToWhatsApp?.(qualification)}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Send To WhatsApp
            </Button>
          </SheetFooter>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Check If You Qualify</DrawerTitle>
            <DrawerDescription>
              See in real time whether this property fits your budget.
            </DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Check If You Qualify</SheetTitle>
          <SheetDescription>
            Compare your affordability against this property before you enquire.
          </SheetDescription>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
