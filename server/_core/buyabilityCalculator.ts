/**
 * Buyability Calculator for Real Estate Prospects
 *
 * This module calculates a prospect's buyability score and affordability range
 * based on their financial information and South African real estate market conditions.
 *
 * Key South African Factors:
 * - Prime lending rate (currently ~11.75%)
 * - Bond registration costs (~1-2% of property value)
 * - Transfer duties (progressive scale)
 * - Legal fees (~1% of property value)
 * - Monthly household expenses considerations
 */

export interface ProspectFinancialData {
  income?: number; // Monthly gross income in cents
  incomeRange?: 'under_15k' | '15k_25k' | '25k_50k' | '50k_100k' | 'over_100k';
  combinedIncome?: number; // Joint applications
  monthlyExpenses?: number; // Rent, utilities, etc.
  monthlyDebts?: number; // Existing loans, credit cards
  dependents?: number;
  savingsDeposit?: number; // Available for down payment
  creditScore?: number; // Optional
}

export interface BuyabilityResult {
  score: 'low' | 'medium' | 'high';
  affordabilityMin: number; // Min property price they can afford (in cents)
  affordabilityMax: number; // Max property price they can afford (in cents)
  monthlyPaymentCapacity: number; // Max monthly payment capacity (in cents)
  confidence: number; // 0-100% - how confident we are in this calculation
  factors: {
    debtToIncomeRatio: number;
    loanToValueRatio: number;
    monthlyDisposableIncome: number;
    recommendedDownPayment: number;
  };
  recommendations: string[];
}

// South African lending constants (2024)
const SA_LENDING_CONSTANTS = {
  PRIME_RATE: 11.75, // Current prime lending rate
  MAX_LOAN_TO_VALUE: 0.9, // 90% max LTV for residential properties
  MIN_DOWN_PAYMENT: 0.1, // 10% minimum down payment
  BOND_REGISTRATION_COST: 0.015, // 1.5% of property value
  TRANSFER_DUTIES: {
    // Progressive scale for transfer duties
    brackets: [
      { maxValue: 1000000, rate: 0 }, // R0 - R1M: 0%
      { maxValue: 1500000, rate: 0.005 }, // R1M - R1.5M: 0.5%
      { maxValue: 2000000, rate: 0.01 }, // R1.5M - R2M: 1%
      { maxValue: 2500000, rate: 0.015 }, // R2M - R2.5M: 1.5%
      { maxValue: 10000000, rate: 0.02 }, // R2.5M - R10M: 2%
      { maxValue: Infinity, rate: 0.025 }, // Over R10M: 2.5%
    ],
  },
  LEGAL_FEES_ESTIMATE: 0.01, // 1% estimate
  MONTHLY_LIVING_EXPENSES: {
    single: 800000, // R8,000/month for essentials
    couple: 1200000, // R12,000/month
    family: 1500000, // R15,000/month with dependents
  },
  INSURANCE_ESTIMATE: 0.0005, // 0.05% of property value per month
  MAINTENANCE_ESTIMATE: 0.001, // 0.1% of property value per month
};

function calculateTransferDuty(propertyValue: number): number {
  let totalDuty = 0;
  let remainingValue = propertyValue;

  for (const bracket of SA_LENDING_CONSTANTS.TRANSFER_DUTIES.brackets) {
    if (remainingValue <= 0) break;

    const taxableInBracket = Math.min(
      remainingValue,
      bracket.maxValue - (propertyValue - remainingValue),
    );
    totalDuty += taxableInBracket * bracket.rate;
    remainingValue -= taxableInBracket;
  }

  return totalDuty;
}

function calculateMonthlyPaymentCapacity(financialData: ProspectFinancialData): number {
  // Convert income to monthly amount (already in cents)
  const monthlyIncome = (financialData.income || 0) + (financialData.combinedIncome || 0);

  // Get household size for expense estimation
  const householdSize =
    (financialData.dependents || 0) > 0
      ? 'family'
      : financialData.combinedIncome
        ? 'couple'
        : 'single';

  const estimatedLivingExpenses =
    SA_LENDING_CONSTANTS.MONTHLY_LIVING_EXPENSES[
      householdSize as keyof typeof SA_LENDING_CONSTANTS.MONTHLY_LIVING_EXPENSES
    ];

  // Add user-reported expenses
  const totalMonthlyExpenses = estimatedLivingExpenses + (financialData.monthlyExpenses || 0);

  // Subtract existing debts
  const disposableIncome = monthlyIncome - totalMonthlyExpenses - (financialData.monthlyDebts || 0);

  // Banks typically allow 30-40% of disposable income for housing
  // We'll use 35% as a conservative estimate
  const housingAffordabilityRatio = 0.35;

  return Math.max(0, disposableIncome * housingAffordabilityRatio);
}

