/**
 * Affordability Routes (STUBBED)
 *
 * Disabled: References 'units' table which is not exported from schema.
 * Unit matching functionality is stubbed until table is properly added via migration.
 */

import { Router } from 'express';
import { z } from 'zod';
import { calculateAffordabilityCompanion } from '../services/affordabilityCompanion';

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
 * POST /api/affordability/match-units - STUBBED
 * Units table not available
 */
router.post('/match-units', async (req, res) => {
  console.debug('[affordability] match-units called but disabled (no units table)');
  res.json({
    success: true,
    data: {
      units: [],
      summary: {
        total: 0,
        perfect: 0,
        good: 0,
        stretch: 0,
        outOfReach: 0,
      },
      message: 'Unit matching temporarily disabled',
    },
  });
});

export default router;
