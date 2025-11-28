import { db } from '../db';
import { developmentUnits, developments } from '../../drizzle/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { 
  DevelopmentUnit, 
  CreateUnitInput, 
  UpdateUnitInput,
  BulkCreateUnitsInput,
  UnitStatus 
} from '../../shared/types';

export class UnitService {
  /**
   * Create a single unit
   * Validates: Requirements 3.1
   */
  async createUnit(developerId: number, input: CreateUnitInput): Promise<DevelopmentUnit> {
    // Verify ownership of development
    const development = await db.query.developments.findFirst({
      where: eq(developments.id, input.developmentId),
    });

    if (!development) {
      throw new Error('Development not found');
    }
    if (development.developerId !== developerId) {
      throw new Error('Unauthorized: You do not own this development');
    }

    // Check for duplicate unit number in this development
    const existing = await db.query.developmentUnits.findFirst({
      where: and(
        eq(developmentUnits.developmentId, input.developmentId),
        eq(developmentUnits.unitNumber, input.unitNumber)
      ),
    });

    if (existing) {
      throw new Error(`Unit number ${input.unitNumber} already exists in this development`);
    }

    // Create unit
    const [unit] = await db.insert(developmentUnits).values({
      developmentId: input.developmentId,
      phaseId: input.phaseId || null,
      unitNumber: input.unitNumber,
      unitType: input.unitType,
      bedrooms: input.bedrooms || null,
      bathrooms: input.bathrooms ? input.bathrooms.toString() : null,
      size: input.size ? input.size.toString() : null,
      price: input.price.toString(),
      floorPlan: input.floorPlan || null,
      floor: input.floor || null,
      facing: input.facing || null,
      features: input.features ? JSON.stringify(input.features) : null,
      status: 'available',
    }).returning();

    return unit;
  }

  /**
   * Bulk create units
   * Validates: Requirements 3.1
   */
  async bulkCreateUnits(developerId: number, input: BulkCreateUnitsInput): Promise<DevelopmentUnit[]> {
    // Verify ownership
    const development = await db.query.developments.findFirst({
      where: eq(developments.id, input.developmentId),
    });

    if (!development) {
      throw new Error('Development not found');
    }
    if (development.developerId !== developerId) {
      throw new Error('Unauthorized: You do not own this development');
    }

    // Prepare bulk insert data
    const unitsData = input.units.map(unit => ({
      developmentId: input.developmentId,
      phaseId: input.phaseId || null,
      unitNumber: unit.unitNumber,
      unitType: unit.unitType,
      bedrooms: unit.bedrooms || null,
      bathrooms: unit.bathrooms ? unit.bathrooms.toString() : null,
      size: unit.size ? unit.size.toString() : null,
      price: unit.price.toString(),
      floorPlan: unit.floorPlan || null,
      floor: unit.floor || null,
      facing: unit.facing || null,
      features: unit.features ? JSON.stringify(unit.features) : null,
      status: 'available' as const,
    }));

    // Bulk insert
    const createdUnits = await db.insert(developmentUnits).values(unitsData).returning();

    return createdUnits;
  }

  /**
   * Get unit by ID
   */
  async getUnit(unitId: number): Promise<DevelopmentUnit | null> {
    const unit = await db.query.developmentUnits.findFirst({
      where: eq(developmentUnits.id, unitId),
    });

    return unit || null;
  }

  /**
   * Get all units for a development
   * Validates: Requirements 3.4
   */
  async getDevelopmentUnits(developmentId: number, filters?: {
    phaseId?: number;
    status?: UnitStatus;
    unitType?: string;
  }): Promise<DevelopmentUnit[]> {
    const conditions = [eq(developmentUnits.developmentId, developmentId)];

    if (filters?.phaseId) {
      conditions.push(eq(developmentUnits.phaseId, filters.phaseId));
    }
    if (filters?.status) {
      conditions.push(eq(developmentUnits.status, filters.status));
    }
    if (filters?.unitType) {
      conditions.push(eq(developmentUnits.unitType, filters.unitType as any));
    }

    const units = await db.query.developmentUnits.findMany({
      where: and(...conditions),
      orderBy: [developmentUnits.unitNumber],
    });

    return units;
  }

  /**
   * Update unit
   * Validates: Requirements 3.1, 3.2
   */
  async updateUnit(
    unitId: number,
    developerId: number,
    input: UpdateUnitInput
  ): Promise<DevelopmentUnit> {
    // Get unit and verify ownership
    const unit = await this.getUnit(unitId);
    if (!unit) {
      throw new Error('Unit not found');
    }

    const development = await db.query.developments.findFirst({
      where: eq(developments.id, unit.developmentId),
    });

    if (!development || development.developerId !== developerId) {
      throw new Error('Unauthorized: You do not own this development');
    }

    // Prepare update data
    const updateData: any = {
      ...input,
      updatedAt: new Date().toISOString(),
    };

    // Convert arrays to JSON
    if (input.features) {
      updateData.features = JSON.stringify(input.features);
    }

    // Convert numbers to strings for decimal fields
    if (input.bathrooms !== undefined) {
      updateData.bathrooms = input.bathrooms?.toString();
    }
    if (input.size !== undefined) {
      updateData.size = input.size?.toString();
    }
    if (input.price !== undefined) {
      updateData.price = input.price.toString();
    }

    // Update unit
    const [updated] = await db.update(developmentUnits)
      .set(updateData)
      .where(eq(developmentUnits.id, unitId))
      .returning();

    return updated;
  }

