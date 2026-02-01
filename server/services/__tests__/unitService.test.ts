/**
 * Property-Based Tests for Unit Service
 * Feature: developer-lead-management
 */

import { describe, expect, beforeEach, afterEach } from 'vitest';
import { it, fc } from '@fast-check/vitest';
import { unitService } from '../unitService';
import { db } from '../../db';
import { developers, developments, units } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe.skip('Unit Service - Property Tests', () => {
  // Helper function to create a test developer
  async function createTestDeveloper(userId: number) {
    const [developer] = await db
      .insert(developers)
      .values({
        userId,
        name: `Test Developer ${userId}`,
        email: `test${userId}@example.com`,
        category: 'residential',
        isVerified: 1,
        status: 'approved',
      })
      .returning();
    return developer;
  }

  // Helper function to create a test development
  async function createTestDevelopment(developerId: number) {
    const [development] = await db
      .insert(developments)
      .values({
        developerId,
        name: 'Test Development',
        developmentType: 'residential',
        city: 'Test City',
        province: 'Test Province',
        status: 'under_construction',
      })
      .returning();
    return development;
  }

  // Helper function to cleanup test data
  async function cleanupTestData(developerId: number) {
    // Delete in correct order due to foreign keys
    const devs = await db
      .select()
      .from(developments)
      .where(eq(developments.developerId, developerId));
    for (const dev of devs) {
      await db.delete(units).where(eq(units.developmentId, dev.id));
    }
    await db.delete(developments).where(eq(developments.developerId, developerId));
    await db.delete(developers).where(eq(developers.id, developerId));
  }

  /**
   * Property 5: Unit Status Transitions Are Valid
   * Feature: developer-lead-management, Property 5
   * Validates: Requirements 3.2
   *
   * For any unit status update, the new status should be one of the three valid values
   * (available, reserved, sold), and invalid status values should be rejected.
   */
  it.prop([fc.integer({ min: 1, max: 10000 }), fc.constantFrom('available', 'reserved', 'sold')])(
    'Property 5: Unit status transitions are valid',
    async (userId, newStatus) => {
      let developerId: number | null = null;

      try {
        // Create test developer and development
        const developer = await createTestDeveloper(userId);
        developerId = developer.id;
        const development = await createTestDevelopment(developer.id);

        // Create unit
        const unit = await unitService.createUnit(developer.id, {
          developmentId: development.id,
          unitNumber: 'A101',
          unitType: '2bed',
          price: 1500000,
        });

        // Update unit status
        const updatedUnit = await unitService.updateUnitStatus(unit.id, developer.id, newStatus);

        // Property: Status should be one of the valid values
        const validStatuses = ['available', 'reserved', 'sold'];
        expect(validStatuses).toContain(updatedUnit.status);

        // Property: Status should match the requested status
        expect(updatedUnit.status).toBe(newStatus);

        // Property: Other unit properties should remain unchanged
        expect(updatedUnit.unitNumber).toBe(unit.unitNumber);
        expect(updatedUnit.price).toBe(unit.price);
        expect(updatedUnit.unitType).toBe(unit.unitType);
      } finally {
        // Cleanup
        if (developerId) {
          await cleanupTestData(developerId);
        }
      }
    },
  );

  /**
   * Property 6: Concurrent Reservation Prevention
   * Feature: developer-lead-management, Property 6
   * Validates: Requirements 3.3
   *
   * For any unit, if two buyers attempt to reserve the same unit simultaneously,
   * only one reservation should succeed and the other should receive a conflict error.
   */
  it.prop([fc.integer({ min: 1, max: 10000 })])(
    'Property 6: Concurrent reservation prevention',
    async userId => {
      let developerId: number | null = null;

      try {
        // Create test developer and development
        const developer = await createTestDeveloper(userId);
        developerId = developer.id;
        const development = await createTestDevelopment(developer.id);

        // Create unit
        const unit = await unitService.createUnit(developer.id, {
          developmentId: development.id,
          unitNumber: 'A101',
          unitType: '2bed',
          price: 1500000,
        });

        // First reservation should succeed
        const firstReservation = await unitService.updateUnitStatus(
          unit.id,
          developer.id,
          'reserved',
          1001, // leadId
        );

        expect(firstReservation.status).toBe('reserved');
        expect(firstReservation.reservedBy).toBe(1001);

        // Second reservation attempt should fail
        try {
          await unitService.updateUnitStatus(
            unit.id,
            developer.id,
            'reserved',
            1002, // different leadId
          );
          // If we get here, the test should fail
          expect(true).toBe(false); // Force failure
        } catch (error: any) {
          // Property: Second reservation should be rejected with appropriate error
          expect(error.message).toContain('no longer available');
        }

        // Verify unit is still reserved by first buyer
        const units = await unitService.getDevelopmentUnits(development.id, {});
        const reservedUnit = units.find(u => u.id === unit.id);
        expect(reservedUnit?.status).toBe('reserved');
        expect(reservedUnit?.reservedBy).toBe(1001);
      } finally {
        // Cleanup
        if (developerId) {
          await cleanupTestData(developerId);
        }
      }
    },
  );

  /**
   * Property 7: Inventory Grid Completeness
   * Feature: developer-lead-management, Property 7
   * Validates: Requirements 3.4
   *
   * For any development, the inventory dashboard grid should contain all units
   * belonging to that development with their current status accurately reflected.
   */
  it.prop([
    fc.integer({ min: 1, max: 10000 }),
    fc.integer({ min: 1, max: 20 }), // Number of units to create
  ])('Property 7: Inventory grid completeness', async (userId, unitCount) => {
    let developerId: number | null = null;

    try {
      // Create test developer and development
      const developer = await createTestDeveloper(userId);
      developerId = developer.id;
      const development = await createTestDevelopment(developer.id);

      // Create multiple units
      const createdUnits = [];
      for (let i = 0; i < unitCount; i++) {
        const unit = await unitService.createUnit(developer.id, {
          developmentId: development.id,
          unitNumber: `A${100 + i}`,
          unitType: i % 2 === 0 ? '2bed' : '3bed',
          price: 1500000 + i * 100000,
        });
        createdUnits.push(unit);
      }

      // Get inventory grid
      const inventoryUnits = await unitService.getDevelopmentUnits(development.id, {});

      // Property: All created units should be in the inventory
      expect(inventoryUnits.length).toBe(unitCount);

      // Property: Each created unit should be present
      createdUnits.forEach(createdUnit => {
        const foundUnit = inventoryUnits.find(u => u.id === createdUnit.id);
        expect(foundUnit).toBeDefined();
        expect(foundUnit?.unitNumber).toBe(createdUnit.unitNumber);
        expect(foundUnit?.status).toBe(createdUnit.status);
      });

      // Property: No extra units should be present
      inventoryUnits.forEach(inventoryUnit => {
        const foundUnit = createdUnits.find(u => u.id === inventoryUnit.id);
        expect(foundUnit).toBeDefined();
      });

      // Update some unit statuses
      if (unitCount >= 3) {
        await unitService.updateUnitStatus(createdUnits[0].id, developer.id, 'reserved');
        await unitService.updateUnitStatus(createdUnits[1].id, developer.id, 'sold');
      }

      // Get updated inventory
      const updatedInventory = await unitService.getDevelopmentUnits(development.id, {});

      // Property: Status updates should be reflected accurately
      if (unitCount >= 3) {
        const reservedUnit = updatedInventory.find(u => u.id === createdUnits[0].id);
        const soldUnit = updatedInventory.find(u => u.id === createdUnits[1].id);
        expect(reservedUnit?.status).toBe('reserved');
        expect(soldUnit?.status).toBe('sold');
      }
    } finally {
      // Cleanup
      if (developerId) {
        await cleanupTestData(developerId);
      }
    }
  });

  /**
   * Property 34: Phase-Unit Association Integrity
   * Feature: developer-lead-management, Property 34
   * Validates: Requirements 15.2
   *
   * For any unit assigned to a specific phase, querying units by phase should include
   * that unit, and the unit should not appear in queries for other phases.
   */
  it.prop([
    fc.integer({ min: 1, max: 10000 }),
    fc.integer({ min: 1, max: 5 }), // phaseId
  ])('Property 34: Phase-unit association integrity', async (userId, phaseId) => {
    let developerId: number | null = null;

    try {
      // Create test developer and development
      const developer = await createTestDeveloper(userId);
      developerId = developer.id;
      const development = await createTestDevelopment(developer.id);

      // Create unit assigned to specific phase
      const unit = await unitService.createUnit(developer.id, {
        developmentId: development.id,
        phaseId,
        unitNumber: 'A101',
        unitType: '2bed',
        price: 1500000,
      });

      // Query units by phase
      const phaseUnits = await unitService.getDevelopmentUnits(development.id, {
        phaseId,
      });

      // Property: Unit should be in the phase query results
      const foundUnit = phaseUnits.find(u => u.id === unit.id);
      expect(foundUnit).toBeDefined();
      expect(foundUnit?.phaseId).toBe(phaseId);

      // Create unit in different phase
      const otherPhaseId = phaseId + 1;
      const otherUnit = await unitService.createUnit(developer.id, {
        developmentId: development.id,
        phaseId: otherPhaseId,
        unitNumber: 'B101',
        unitType: '3bed',
        price: 2000000,
      });

      // Query units by original phase
      const originalPhaseUnits = await unitService.getDevelopmentUnits(development.id, {
        phaseId,
      });

      // Property: Unit from other phase should NOT be in original phase query
      const shouldNotFind = originalPhaseUnits.find(u => u.id === otherUnit.id);
      expect(shouldNotFind).toBeUndefined();

      // Property: Original unit should still be in original phase query
      const shouldFind = originalPhaseUnits.find(u => u.id === unit.id);
      expect(shouldFind).toBeDefined();
    } finally {
      // Cleanup
      if (developerId) {
        await cleanupTestData(developerId);
      }
    }
  });

  /**
   * Additional test: Availability summary accuracy
   * Validates: Requirements 3.4, 3.5
   */
  it.prop([
    fc.integer({ min: 1, max: 10000 }),
    fc.integer({ min: 3, max: 15 }), // Number of units
  ])('Availability summary accurately reflects unit statuses', async (userId, unitCount) => {
    let developerId: number | null = null;

    try {
      // Create test developer and development
      const developer = await createTestDeveloper(userId);
      developerId = developer.id;
      const development = await createTestDevelopment(developer.id);

      // Create units with different statuses
      const availableCount = Math.floor(unitCount / 3);
      const reservedCount = Math.floor(unitCount / 3);
      const soldCount = unitCount - availableCount - reservedCount;

      for (let i = 0; i < availableCount; i++) {
        await unitService.createUnit(developer.id, {
          developmentId: development.id,
          unitNumber: `A${100 + i}`,
          unitType: '2bed',
          price: 1500000,
        });
      }

      for (let i = 0; i < reservedCount; i++) {
        const unit = await unitService.createUnit(developer.id, {
          developmentId: development.id,
          unitNumber: `B${100 + i}`,
          unitType: '2bed',
          price: 1500000,
        });
        await unitService.updateUnitStatus(unit.id, developer.id, 'reserved');
      }

      for (let i = 0; i < soldCount; i++) {
        const unit = await unitService.createUnit(developer.id, {
          developmentId: development.id,
          unitNumber: `C${100 + i}`,
          unitType: '2bed',
          price: 1500000,
        });
        await unitService.updateUnitStatus(unit.id, developer.id, 'sold');
      }

      // Get availability summary
      const summary = await unitService.getAvailabilitySummary(development.id);

      // Property: Summary should accurately reflect counts
      expect(summary.total).toBe(unitCount);
      expect(summary.available).toBe(availableCount);
      expect(summary.reserved).toBe(reservedCount);
      expect(summary.sold).toBe(soldCount);

      // Property: Counts should add up to total
      expect(summary.available + summary.reserved + summary.sold).toBe(summary.total);
    } finally {
      // Cleanup
      if (developerId) {
        await cleanupTestData(developerId);
      }
    }
  });
});
