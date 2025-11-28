/**
 * Affordability Companion - Gamified Buyability Calculator
 * 
 * A Zillow-inspired, SA-first affordability tool that guides buyers through
 * their property journey with progressive disclosure and real-time feedback.
 * 
 * Key Features:
 * - Start with ONE question (monthly income)
 * - Gamified accuracy progression
 * - Real-time unit matching
 * - Affordability grades (A-E)
 * - Actionable insights and recommendations
 */

import { calculateBuyability, ProspectFinancialData, BuyabilityResult } from '../_core/buyabilityCalculator';

export interface AffordabilityGrade {
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  label: string;
  color: string;
  description: string;
}

export interface AccuracyBooster {
  id: string;
  title: string;
  description: string;
  accuracyGain: number;
  icon: string;
  completed: boolean;
  priority: number;
}

export interface AffordabilityInsight {
  type: 'positive' | 'warning' | 'tip' | 'action';
  icon: string;
  message: string;
  actionable?: {
    action: string;
    impact: string;
  };
}

export interface UnitMatchResult {
  unitId: number;
  matchLevel: 'perfect' | 'good' | 'stretch' | 'out_of_reach';
  matchPercentage: number;
  monthlyPayment: number;
  downPaymentNeeded: number;
  message: string;
}

export interface CompanionResult extends BuyabilityResult {
  // Gamification
  accuracyScore: number; // 0-100%
  profileCompleteness: number; // 0-100%
  accuracyBoosters: AccuracyBooster[];
  
  // Grading
  affordabilityGrade: AffordabilityGrade;
  
  // Insights
  insights: AffordabilityInsight[];
  
  // Quick wins
  quickWins: string[];
  
  // What-if scenarios
  scenarios: {
    increaseIncome: { amount: number; newMax: number };
    reduceExpenses: { amount: number; newMax: number };
    increaseDeposit: { amount: number; monthlyReduction: number };
  };
}

/**
 * Calculate affordability grade based on score and confidence
 */
function calculateAffordabilityGrade(
  score: 'low' | 'medium' | 'high',
  confidence: number,
  debtToIncomeRatio: number
): AffordabilityGrade {
  // Grade A: High score, high confidence, low DTI
  if (score === 'high' && confidence >= 80 && debtToIncomeRatio < 30) {
    return {
      grade: 'A',
      label: 'Strong',
      color: 'green',
      description: 'Excellent financial position. You qualify for premium properties with favorable terms.',
    };
  }
  
  // Grade B: High score or medium with good metrics
  if (score === 'high' || (score === 'medium' && confidence >= 70 && debtToIncomeRatio < 35)) {
    return {
      grade: 'B',
      label: 'Good',
      color: 'blue',
      description: 'Good financial standing. You qualify for most properties with competitive rates.',
    };
  }
  
  // Grade C: Medium score
  if (score === 'medium' || (score === 'low' && confidence >= 60 && debtToIncomeRatio < 40)) {
    return {
      grade: 'C',
      label: 'Borderline',
      color: 'yellow',
      description: 'Moderate qualification. Consider improving your financial profile for better options.',
    };
  }
  
  // Grade D: Low score but some potential
  if (score === 'low' && confidence >= 40) {
    return {
      grade: 'D',
      label: 'Low',
      color: 'orange',
      description: 'Limited qualification. Focus on reducing debt and increasing savings.',
    };
  }
  
  // Grade E: Very low or insufficient data
  return {
    grade: 'E',
    label: 'Not Qualified',
    color: 'red',
    description: 'Currently not qualified. Work on improving your financial situation before applying.',
  };
}

/**
 * Generate accuracy boosters (gamified steps to improve calculation)
 */
function generateAccuracyBoosters(financialData: ProspectFinancialData): AccuracyBooster[] {
  const boosters: AccuracyBooster[] = [];
  
  // Monthly expenses
  if (!financialData.monthlyExpenses) {
    boosters.push({
      id: 'expenses',
      title: 'Add Monthly Expenses',
      description: 'Include rent, utilities, groceries, and other regular costs',
      accuracyGain: 15,
      icon: '💰',
      completed: false,
      priority: 1,
    });
  }
  
  // Monthly debts
  if (!financialData.monthlyDebts) {
    boosters.push({
      id: 'debts',
      title: 'Add Existing Debts',
      description: 'Car payments, credit cards, personal loans',
      accuracyGain: 15,
      icon: '💳',
      completed: false,
      priority: 2,
    });
  }
  
  // Partner income
  if (!financialData.combinedIncome) {
    boosters.push({
      id: 'partner_income',
      title: 'Add Partner Income',
      description: 'Boost your qualification with joint application',
      accuracyGain: 20,
      icon: '👥',
      completed: false,
      priority: 3,
    });
  }
  
  // Deposit amount
  if (!financialData.savingsDeposit) {
    boosters.push({
      id: 'deposit',
      title: 'Add Deposit Amount',
      description: 'Reduce monthly payments with a larger down payment',
      accuracyGain: 15,
      icon: '🏦',
      completed: false,
      priority: 4,
    });
  }
  
  // Dependents
  if (financialData.dependents === undefined) {
    boosters.push({
      id: 'dependents',
      title: 'Add Dependents',
      description: 'Help us calculate accurate living expenses',
      accuracyGain: 10,
      icon: '👨‍👩‍👧‍👦',
      completed: false,
      priority: 5,
    });
  }
  
  // Credit score
  if (!financialData.creditScore) {
    boosters.push({
      id: 'credit_score',
      title: 'Add Credit Score',
      description: 'Unlock accurate interest rate estimates',
      accuracyGain: 15,
      icon: '📊',
      completed: false,
      priority: 6,
    });
  }
  
  return boosters.sort((a, b) => a.priority - b.priority);
}

