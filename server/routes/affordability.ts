import { Router } from 'express';
import { z } from 'zod';
import { calculateAffordabilityCompanion, matchUnitsToAffordability } from '../services/affordabilityCompanion';
import { db } from '../db';
import { units } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Validation schema for affordability calculation
const affordabilityInputSchema = z.object({
  income: z.number().min(0).optional(),
  incomeRange: z.enum(['under_15k', '15k_25k', '25k_50k', '50k_100k', 'over_100k']).optional(),
  combinedIncome: z.number().min(0).optional(),
  monthlyExpenses: z.number().min(0).optional(),
  monthlyDebts: z.number().min(0).optional(),
  dependents: z.number().min(0).optional(),
  savingsDeposit: z.number().min(0).optional(),
  creditScore: z.number().min(300).max(850).optional(),
});

/**
 * POST /api/affordability/calculate
 * Calculate buyer affordability with gamification
 */
router.post('/calculate', async (req, res) => {
  try {
    const financialData = affordabilityInputSchema.parse(req.body);
    
    const result = calculateAffordabilityCompanion(financialData);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid financial data provided',
          details: error.errors,
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    console.error('Affordability calculation error:', error);
    res.status(500).json({
      error: {
        code: 'CALCULATION_ERROR',
        message: 'Failed to calculate affordability',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/affordability/match-units
 * Get units matching buyer's affordability range
 */
router.post('/match-units', async (req, res) => {
  try {
    const schema = z.object({
      developmentId: z.number(),
      affordabilityMax: z.number().min(0),
      monthlyPaymentCapacity: z.number().min(0),
      deposit: z.number().min(0).default(0),
    });
    
    const { developmentId, affordabilityMax, monthlyPaymentCapacity, deposit } = schema.parse(req.body);
    
    // Fetch units for the development
    const developmentUnits = await db
      .select({
        id: units.id,
        price: units.price,
        unitType: units.unitType,
        unitNumber: units.unitNumber,
        bedrooms: units.bedrooms,
        bathrooms: units.bathrooms,
        size: units.size,
        status: units.status,
      })
      .from(units)
      .where(eq(units.developmentId, developmentId));
    
    // Match units to affordability
    const matchedUnits = matchUnitsToAffordability(
      developmentUnits.map(u => ({ id: u.id, price: u.price, unitType: u.unitType })),
      affordabilityMax,
      monthlyPaymentCapacity,
      deposit
    );
    
    // Combine unit details with match results
    const results = developmentUnits.map(unit => {
      const match = matchedUnits.find(m => m.unitId === unit.id);
      return {
        ...unit,
        match: match || null,
      };
    });
    
    // Sort by match level (perfect > good > stretch > out_of_reach)
    const matchOrder = { perfect: 0, good: 1, stretch: 2, out_of_reach: 3 };
    results.sort((a, b) => {
      if (!a.match || !b.match) return 0;
      return matchOrder[a.match.matchLevel] - matchOrder[b.match.matchLevel];
    });
    
    res.json({
      success: true,
      data: {
        units: results,
        summary: {
          total: results.length,
          perfect: results.filter(u => u.match?.matchLevel === 'perfect').length,
          good: results.filter(u => u.match?.matchLevel === 'good').length,
          stretch: results.filter(u => u.match?.matchLevel === 'stretch').length,
          outOfReach: results.filter(u => u.match?.matchLevel === 'out_of_reach').length,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    console.error('Unit matching error:', error);
    res.status(500).json({
      error: {
        code: 'MATCHING_ERROR',
        message: 'Failed to match units',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
