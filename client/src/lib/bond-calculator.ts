/**
 * South African Bond Repayment Calculator
 * Uses SA Prime Rate and bank-specific margins
 */

// Current SA Prime Rate (as of 2025) - Update periodically
export const SA_PRIME_RATE = 11.75; // SARB prime lending rate

// Major SA Banks and their typical bond rate margins above prime
export const SA_BANKS = {
  'Standard Bank': { margin: 0, minRate: 11.75 },
  FNB: { margin: 0, minRate: 11.75 },
  Absa: { margin: 0, minRate: 11.75 },
  Nedbank: { margin: 0, minRate: 11.75 },
  Capitec: { margin: 0, minRate: 11.75 },
  Other: { margin: 0, minRate: 11.75 },
} as const;

// Standard bond terms in SA (years)
export const BOND_TERMS = [5, 10, 15, 20, 25, 30] as const;

// Typical deposit percentages required by SA banks
export const DEPOSIT_PERCENTAGES = [0, 5, 10, 15, 20, 25, 30] as const;

export type SABank = keyof typeof SA_BANKS;
export type BondTerm = (typeof BOND_TERMS)[number];

export interface BondCalculationInput {
  propertyPrice: number;
  depositPercentage: number;
  interestRate: number; // Annual rate as percentage (e.g., 11.75)
  termYears: number;
}

export interface BondCalculationResult {
  loanAmount: number;
  depositAmount: number;
  monthlyRepayment: number;
  totalRepayment: number;
  totalInterest: number;
  effectiveMonthlyRate: number;
  amortizationSchedule?: AmortizationEntry[];
}

export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

/**
 * Calculate monthly bond repayment using the standard amortization formula
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * Where:
 *   M = Monthly payment
 *   P = Principal (loan amount)
 *   r = Monthly interest rate (annual rate / 12 / 100)
 *   n = Total number of payments (years * 12)
 */
export function calculateMonthlyRepayment(
  loanAmount: number,
  annualInterestRate: number,
  termYears: number,
): number {
  if (loanAmount <= 0 || termYears <= 0) return 0;
  if (annualInterestRate <= 0) return loanAmount / (termYears * 12);

  const monthlyRate = annualInterestRate / 100 / 12;
  const numberOfPayments = termYears * 12;

  const monthlyPayment =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  return Math.round(monthlyPayment * 100) / 100;
}

/**
 * Calculate complete bond details including amortization
 */
export function calculateBondRepayment(
  input: BondCalculationInput,
  includeSchedule = false,
): BondCalculationResult {
  const { propertyPrice, depositPercentage, interestRate, termYears } = input;

  // Calculate deposit and loan amount
  const depositAmount = Math.round((propertyPrice * depositPercentage) / 100);
  const loanAmount = propertyPrice - depositAmount;

  // Calculate monthly repayment
  const monthlyRepayment = calculateMonthlyRepayment(loanAmount, interestRate, termYears);

  // Calculate totals
  const totalRepayment = monthlyRepayment * termYears * 12;
  const totalInterest = totalRepayment - loanAmount;
  const effectiveMonthlyRate = interestRate / 12;

  const result: BondCalculationResult = {
    loanAmount,
    depositAmount,
    monthlyRepayment,
    totalRepayment,
    totalInterest,
    effectiveMonthlyRate,
  };

  // Generate amortization schedule if requested
  if (includeSchedule) {
    result.amortizationSchedule = generateAmortizationSchedule(input);
  }

  return result;
}

/**
 * Generate full amortization schedule showing principal and interest breakdown
 */
export function generateAmortizationSchedule(input: BondCalculationInput): AmortizationEntry[] {
  const { propertyPrice, depositPercentage, interestRate, termYears } = input;

  const depositAmount = Math.round((propertyPrice * depositPercentage) / 100);
  const loanAmount = propertyPrice - depositAmount;
  const monthlyRepayment = calculateMonthlyRepayment(loanAmount, interestRate, termYears);
  const monthlyRate = interestRate / 100 / 12;

  const schedule: AmortizationEntry[] = [];
  let balance = loanAmount;
  const totalMonths = termYears * 12;

  for (let month = 1; month <= totalMonths; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyRepayment - interestPayment;
    balance = balance - principalPayment;

    // Ensure balance doesn't go negative due to rounding
    if (balance < 0.01) balance = 0;

    schedule.push({
      month,
      payment: Math.round(monthlyRepayment * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    });
  }

  return schedule;
}

/**
 * Get interest rate for a specific SA bank
 */
export function getBankRate(bank: SABank = 'Standard Bank'): number {
  const bankInfo = SA_BANKS[bank];
  return SA_PRIME_RATE + bankInfo.margin;
}

/**
 * Calculate affordability - what property price can someone afford
 */
export function calculateAffordablePrice(
  monthlyBudget: number,
  depositPercentage: number,
  interestRate: number,
  termYears: number,
): number {
  // Work backwards from monthly payment to find loan amount
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = termYears * 12;

  const loanAmount =
    (monthlyBudget * (Math.pow(1 + monthlyRate, numberOfPayments) - 1)) /
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments));

  // Add deposit back to get total property price
  const propertyPrice = loanAmount / (1 - depositPercentage / 100);

  return Math.round(propertyPrice);
}

/**
 * Calculate transfer costs and bond registration fees (estimate for SA)
 */
export function calculateTransferCosts(propertyPrice: number): {
  transferDuty: number;
  bondRegistration: number;
  deedsOffice: number;
  transferAttorney: number;
  bondAttorney: number;
  total: number;
} {
  // SA Transfer Duty rates (2025 rates)
  let transferDuty = 0;
  if (propertyPrice > 1_100_000) {
    transferDuty = (propertyPrice - 1_100_000) * 0.13;
  } else if (propertyPrice > 1_500_000) {
    transferDuty = 52_000 + (propertyPrice - 1_500_000) * 0.11;
  } else if (propertyPrice > 2_250_000) {
    transferDuty = 134_500 + (propertyPrice - 2_250_000) * 0.13;
  }

  // Bond registration (roughly 1% of bond amount, min R10,000)
  const bondRegistration = Math.max(propertyPrice * 0.01, 10_000);

  // Deeds office fees (estimate)
  const deedsOffice = propertyPrice * 0.001 + 500;

  // Attorney fees (estimates)
  const transferAttorney = Math.max(propertyPrice * 0.005, 5_000);
  const bondAttorney = Math.max(propertyPrice * 0.005, 5_000);

  const total = transferDuty + bondRegistration + deedsOffice + transferAttorney + bondAttorney;

  return {
    transferDuty: Math.round(transferDuty),
    bondRegistration: Math.round(bondRegistration),
    deedsOffice: Math.round(deedsOffice),
    transferAttorney: Math.round(transferAttorney),
    bondAttorney: Math.round(bondAttorney),
    total: Math.round(total),
  };
}

/**
 * Format currency for South African Rands
 */
export function formatSARand(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format currency without decimals
 */
export function formatSARandShort(amount: number): string {
  return `R ${Math.round(amount).toLocaleString('en-ZA')}`;
}