/**
 * Generate actionable insights based on financial profile
 */
function generateInsights(
  financialData: ProspectFinancialData,
  result: BuyabilityResult
): AffordabilityInsight[] {
  const insights: AffordabilityInsight[] = [];
  const monthlyIncome = (financialData.income || 0) + (financialData.combinedIncome || 0);
  
  // Positive insights
  if (result.factors.debtToIncomeRatio < 30) {
    insights.push({
      type: 'positive',
      icon: '👍',
      message: 'Your debt-to-income ratio is excellent (under 30%)',
    });
  }
  
  if ((financialData.savingsDeposit || 0) > result.affordabilityMax * 0.15) {
    insights.push({
      type: 'positive',
      icon: '⭐',
      message: 'Your deposit significantly improves your affordability',
    });
  }
  
  // Warnings
  if (result.factors.debtToIncomeRatio > 40) {
    insights.push({
      type: 'warning',
      icon: '👎',
      message: 'Your debt-to-income ratio is high (over 40%)',
      actionable: {
        action: 'Reduce monthly debts by R2,000',
        impact: `Improve affordability by ~R${Math.round((2000 * 12 * 10) / 100)}`,
      },
    });
  }
  
  if ((financialData.savingsDeposit || 0) < result.affordabilityMax * 0.1) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      message: 'Your deposit is below the recommended 10%',
      actionable: {
        action: `Save R${Math.round((result.affordabilityMax * 0.1 - (financialData.savingsDeposit || 0)) / 100)}`,
        impact: 'Qualify for better interest rates',
      },
    });
  }
  
  // Tips
  if (!financialData.combinedIncome && monthlyIncome < 5000000) {
    insights.push({
      type: 'tip',
      icon: '💡',
      message: 'Consider a joint application to increase your buying power',
    });
  }
  
  if (result.confidence < 70) {
    insights.push({
      type: 'tip',
      icon: '🎯',
      message: 'Complete more details to unlock accurate qualification',
    });
  }
  
  // Action items
  if (result.score === 'low') {
    insights.push({
      type: 'action',
      icon: '🚀',
      message: 'Focus on these 3 steps: reduce debt, increase savings, improve credit score',
    });
  }
  
  return insights;
}

/**
 * Generate quick wins - small changes with big impact
 */
function generateQuickWins(
  financialData: ProspectFinancialData,
  result: BuyabilityResult
): string[] {
  const wins: string[] = [];
  const monthlyIncome = (financialData.income || 0) + (financialData.combinedIncome || 0);
  
  // Expense reduction
  if (financialData.monthlyExpenses && financialData.monthlyExpenses > 1500000) {
    const reduction = 120000; // R1,200
    const impact = Math.round((reduction * 12 * 10) / 100);
    wins.push(`Reduce expenses by R1,200/month → Qualify for R${impact} more`);
  }
  
  // Deposit increase
  if (financialData.savingsDeposit) {
    const increase = 1500000; // R15,000
    const monthlyReduction = Math.round((increase * 0.01) / 100);
    wins.push(`Increase deposit by R15,000 → Save R${monthlyReduction}/month on repayments`);
  }
  
  // Partner income
  if (!financialData.combinedIncome) {
    wins.push('Add partner income → Potentially double your buying power');
  }
  
  // Debt reduction
  if (financialData.monthlyDebts && financialData.monthlyDebts > 200000) {
    wins.push('Pay off one credit card → Improve qualification grade');
  }
  
  return wins.slice(0, 3); // Top 3 wins
}

/**
 * Calculate what-if scenarios
 */
