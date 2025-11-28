import { db } from '../db';
import { developments, developmentPhases } from '../../drizzle/schema';
import { eq, and, desc, ne } from 'drizzle-orm';
import { 
  Development, 
  DevelopmentPhase, 
  DevelopmentWithPhases,
  CreateDevelopmentInput,
  UpdateDevelopmentInput,
  PhaseStatus 
} from '../../shared/types';
import { developerSubscriptionService } from './developerSubscriptionService';

export class DevelopmentService {
  /**
   * Generate URL-friendly slug from development name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Ensure slug is unique by appending number if needed
   */
  private async ensureUniqueSlug(baseSlug: string, developmentId?: number): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await db.query.developments.findFirst({
        where: developmentId 
          ? and(eq(developments.slug, slug), ne(developments.id, developmentId))
          : eq(developments.slug, slug),
      });

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Create a new development
   * Validates: Requirements 2.1
   */
  async createDevelopment(
    developerId: number,
    input: CreateDevelopmentInput
  ): Promise<Development> {
    // Check tier limits before creating
    const limitCheck = await developerSubscriptionService.checkLimit(developerId, 'developments');
    if (!limitCheck.allowed) {
      throw new Error(
        `Development limit reached. Your ${limitCheck.tier} tier allows ${limitCheck.max} development(s). Please upgrade to create more developments.`
      );
    }

    // Generate unique slug
    const baseSlug = this.generateSlug(input.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    // Create development
    const [development] = await db.insert(developments).values({
      developerId,
      name: input.name,
      slug,
      description: input.description || null,
      developmentType: input.developmentType,
      status: 'planning',
      address: input.address || null,
      city: input.city,
      province: input.province,
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      priceFrom: input.priceFrom || null,
      priceTo: input.priceTo || null,
      amenities: input.amenities ? JSON.stringify(input.amenities) : null,
      completionDate: input.completionDate || null,
      isFeatured: 0,
      isPublished: 0,
      views: 0,
    }).returning();

    // Increment usage counter
    await developerSubscriptionService.incrementUsage(developerId, 'developments');

    return development;
  }

  /**
   * Get development by ID
   */
  async getDevelopment(developmentId: number): Promise<Development | null> {
    const development = await db.query.developments.findFirst({
      where: eq(developments.id, developmentId),
    });

    return development || null;
  }

  /**
   * Get development with phases
   */
  async getDevelopmentWithPhases(developmentId: number): Promise<DevelopmentWithPhases | null> {
    const development = await this.getDevelopment(developmentId);
    if (!development) {
      return null;
    }

    const phases = await db.query.developmentPhases.findMany({
      where: eq(developmentPhases.developmentId, developmentId),
      orderBy: [developmentPhases.phaseNumber],
    });

    return {
      ...development,
      phases,
    };
  }

  /**
   * Get all developments for a developer
   */
  async getDeveloperDevelopments(developerId: number): Promise<Development[]> {
    const devs = await db.query.developments.findMany({
      where: eq(developments.developerId, developerId),
      orderBy: [desc(developments.createdAt)],
    });

    return devs;
  }

  /**
   * Update development
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   */
  async updateDevelopment(
    developmentId: number,
    developerId: number,
    input: UpdateDevelopmentInput
  ): Promise<Development> {
    // Verify ownership
    const existing = await this.getDevelopment(developmentId);
    if (!existing) {
      throw new Error('Development not found');
    }
    if (existing.developerId !== developerId) {
      throw new Error('Unauthorized: You do not own this development');
    }

    // Handle slug update if name changed
    let slug = input.slug;
    if (input.name && input.name !== existing.name) {
      const baseSlug = this.generateSlug(input.name);
      slug = await this.ensureUniqueSlug(baseSlug, developmentId);
    }

    // Prepare update data
    const updateData: any = {
      ...input,
      slug,
      updatedAt: new Date().toISOString(),
    };

    // Convert arrays to JSON strings
    if (input.amenities) {
      updateData.amenities = JSON.stringify(input.amenities);
    }
    if (input.images) {
      updateData.images = JSON.stringify(input.images);
    }
    if (input.videos) {
      updateData.videos = JSON.stringify(input.videos);
    }
    if (input.floorPlans) {
      updateData.floorPlans = JSON.stringify(input.floorPlans);
    }
    if (input.brochures) {
      updateData.brochures = JSON.stringify(input.brochures);
    }

    // Update development
    const [updated] = await db.update(developments)
      .set(updateData)
      .where(eq(developments.id, developmentId))
      .returning();

    return updated;
  }

  /**
   * Delete development
   */
  async deleteDevelopment(developmentId: number, developerId: number): Promise<void> {
    // Verify ownership
    const existing = await this.getDevelopment(developmentId);
    if (!existing) {
      throw new Error('Development not found');
    }
    if (existing.developerId !== developerId) {
      throw new Error('Unauthorized: You do not own this development');
    }

    // Delete development (phases will cascade delete)
    await db.delete(developments).where(eq(developments.id, developmentId));

    // Decrement usage counter
    await developerSubscriptionService.decrementUsage(developerId, 'developments');
  }

  /**
   * Publish development
   * Validates: Requirements 9.1
   */
  async publishDevelopment(developmentId: number, developerId: number): Promise<Development> {
    const development = await this.updateDevelopment(developmentId, developerId, {
      isPublished: true,
      publishedAt: new Date().toISOString(),
    });

    return development;
  }

  /**
   * Unpublish development
   */
  async unpublishDevelopment(developmentId: number, developerId: number): Promise<Development> {
    const development = await this.updateDevelopment(developmentId, developerId, {
      isPublished: false,
    });

    return development;
  }

  /**
   * Create a phase for a development
   * Validates: Requirements 2.3, 15.1, 15.2
   */
  async createPhase(
    developmentId: number,
    developerId: number,
    phaseData: {
      name: string;
      phaseNumber: number;
      description?: string;
      status?: PhaseStatus;
      totalUnits?: number;
      priceFrom?: number;
      priceTo?: number;
      launchDate?: string;
      completionDate?: string;
    }
  ): Promise<DevelopmentPhase> {
    // Verify ownership
    const development = await this.getDevelopment(developmentId);
    if (!development) {
      throw new Error('Development not found');
    }
    if (development.developerId !== developerId) {
      throw new Error('Unauthorized: You do not own this development');
    }

    // Create phase
    const [phase] = await db.insert(developmentPhases).values({
      developmentId,
      name: phaseData.name,
      phaseNumber: phaseData.phaseNumber,
      description: phaseData.description || null,
      status: phaseData.status || 'planning',
      totalUnits: phaseData.totalUnits || 0,
      availableUnits: phaseData.totalUnits || 0,
      priceFrom: phaseData.priceFrom || null,
      priceTo: phaseData.priceTo || null,
      launchDate: phaseData.launchDate || null,
      completionDate: phaseData.completionDate || null,
    }).returning();

    return phase;
  }

  /**
   * Update phase
   * Validates: Requirements 15.4
   */
  async updatePhase(
    phaseId: number,
    developerId: number,
    phaseData: Partial<DevelopmentPhase>
  ): Promise<DevelopmentPhase> {
    // Get phase and verify ownership
    const phase = await db.query.developmentPhases.findFirst({
      where: eq(developmentPhases.id, phaseId),
    });

    if (!phase) {
      throw new Error('Phase not found');
    }

    const development = await this.getDevelopment(phase.developmentId);
    if (!development || development.developerId !== developerId) {
      throw new Error('Unauthorized: You do not own this development');
    }

    // Update phase
    const [updated] = await db.update(developmentPhases)
      .set({
        ...phaseData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(developmentPhases.id, phaseId))
      .returning();

    return updated;
  }

  /**
   * Delete phase
   */
  async deletePhase(phaseId: number, developerId: number): Promise<void> {
    // Get phase and verify ownership
    const phase = await db.query.developmentPhases.findFirst({
      where: eq(developmentPhases.id, phaseId),
    });

    if (!phase) {
      throw new Error('Phase not found');
    }

    const development = await this.getDevelopment(phase.developmentId);
    if (!development || development.developerId !== developerId) {
      throw new Error('Unauthorized: You do not own this development');
    }

    // Delete phase
    await db.delete(developmentPhases).where(eq(developmentPhases.id, phaseId));
  }

  /**
   * Get phases for a development
   */
  async getDevelopmentPhases(developmentId: number): Promise<DevelopmentPhase[]> {
    const phases = await db.query.developmentPhases.findMany({
      where: eq(developmentPhases.developmentId, developmentId),
      orderBy: [developmentPhases.phaseNumber],
    });

    return phases;
  }
}

export const developmentService = new DevelopmentService();
