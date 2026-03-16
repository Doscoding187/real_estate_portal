import { describe, expect, it } from 'vitest';
import {
  computeQuickQualification,
  deriveConfidenceLevel,
  matchDevelopments,
  type DevelopmentCandidate,
} from '../referralQualificationService';
import { AFFORDABILITY_DEFAULT_CONFIG } from '../affordabilityConfigService';

describe('referralQualificationService', () => {
  it('computes a stable quick qualification range with confidence breakdown', () => {
    const result = computeQuickQualification({
      mode: 'quick_qual',
      grossMonthlyIncome: 52000,
      preferredAreas: ['Sandton', 'Midrand'],
      monthlyDebts: 6500,
      monthlyExpenses: 17000,
      dependents: 2,
      depositAmount: 180000,
      employmentType: 'salaried',
      docsUploaded: 0,
    });

    expect(result.affordabilityMax).toBeGreaterThan(0);
    expect(result.affordabilityMin).toBeGreaterThan(0);
    expect(result.affordabilityMax).toBeGreaterThan(result.affordabilityMin);
    expect(result.monthlyPaymentEstimate).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
    expect(result.confidenceLevel).toBe('high');
    expect(result.confidenceHint.length).toBeGreaterThan(10);
    expect(result.confidenceFactors.incomeProvided).toBe(true);
    expect(result.readinessStatus).toBe('quick_estimate');
  });

  it('keeps default affordability behavior stable when config is omitted', () => {
    const input = {
      mode: 'quick_qual' as const,
      grossMonthlyIncome: 48000,
      preferredAreas: ['Centurion'],
      monthlyDebts: 6000,
      monthlyExpenses: 15000,
      dependents: 1,
      depositAmount: 120000,
      employmentType: 'salaried',
      docsUploaded: 0,
    };

    const implicitDefaults = computeQuickQualification(input);
    const explicitDefaults = computeQuickQualification(input, AFFORDABILITY_DEFAULT_CONFIG);

    expect(implicitDefaults.affordabilityMin).toBe(explicitDefaults.affordabilityMin);
    expect(implicitDefaults.affordabilityMax).toBe(explicitDefaults.affordabilityMax);
    expect(implicitDefaults.monthlyPaymentEstimate).toBe(explicitDefaults.monthlyPaymentEstimate);
    expect(implicitDefaults.confidenceScore).toBe(explicitDefaults.confidenceScore);
    expect(implicitDefaults.readinessStatus).toBe(explicitDefaults.readinessStatus);
  });

  it('pushes readiness to verified_estimate when verified mode has sufficient docs', () => {
    const result = computeQuickQualification({
      mode: 'verified_qual',
      grossMonthlyIncome: 62000,
      preferredAreas: ['Pretoria East'],
      monthlyDebts: 4500,
      monthlyExpenses: 13000,
      docsUploaded: 4,
    });

    expect(result.readinessStatus).toBe('verified_estimate');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(55);
  });

  it('derives confidence level boundaries consistently', () => {
    expect(deriveConfidenceLevel(39)).toBe('low');
    expect(deriveConfidenceLevel(40)).toBe('medium');
    expect(deriveConfidenceLevel(69)).toBe('medium');
    expect(deriveConfidenceLevel(70)).toBe('high');
    expect(deriveConfidenceLevel(89)).toBe('high');
    expect(deriveConfidenceLevel(90)).toBe('verified');
  });

  it('ranks preferred-area development matches ahead of fallback candidates', () => {
    const developments: DevelopmentCandidate[] = [
      {
        programId: 101,
        developmentId: 11,
        developmentName: 'Sandton Gate',
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        priceFrom: 1180000,
        priceTo: 1650000,
        unitTypes: [
          { name: '2 Bed Classic', bedrooms: 2, priceFrom: 1180000, priceTo: 1280000 },
          { name: '3 Bed Deluxe', bedrooms: 3, priceFrom: 1450000, priceTo: 1650000 },
        ],
      },
      {
        programId: 102,
        developmentId: 12,
        developmentName: 'Cape Urban Edge',
        suburb: 'Woodstock',
        city: 'Cape Town',
        province: 'Western Cape',
        priceFrom: 980000,
        priceTo: 1320000,
        unitTypes: [{ name: '1 Bed', bedrooms: 1, priceFrom: 980000, priceTo: 1080000 }],
      },
      {
        programId: 103,
        developmentId: 13,
        developmentName: 'Midrand Heights',
        suburb: 'Midrand',
        city: 'Johannesburg',
        province: 'Gauteng',
        priceFrom: 1350000,
        priceTo: 1750000,
        unitTypes: [{ name: '3 Bed', bedrooms: 3, priceFrom: 1350000, priceTo: 1520000 }],
      },
      {
        programId: 104,
        developmentId: 14,
        developmentName: 'Randburg Commons',
        suburb: 'Randburg',
        city: 'Johannesburg',
        province: 'Gauteng',
        priceFrom: 1100000,
        priceTo: 1480000,
        unitTypes: [{ name: '2 Bed', bedrooms: 2, priceFrom: 1100000, priceTo: 1260000 }],
      },
    ];

    const matches = matchDevelopments({
      affordabilityMin: 1000000,
      affordabilityMax: 1500000,
      preferredAreas: ['Sandton', 'Midrand'],
      developments,
      mode: 'quick_qual',
    });

    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches[0].matchBucket).toBe('preferred_area');
    expect(matches[0].developmentName).not.toBe('Cape Urban Edge');
    const firstNearbyIndex = matches.findIndex(match => match.matchBucket === 'nearby_area');
    const firstOtherIndex = matches.findIndex(match => match.matchBucket === 'other_area');
    expect(firstNearbyIndex).toBeGreaterThanOrEqual(0);
    expect(firstOtherIndex).toBeGreaterThanOrEqual(0);
    expect(firstNearbyIndex).toBeLessThan(firstOtherIndex);
    expect(matches[firstNearbyIndex].matchReasons.join(' ')).toContain('nearby area');
    expect(matches[0].matchReasons.join(' ')).toContain('preferred area');
  });
});