function calculateScenarios(
  financialData: ProspectFinancialData,
  currentMax: number
): CompanionResult['scenarios'] {
  // Scenario 1: Increase income by 20%
  const incomeIncrease = ((financialData.income || 0) + (financialData.combinedIncome || 0)) * 0.2;
  const withMoreIncome = calculateBuyability({
    ...financialData,
    income: (financialData.income || 0) + incomeIncrease,
  });
  
  // Scenario 2: Reduce expenses by R2,000
  const expenseReduction = 200000; // R2,000
  const withLessExpenses = calculateBuyability({
    ...financialData,
    monthlyExpenses: Math.max(0, (financialData.monthlyExpenses || 0) - expenseReduction),
  });
  
  // Scenario 3: Increase deposit by R50,000
  const depositIncrease = 5000000; // R50,000
  const withMoreDeposit = calculateBuyability({
    ...financialData,
    savingsDeposit: (financialData.savingsDeposit || 0) + depositIncrease,
  });
  
  return {
    increaseIncome: {
      amount: Math.round(incomeIncrease / 100),
      newMax: withMoreIncome.affordabilityMax,
    },
    reduceExpenses: {
      amount: Math.round(expenseReduction / 100),
      newMax: withLessExpenses.affordabilityMax,
    },
    increaseDeposit: {
      amount: Math.round(depositIncrease / 100),
      monthlyReduction: Math.round((currentMax - withMoreDeposit.affordabilityMax) / 100),
    },
  };
}

/**
 * Main function: Calculate affordability with gamification
 */
export function calculateAffordabilityCompanion(
  financialData: ProspectFinancialData
): CompanionResult {
  // Get base calculation
  const baseResult = calculateBuyability(financialData);
  
  // Calculate accuracy score (0-100%)
  const accuracyScore = baseResult.confidence;
  
  // Calculate profile completeness
  const totalFields = 7; // income, expenses, debts, deposit, dependents, credit, partner
  let completedFields = 0;
  if (financialData.income || financialData.incomeRange) completedFields++;
  if (financialData.monthlyExpenses) completedFields++;
  if (financialData.monthlyDebts) completedFields++;
  if (financialData.savingsDeposit) completedFields++;
  if (financialData.dependents !== undefined) completedFields++;
  if (financialData.creditScore) completedFields++;
  if (financialData.combinedIncome) completedFields++;
  
  const profileCompleteness = Math.round((completedFields / totalFields) * 100);
  
  // Generate gamification elements
  const accuracyBoosters = generateAccuracyBoosters(financialData);
  const affordabilityGrade = calculateAffordabilityGrade(
    baseResult.score,
    baseResult.confidence,
    baseResult.factors.debtToIncomeRatio
  );
  const insights = generateInsights(financialData, baseResult);
  const quickWins = generateQuickWins(financialData, baseResult);
  const scenarios = calculateScenarios(financialData, baseResult.affordabilityMax);
  
  return {
    ...baseResult,
    accuracyScore,
    profileCompleteness,
    accuracyBoosters,
    affordabilityGrade,
    insights,
    quickWins,
    scenarios,
  };
}

/**
 * Match units to buyer's affordability
 */
export function matchUnitsToAffordability(
  units: Array<{ id: number; price: number; unitType: string }>,
  affordabilityMax: number,
  monthlyPaymentCapacity: number,
  deposit: number
): UnitMatchResult[] {
  return units.map(unit => {
    const priceInCents = unit.price * 100; // Convert to cents
    const percentOfMax = (priceInCents / affordabilityMax) * 100;
    
    // Calculate monthly payment for this unit
    const loanAmount = priceInCents - deposit;
    const monthlyRate = (11.75 + 1.5) / 100 / 12; // Prime + margin
    const months = 240; // 20 years
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                          (Math.pow(1 + monthlyRate, months) - 1);
    
    const downPaymentNeeded = Math.max(0, priceInCents * 0.1 - deposit);
    
    // Determine match level
    let matchLevel: UnitMatchResult['matchLevel'];
    let message: string;
    let matchPercentage: number;
    
    if (percentOfMax <= 80) {
      matchLevel = 'perfect';
      message = '✅ You qualify comfortably for this unit';
      matchPercentage = 100;
    } else if (percentOfMax <= 95) {
      matchLevel = 'good';
      message = '✓ You qualify for this unit';
      matchPercentage = 85;
    } else if (percentOfMax <= 110) {
      matchLevel = 'stretch';
      message = '⚠️ This is a stretch - consider increasing your deposit';
      matchPercentage = 60;
    } else {
      matchLevel = 'out_of_reach';
      message = '❌ Currently out of reach - see what you can do to qualify';
      matchPercentage = 30;
    }
    
    return {
      unitId: unit.id,
      matchLevel,
      matchPercentage,
      monthlyPayment: Math.round(monthlyPayment),
      downPaymentNeeded: Math.round(downPaymentNeeded),
      message,
    };
  });
}
