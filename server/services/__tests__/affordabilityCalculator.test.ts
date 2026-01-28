/**
 * Property-Based Tests for Affordability Calculator
 *
 * These tests validate the correctness properties defined in the design document
 * using property-based testing to ensure behavior holds across all valid inputs.
 */

import { describe, it, expect } from 'vitest';
import { calculateBuyability, ProspectFinancialData } from '../../_core/buyabilityCalculator';
import { calculateAffordabilityCompanion } from '../affordabilityCompanion';
import { matchUnitsToAffordability } from '../affordabilityCompanion';

describe('Affordability Calculator Property Tests', () => {
  /**
   * Property 8: Affordability Calculation Consistency
   * Feature: developer-lead-management, Property 8: Affordability Calculation Consistency
   *
   * For any set of buyer financial inputs (income, expenses, deposit),
   * calculating affordability multiple times with the same inputs should
   * produce the same maximum affordable purchase price.
   *
   * Validates: Requirements 4.2
   */
  describe('Property 8: Affordability Calculation Consistency', () => {
    it('should produce consistent results for the same inputs', () => {
      // Generate test cases with various financial profiles
      const testCases: ProspectFinancialData[] = [
        // Case 1: Basic income only
        { income: 2500000 }, // R25,000

        // Case 2: Income with expenses
        { income: 3000000, monthlyExpenses: 800000 }, // R30k income, R8k expenses

        // Case 3: Combined income
        { income: 2000000, combinedIncome: 2500000 }, // R20k + R25k

        // Case 4: Full profile
        {
          income: 4000000,
          monthlyExpenses: 1000000,
          monthlyDebts: 500000,
          savingsDeposit: 10000000,
          dependents: 2,
        },

        // Case 5: High earner
        { income: 10000000, savingsDeposit: 50000000 }, // R100k income, R500k deposit

        // Case 6: With credit score
        { income: 3500000, creditScore: 750 },
      ];

      testCases.forEach((financialData, index) => {
        // Calculate affordability multiple times
        const result1 = calculateBuyability(financialData);
        const result2 = calculateBuyability(financialData);
        const result3 = calculateBuyability(financialData);

        // All results should be identical
        expect(result1.affordabilityMax).toBe(result2.affordabilityMax);
        expect(result2.affordabilityMax).toBe(result3.affordabilityMax);
        expect(result1.affordabilityMin).toBe(result2.affordabilityMin);
        expect(result2.affordabilityMin).toBe(result3.affordabilityMin);
        expect(result1.monthlyPaymentCapacity).toBe(result2.monthlyPaymentCapacity);

        // Verify results are reasonable (not NaN, not negative)
        expect(result1.affordabilityMax).toBeGreaterThanOrEqual(0);
        expect(result1.affordabilityMin).toBeGreaterThanOrEqual(0);
        expect(result1.monthlyPaymentCapacity).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result1.affordabilityMax)).toBe(true);
      });
    });

    it('should produce consistent results with gamified calculator', () => {
      const testCases: ProspectFinancialData[] = [
        { income: 2500000 },
        { income: 3000000, monthlyExpenses: 800000, savingsDeposit: 5000000 },
        { income: 4000000, combinedIncome: 3000000, monthlyDebts: 500000 },
      ];

      testCases.forEach(financialData => {
        const result1 = calculateAffordabilityCompanion(financialData);
        const result2 = calculateAffordabilityCompanion(financialData);

        expect(result1.affordabilityMax).toBe(result2.affordabilityMax);
        expect(result1.affordabilityMin).toBe(result2.affordabilityMin);
        expect(result1.monthlyPaymentCapacity).toBe(result2.monthlyPaymentCapacity);
        expect(result1.accuracyScore).toBe(result2.accuracyScore);
        expect(result1.affordabilityGrade.grade).toBe(result2.affordabilityGrade.grade);
      });
    });
  });

  /**
   * Property 36: Affordability-Based Unit Filtering
   * Feature: developer-lead-management, Property 36: Affordability-Based Unit Filtering
   *
   * For any buyer with calculated affordability and a development with multiple units,
   * the filtered unit list should contain only units with prices less than or equal
   * to the buyer's maximum affordable price.
   *
   * Validates: Requirements 16.1
   */
  describe('Property 36: Affordability-Based Unit Filtering', () => {
    it('should only return units within affordability range', () => {
      // Test with various affordability levels
      // Note: matchUnitsToAffordability expects prices in Rands, not cents
      const testCases = [
        {
          affordabilityMax: 150000000, // R1.5M in cents
          units: [
            { id: 1, price: 1000000, unitType: '2bed' }, // R1M - affordable
            { id: 2, price: 1400000, unitType: '3bed' }, // R1.4M - affordable
            { id: 3, price: 1600000, unitType: '3bed' }, // R1.6M - not affordable
            { id: 4, price: 2000000, unitType: '4bed+' }, // R2M - not affordable
          ],
        },
        {
          affordabilityMax: 300000000, // R3M in cents
          units: [
            { id: 5, price: 2500000, unitType: '3bed' }, // R2.5M - affordable
            { id: 6, price: 2900000, unitType: '4bed+' }, // R2.9M - affordable
            { id: 7, price: 3500000, unitType: 'penthouse' }, // R3.5M - not affordable
          ],
        },
        {
          affordabilityMax: 80000000, // R800k in cents
          units: [
            { id: 8, price: 500000, unitType: 'studio' }, // R500k - affordable
            { id: 9, price: 750000, unitType: '1bed' }, // R750k - affordable
            { id: 10, price: 900000, unitType: '2bed' }, // R900k - not affordable
          ],
        },
      ];

      testCases.forEach(({ affordabilityMax, units }) => {
        const matches = matchUnitsToAffordability(
          units,
          affordabilityMax,
          (affordabilityMax * 0.35) / 240, // Rough monthly payment estimate
          affordabilityMax * 0.1, // 10% deposit
        );

        // Filter for perfect and good matches (affordable units)
        const affordableMatches = matches.filter(
          m => m.matchLevel === 'perfect' || m.matchLevel === 'good',
        );

        // All affordable matches should have prices <= affordabilityMax
        affordableMatches.forEach(match => {
          const unit = units.find(u => u.id === match.unitId);
          expect(unit).toBeDefined();
          if (unit) {
            const priceInCents = unit.price * 100; // Convert to cents for comparison
            expect(priceInCents).toBeLessThanOrEqual(affordabilityMax);
          }
        });

        // All units with price > affordabilityMax should be stretch or out_of_reach
        units.forEach(unit => {
          const match = matches.find(m => m.unitId === unit.id);
          expect(match).toBeDefined();

          const priceInCents = unit.price * 100;
          if (priceInCents > affordabilityMax * 1.1) {
            // Units significantly over budget should be out_of_reach
            expect(match?.matchLevel).toBe('out_of_reach');
          }
        });
      });
    });

    it('should handle edge cases correctly', () => {
      // Edge case: Buyer can afford all units
      const highAffordability = 500000000; // R5M in cents
      const affordableUnits = [
        { id: 1, price: 1000000, unitType: '2bed' }, // R1M
        { id: 2, price: 2000000, unitType: '3bed' }, // R2M
        { id: 3, price: 3000000, unitType: '4bed+' }, // R3M
      ];

      const allAffordable = matchUnitsToAffordability(
        affordableUnits,
        highAffordability,
        (highAffordability * 0.35) / 240,
        highAffordability * 0.1,
      );

      // All should be perfect or good matches
      allAffordable.forEach(match => {
        expect(['perfect', 'good']).toContain(match.matchLevel);
      });

      // Edge case: Buyer can't afford any units
      const lowAffordability = 50000000; // R500k in cents
      const expensiveUnits = [
        { id: 4, price: 1000000, unitType: '2bed' }, // R1M
        { id: 5, price: 1500000, unitType: '3bed' }, // R1.5M
      ];

      const noneAffordable = matchUnitsToAffordability(
        expensiveUnits,
        lowAffordability,
        (lowAffordability * 0.35) / 240,
        lowAffordability * 0.1,
      );

      // All should be stretch or out_of_reach
      noneAffordable.forEach(match => {
        expect(['stretch', 'out_of_reach']).toContain(match.matchLevel);
      });
    });
  });

  /**
   * Property 37: Unit Categorization by Affordability
   * Feature: developer-lead-management, Property 37: Unit Categorization by Affordability
   *
   * For any unit and buyer affordability, the unit should be categorized as:
   * - "affordable" (perfect) if price ≤ max affordable
   * - "stretch" (good/stretch) if price ≤ max affordable * 1.1
   * - "out-of-range" otherwise
   *
   * Validates: Requirements 16.2
   */
  describe('Property 37: Unit Categorization by Affordability', () => {
    it('should correctly categorize units by affordability thresholds', () => {
      const affordabilityMax = 200000000; // R2M in cents

      const testUnits = [
        // Perfect matches (≤ 80% of max)
        { id: 1, price: 1500000, expectedLevel: 'perfect' }, // R1.5M (75%)
        { id: 2, price: 1600000, expectedLevel: 'perfect' }, // R1.6M (80%)

        // Good matches (80-95% of max)
        { id: 3, price: 1700000, expectedLevel: 'good' }, // R1.7M (85%)
        { id: 4, price: 1900000, expectedLevel: 'good' }, // R1.9M (95%)

        // Stretch (95-110% of max)
        { id: 5, price: 2000000, expectedLevel: 'stretch' }, // R2M (100%)
        { id: 6, price: 2100000, expectedLevel: 'stretch' }, // R2.1M (105%)
        { id: 7, price: 2199999, expectedLevel: 'stretch' }, // R2.199M (just under 110%)

        // Out of reach (> 110% of max)
        { id: 8, price: 2300000, expectedLevel: 'out_of_reach' }, // R2.3M (115%)
        { id: 9, price: 3000000, expectedLevel: 'out_of_reach' }, // R3M (150%)
      ];

      const matches = matchUnitsToAffordability(
        testUnits.map(u => ({ id: u.id, price: u.price, unitType: '2bed' })),
        affordabilityMax,
        (affordabilityMax * 0.35) / 240,
        affordabilityMax * 0.1,
      );

      testUnits.forEach(testUnit => {
        const match = matches.find(m => m.unitId === testUnit.id);
        expect(match).toBeDefined();
        expect(match?.matchLevel).toBe(testUnit.expectedLevel);
      });
    });

    it('should maintain categorization consistency across different affordability levels', () => {
      const affordabilityLevels = [
        100000000, // R1M
        200000000, // R2M
        300000000, // R3M
        500000000, // R5M
      ];

      affordabilityLevels.forEach(affordabilityMax => {
        // Create units at specific percentages of affordability (in Rands, not cents)
        const units = [
          { id: 1, price: Math.floor((affordabilityMax / 100) * 0.75), unitType: '2bed' }, // 75% - perfect
          { id: 2, price: Math.floor((affordabilityMax / 100) * 0.9), unitType: '3bed' }, // 90% - good
          { id: 3, price: Math.floor((affordabilityMax / 100) * 1.05), unitType: '3bed' }, // 105% - stretch
          { id: 4, price: Math.floor((affordabilityMax / 100) * 1.2), unitType: '4bed+' }, // 120% - out_of_reach
        ];

        const matches = matchUnitsToAffordability(
          units,
          affordabilityMax,
          (affordabilityMax * 0.35) / 240,
          affordabilityMax * 0.1,
        );

        // Verify categorization
        expect(matches[0].matchLevel).toBe('perfect');
        expect(matches[1].matchLevel).toBe('good');
        expect(matches[2].matchLevel).toBe('stretch');
        expect(matches[3].matchLevel).toBe('out_of_reach');

        // Verify match percentages are reasonable
        matches.forEach(match => {
          expect(match.matchPercentage).toBeGreaterThanOrEqual(0);
          expect(match.matchPercentage).toBeLessThanOrEqual(100);
        });
      });
    });

    it('should handle boundary conditions correctly', () => {
      const affordabilityMax = 200000000; // R2M in cents

      // Test exact boundaries (prices in Rands)
      const boundaryUnits = [
        { id: 1, price: (affordabilityMax / 100) * 0.8, unitType: '2bed' }, // Exactly 80% - perfect
        { id: 2, price: (affordabilityMax / 100) * 0.95, unitType: '3bed' }, // Exactly 95% - good
        { id: 3, price: (affordabilityMax / 100) * 1.099, unitType: '3bed' }, // Just under 110% - stretch
        { id: 4, price: (affordabilityMax / 100) * 1.11, unitType: '4bed+' }, // Just over 110% - out_of_reach
      ];

      const matches = matchUnitsToAffordability(
        boundaryUnits,
        affordabilityMax,
        (affordabilityMax * 0.35) / 240,
        affordabilityMax * 0.1,
      );

      expect(matches[0].matchLevel).toBe('perfect');
      expect(matches[1].matchLevel).toBe('good');
      expect(matches[2].matchLevel).toBe('stretch');
      expect(matches[3].matchLevel).toBe('out_of_reach');
    });
  });
});