function calculateAffordabilityRange(
  monthlyPaymentCapacity: number,
  downPayment: number,
  confidence: number,
): { min: number; max: number } {
  // Estimate interest rate (prime + 1-2% margin depending on credit)
  const baseRate = SA_LENDING_CONSTANTS.PRIME_RATE;
  const riskMargin = confidence > 80 ? 1 : confidence > 60 ? 1.5 : 2;
  const interestRate = baseRate + riskMargin;

  // Assume 20-year bond (240 months)
  const loanTermMonths = 240;

  // Monthly payment formula: P = L[r(1+r)^n]/[(1+r)^n-1]
  // Where P = monthly payment, L = loan amount, r = monthly rate, n = number of payments

  const monthlyRate = interestRate / 100 / 12;

  // Calculate maximum loan amount based on monthly payment capacity
  // P = L[r(1+r)^n]/[(1+r)^n-1] => L = P * [(1+r)^n-1] / [r(1+r)^n]
  const maxLoanAmount =
    monthlyPaymentCapacity *
    ((Math.pow(1 + monthlyRate, loanTermMonths) - 1) /
      (monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)));

  // Maximum property value (loan + down payment)
  const maxPropertyValue = maxLoanAmount + downPayment;

  // Minimum property value (more conservative - 80% of max for range)
  const minPropertyValue = maxPropertyValue * 0.8;

  return {
    min: Math.max(0, minPropertyValue),
    max: maxPropertyValue,
  };
}

function calculateBuyabilityScore(
  financialData: ProspectFinancialData,
  monthlyPaymentCapacity: number,
  downPayment: number,
): 'low' | 'medium' | 'high' {
  const monthlyIncome = (financialData.income || 0) + (financialData.combinedIncome || 0);
  const monthlyDebts = financialData.monthlyDebts || 0;

  // Debt-to-Income ratio (should be under 40% for good credit)
  const dti = monthlyIncome > 0 ? (monthlyDebts / monthlyIncome) * 100 : 100;

  // Payment-to-Income ratio (should be under 35%)
  const pti = monthlyIncome > 0 ? (monthlyPaymentCapacity / monthlyIncome) * 100 : 100;

  // Down payment ratio (higher is better)
  const estimatedPropertyValue = monthlyPaymentCapacity * 10; // Rough estimate
  const downPaymentRatio =
    estimatedPropertyValue > 0 ? (downPayment / estimatedPropertyValue) * 100 : 0;

  // Credit score factor (if provided)
  const creditScore = financialData.creditScore;
  let creditFactor = 0;
  if (creditScore) {
    if (creditScore >= 750) creditFactor = 10;
    else if (creditScore >= 650) creditFactor = 5;
    else if (creditScore >= 550) creditFactor = 0;
    else creditFactor = -10;
  }

  // Calculate composite score (0-100)
  const dtiScore = Math.max(0, 100 - (dti - 30) * 5); // Penalize DTI over 30%
  const ptiScore = Math.max(0, 100 - (pti - 30) * 5); // Penalize PTI over 30%
  const downPaymentScore = Math.min(100, downPaymentRatio * 2); // Reward higher down payments

  const compositeScore = dtiScore * 0.3 + ptiScore * 0.4 + downPaymentScore * 0.3 + creditFactor;

  // Determine buyability level
  if (compositeScore >= 70) return 'high';
  if (compositeScore >= 40) return 'medium';
  return 'low';
}

