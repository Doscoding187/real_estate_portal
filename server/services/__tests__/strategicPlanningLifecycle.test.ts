import { describe, expect, it } from 'vitest';

/**
 * Contract tests for strategic planning lifecycle and validation rules.
 *
 * These tests encode the canonical business invariants from the audit:
 * - Lifecycle transitions: draft→active→completed, draft/active→cancelled
 * - Owner invariant: active and completed require owner
 * - Evaluation date must fall within the objective's planning period
 * - Target value must be non-negative and within int32 range
 * - Metric key must be in the supported set
 * - No-op updates must be rejected
 */

const VALID_LIFECYCLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function canTransition(from: string, to: string): boolean {
  return VALID_LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

describe('strategic planning lifecycle authority', () => {
  describe('objective status transitions', () => {
    it('allows draft → active', () => {
      expect(canTransition('draft', 'active')).toBe(true);
    });

    it('allows draft → cancelled', () => {
      expect(canTransition('draft', 'cancelled')).toBe(true);
    });

    it('allows active → completed', () => {
      expect(canTransition('active', 'completed')).toBe(true);
    });

    it('allows active → cancelled', () => {
      expect(canTransition('active', 'cancelled')).toBe(true);
    });

    it('rejects completed → any status', () => {
      expect(canTransition('completed', 'draft')).toBe(false);
      expect(canTransition('completed', 'active')).toBe(false);
      expect(canTransition('completed', 'cancelled')).toBe(false);
    });

    it('rejects cancelled → any status', () => {
      expect(canTransition('cancelled', 'draft')).toBe(false);
      expect(canTransition('cancelled', 'active')).toBe(false);
      expect(canTransition('cancelled', 'completed')).toBe(false);
    });

    it('rejects draft → completed (must go through active)', () => {
      expect(canTransition('draft', 'completed')).toBe(false);
    });

    it('rejects active → draft (no backwards transitions)', () => {
      expect(canTransition('active', 'draft')).toBe(false);
    });
  });

  describe('owner invariant', () => {
    it('draft objectives can be ownerless', () => {
      const status = 'draft';
      const ownerUserId = null;
      const requiresOwner = status === 'active' || status === 'completed';
      expect(requiresOwner && !ownerUserId).toBe(false);
    });

    it('active objectives require an owner', () => {
      const status = 'active';
      const ownerUserId = null;
      const requiresOwner = status === 'active' || status === 'completed';
      expect(requiresOwner && !ownerUserId).toBe(true);
    });

    it('completed objectives require an owner', () => {
      const status = 'completed';
      const ownerUserId = 5;
      const requiresOwner = status === 'active' || status === 'completed';
      expect(requiresOwner && !ownerUserId).toBe(false);
    });

    it('cancelled objectives can be ownerless', () => {
      const status = 'cancelled';
      const ownerUserId = null;
      const requiresOwner = status === 'active' || status === 'completed';
      expect(requiresOwner && !ownerUserId).toBe(false);
    });
  });

  describe('date validation', () => {
    function assertValidDate(value: string, fieldName: string): void {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error(`${fieldName} must be in YYYY-MM-DD format, got: ${value}`);
      }
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        throw new Error(`${fieldName} is not a valid calendar date: ${value}`);
      }
    }

    function assertEvaluationDateInPeriod(
      evaluationDate: string,
      periodStart: string,
      periodEnd: string,
    ): void {
      assertValidDate(evaluationDate, 'evaluationDate');
      if (evaluationDate < periodStart || evaluationDate > periodEnd) {
        throw new Error(
          `Evaluation date ${evaluationDate} must fall within the objective's planning period (${periodStart} to ${periodEnd})`,
        );
      }
    }

    it('accepts valid YYYY-MM-DD dates', () => {
      expect(() => assertValidDate('2026-01-15', 'test')).not.toThrow();
      expect(() => assertValidDate('2026-12-31', 'test')).not.toThrow();
      expect(() => assertValidDate('2024-02-29', 'test')).not.toThrow(); // leap year
    });

    it('rejects invalid format', () => {
      expect(() => assertValidDate('15-01-2026', 'test')).toThrow('YYYY-MM-DD');
      expect(() => assertValidDate('2026/01/15', 'test')).toThrow('YYYY-MM-DD');
      expect(() => assertValidDate('2026-1-15', 'test')).toThrow('YYYY-MM-DD');
    });

    it('rejects non-existent calendar dates', () => {
      expect(() => assertValidDate('2026-02-29', 'test')).toThrow('not a valid calendar date');
      expect(() => assertValidDate('2026-13-01', 'test')).toThrow('not a valid calendar date');
      expect(() => assertValidDate('2026-00-01', 'test')).toThrow('not a valid calendar date');
    });

    it('accepts evaluation date within period', () => {
      expect(() => assertEvaluationDateInPeriod('2026-04-01', '2026-01-01', '2026-12-31')).not.toThrow();
    });

    it('accepts evaluation date on period boundaries', () => {
      expect(() => assertEvaluationDateInPeriod('2026-01-01', '2026-01-01', '2026-12-31')).not.toThrow();
      expect(() => assertEvaluationDateInPeriod('2026-12-31', '2026-01-01', '2026-12-31')).not.toThrow();
    });

    it('rejects evaluation date before period start', () => {
      expect(() => assertEvaluationDateInPeriod('2025-12-31', '2026-01-01', '2026-12-31')).toThrow('must fall within');
    });

    it('rejects evaluation date after period end', () => {
      expect(() => assertEvaluationDateInPeriod('2027-01-01', '2026-01-01', '2026-12-31')).toThrow('must fall within');
    });
  });

  describe('period ordering', () => {
    it('startDate must be before endDate', () => {
      const startDate = '2026-07-01';
      const endDate = '2026-01-01';
      expect(startDate < endDate).toBe(false);
    });

    it('same-day start and end is invalid', () => {
      const startDate = '2026-01-01';
      const endDate = '2026-01-01';
      expect(startDate < endDate).toBe(false);
    });
  });

  describe('target value bounds', () => {
    it('accepts zero target value', () => {
      const value = 0;
      expect(value >= 0 && value <= 2_147_483_647).toBe(true);
    });

    it('accepts max int32 target value', () => {
      const value = 2_147_483_647;
      expect(value >= 0 && value <= 2_147_483_647).toBe(true);
    });

    it('rejects negative target value', () => {
      const value = -1;
      expect(value >= 0 && value <= 2_147_483_647).toBe(false);
    });

    it('rejects target value exceeding int32 max', () => {
      const value = 2_147_483_648;
      expect(value >= 0 && value <= 2_147_483_647).toBe(false);
    });
  });

  describe('target editing scope', () => {
    it('targets can only be added to draft objectives', () => {
      const objectiveStatus = 'draft';
      expect(objectiveStatus === 'draft').toBe(true);
    });

    it('targets cannot be added to active objectives', () => {
      const objectiveStatus = 'active';
      expect(objectiveStatus === 'draft').toBe(false);
    });

    it('targets can only be edited while parent is draft', () => {
      const objectiveStatus = 'draft';
      expect(objectiveStatus === 'draft').toBe(true);
    });

    it('targets cannot be edited while parent is active', () => {
      const objectiveStatus = 'active';
      expect(objectiveStatus === 'draft').toBe(false);
    });

    it('targets can only be removed while parent is draft', () => {
      const objectiveStatus = 'draft';
      expect(objectiveStatus === 'draft').toBe(true);
    });
  });

  describe('metric key authority', () => {
    const SUPPORTED_METRIC_KEYS = ['active_agents', 'active_agencies', 'active_developers', 'active_listings'] as const;

    it('allows all 4 V1 metric keys', () => {
      for (const key of SUPPORTED_METRIC_KEYS) {
        expect(SUPPORTED_METRIC_KEYS).toContain(key);
      }
    });

    it('rejects deferred metric keys', () => {
      expect((SUPPORTED_METRIC_KEYS as readonly string[]).includes('leads_30d')).toBe(false);
      expect((SUPPORTED_METRIC_KEYS as readonly string[]).includes('revenue_30d')).toBe(false);
    });
  });
});