  /**
   * Update unit status with concurrent reservation prevention
   * Validates: Requirements 3.2, 3.3
   */
  async updateUnitStatus(
    unitId: number,
    developerId: number,
    newStatus: UnitStatus,
    reservedBy?: number
  ): Promise<DevelopmentUnit> {
    // Get unit and verify ownership
    const unit = await this.getUnit(unitId);
    if (!unit) {
      throw new Error('Unit not found');
    }

    const development = await db.query.developments.findFirst({
      where: eq(developments.id, unit.developmentId),
    });

    if (!development || development.developerId !== developerId) {
      throw new Error('Unauthorized: You do not own this development');
    }

    // Validate status transition
    const validStatuses: UnitStatus[] = ['available', 'reserved', 'sold'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    // Prevent concurrent reservations using optimistic locking
    if (newStatus === 'reserved') {
      // Check if unit is still available
      const currentUnit = await this.getUnit(unitId);
      if (currentUnit?.status !== 'available') {
        throw new Error('Unit is no longer available for reservation');
      }

      // Update with WHERE clause to ensure status hasn't changed
      const result = await db.update(developmentUnits)
        .set({
          status: 'reserved',
          reservedAt: new Date().toISOString(),
          reservedBy: reservedBy || null,
          updatedAt: new Date().toISOString(),
        })
        .where(and(
          eq(developmentUnits.id, unitId),
          eq(developmentUnits.status, 'available') // Optimistic lock
        ))
        .returning();

      if (result.length === 0) {
        throw new Error('Unit was reserved by another user. Please try a different unit.');
      }

      return result[0];
    }

    // Handle other status transitions
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === 'sold') {
      updateData.soldAt = new Date().toISOString();
    } else if (newStatus === 'available') {
      // Clear reservation data when making available again
      updateData.reservedAt = null;
      updateData.reservedBy = null;
      updateData.soldAt = null;
    }

    const [updated] = await db.update(developmentUnits)
      .set(updateData)
      .where(eq(developmentUnits.id, unitId))
      .returning();

    return updated;
  }

  /**
   * Delete unit
   */
  async deleteUnit(unitId: number, developerId: number): Promise<void> {
    // Get unit and verify ownership
    const unit = await this.getUnit(unitId);
    if (!unit) {
      throw new Error('Unit not found');
    }

    const development = await db.query.developments.findFirst({
      where: eq(developments.id, unit.developmentId),
    });

    if (!development || development.developerId !== developerId) {
      throw new Error('Unauthorized: You do not own this development');
    }

    // Delete unit
    await db.delete(developmentUnits).where(eq(developmentUnits.id, unitId));
  }

  /**
   * Bulk delete units
   */
  async bulkDeleteUnits(unitIds: number[], developerId: number): Promise<void> {
    if (unitIds.length === 0) return;

    // Get first unit to verify ownership
    const firstUnit = await this.getUnit(unitIds[0]);
    if (!firstUnit) {
      throw new Error('Unit not found');
    }

    const development = await db.query.developments.findFirst({
      where: eq(developments.id, firstUnit.developmentId),
    });

    if (!development || development.developerId !== developerId) {
      throw new Error('Unauthorized: You do not own this development');
    }

    // Delete units
    await db.delete(developmentUnits).where(inArray(developmentUnits.id, unitIds));
  }

  /**
   * Get availability summary for a development
   * Validates: Requirements 3.4, 3.5
   */
  async getAvailabilitySummary(developmentId: number): Promise<{
    total: number;
    available: number;
    reserved: number;
    sold: number;
    byType: Record<string, { total: number; available: number; reserved: number; sold: number }>;
  }> {
    const units = await this.getDevelopmentUnits(developmentId);

    const summary = {
      total: units.length,
      available: units.filter(u => u.status === 'available').length,
      reserved: units.filter(u => u.status === 'reserved').length,
      sold: units.filter(u => u.status === 'sold').length,
      byType: {} as Record<string, { total: number; available: number; reserved: number; sold: number }>,
    };

    // Group by unit type
    units.forEach(unit => {
      if (!summary.byType[unit.unitType]) {
        summary.byType[unit.unitType] = { total: 0, available: 0, reserved: 0, sold: 0 };
      }
      summary.byType[unit.unitType].total++;
      summary.byType[unit.unitType][unit.status]++;
    });

    return summary;
  }
}

export const unitService = new UnitService();