export function calculateBuyability(financialData: ProspectFinancialData): BuyabilityResult {
  // Calculate monthly payment capacity
  const monthlyPaymentCapacity = calculateMonthlyPaymentCapacity(financialData);

  // Estimate available down payment
  const downPayment = financialData.savingsDeposit || 0;

  // Calculate affordability range
  const confidence = calculateConfidenceScore(financialData);
  const affordability = calculateAffordabilityRange(
    monthlyPaymentCapacity,
    downPayment,
    confidence,
  );

  // Determine buyability score
  const score = calculateBuyabilityScore(financialData, monthlyPaymentCapacity, downPayment);

  // Calculate factors for transparency
  const monthlyIncome = (financialData.income || 0) + (financialData.combinedIncome || 0);
  const monthlyDebts = financialData.monthlyDebts || 0;
  const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyDebts / monthlyIncome) * 100 : 0;

  const estimatedLoanAmount = affordability.max - downPayment;
  const estimatedPropertyValue = affordability.max;
  const loanToValueRatio =
    estimatedPropertyValue > 0 ? (estimatedLoanAmount / estimatedPropertyValue) * 100 : 0;

  // Recommended down payment (10-20% of property value)
  const recommendedDownPayment = Math.min(downPayment, estimatedPropertyValue * 0.2);

  // Generate recommendations
  const recommendations = generateRecommendations(financialData, score, confidence);

  return {
    score,
    affordabilityMin: Math.round(affordability.min),
    affordabilityMax: Math.round(affordability.max),
    monthlyPaymentCapacity: Math.round(monthlyPaymentCapacity),
    confidence,
    factors: {
      debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
      loanToValueRatio: Math.round(loanToValueRatio * 100) / 100,
      monthlyDisposableIncome: Math.round(monthlyIncome - monthlyPaymentCapacity),
      recommendedDownPayment: Math.round(recommendedDownPayment),
    },
    recommendations,
  };
}

function calculateConfidenceScore(financialData: ProspectFinancialData): number {
  let confidence = 0;

  // Income provided (40% weight)
  if (financialData.income || financialData.incomeRange || financialData.combinedIncome) {
    confidence += 40;
  }

  // Expenses and debts provided (30% weight)
  if (financialData.monthlyExpenses && financialData.monthlyDebts) {
    confidence += 30;
  } else if (financialData.monthlyExpenses || financialData.monthlyDebts) {
    confidence += 15;
  }

  // Down payment available (20% weight)
  if (financialData.savingsDeposit) {
    confidence += 20;
  }

  // Credit score (10% bonus)
  if (financialData.creditScore) {
    confidence += 10;
  }

  return Math.min(100, confidence);
}

function generateRecommendations(
  financialData: ProspectFinancialData,
  score: 'low' | 'medium' | 'high',
  confidence: number,
): string[] {
  const recommendations: string[] = [];

  if (confidence < 50) {
    recommendations.push('Complete more financial details for more accurate calculations');
  }

  if (score === 'low') {
    recommendations.push('Consider increasing your down payment or reducing existing debts');
    recommendations.push('Focus on improving your credit score before applying for a bond');

    if (financialData.income && financialData.income < 1500000) {
      // Less than R15,000
      recommendations.push(
        'Consider increasing your income through additional work or side hustles',
      );
    }
  }

  if (score === 'medium') {
    recommendations.push(
      "You're in a good position - consider saving more for a larger down payment",
    );
    recommendations.push('Shop around for the best interest rates from different banks');
  }

  if (score === 'high') {
    recommendations.push('Excellent financial position! You qualify for premium properties');
    recommendations.push('Consider pre-approval from multiple banks to compare offers');
  }

  // General recommendations
  if (!financialData.creditScore) {
    recommendations.push('Consider getting a credit score assessment for better rates');
  }

  if ((financialData.savingsDeposit || 0) < 500000) {
    // Less than R5,000
    recommendations.push('Aim to save at least 10% of the property value for down payment');
  }

  return recommendations;
}

// Utility functions for external use
export function getIncomeRangeFromAmount(amount: number): string {
  if (amount < 1500000) return 'under_15k'; // R15k
  if (amount < 2500000) return '15k_25k'; // R25k
  if (amount < 5000000) return '25k_50k'; // R50k
  if (amount < 10000000) return '50k_100k'; // R100k
  return 'over_100k';
}

export function getIncomeAmountFromRange(range: string): number {
  const ranges = {
    under_15k: 1200000, // R12k midpoint
    '15k_25k': 2000000, // R20k midpoint
    '25k_50k': 3750000, // R37.5k midpoint
    '50k_100k': 7500000, // R75k midpoint
    over_100k: 15000000, // R150k midpoint
  };

  return ranges[range as keyof typeof ranges] || 0;
}

export function calculateTotalAcquisitionCosts(propertyValue: number): {
  transferDuty: number;
  bondRegistration: number;
  legalFees: number;
  total: number;
} {
  const transferDuty = calculateTransferDuty(propertyValue);
  const bondRegistration = propertyValue * SA_LENDING_CONSTANTS.BOND_REGISTRATION_COST;
  const legalFees = propertyValue * SA_LENDING_CONSTANTS.LEGAL_FEES_ESTIMATE;

  return {
    transferDuty,
    bondRegistration,
    legalFees,
    total: transferDuty + bondRegistration + legalFees,
  };
}
