import { getDb } from '../db.ts';
import { developments, developmentPhases, developmentApprovalQueue, developers, developmentDrafts } from '../../drizzle/schema.ts';
import { eq, and, desc, ne, sql } from 'drizzle-orm';
import { 
  Development, 
  DevelopmentPhase, 
  DevelopmentWithPhases,
  CreateDevelopmentInput,
  UpdateDevelopmentInput,
  PhaseStatus 
} from '../../shared/types.ts';
import { developerSubscriptionService } from './developerSubscriptionService.ts';

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
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
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
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
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
    const [result] = await db.insert(developments).values({
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
      placeId: input.placeId || null,
      locationId: input.locationId || null, // New: Link to locations table
      priceFrom: input.priceFrom || null,
      priceTo: input.priceTo || null,
      amenities: input.amenities ? JSON.stringify(input.amenities) : null,
      completionDate: input.completionDate || null,
      isFeatured: 0,
      isPublished: 0,
      showHouseAddress: input.showHouseAddress === false ? 0 : 1,
      views: 0,
    });
    
    const development = await this.getDevelopment(result.insertId as number);
    if (!development) throw new Error('Failed to create development');

    // Increment usage counter
    await developerSubscriptionService.incrementUsage(developerId, 'developments');

    return development;
  }

  /**
   * Get development by ID
   */
  async getDevelopment(developmentId: number): Promise<Development | null> {
    const db = await getDb();
    if (!db) return null;
    
    const development = await db.query.developments.findFirst({
      where: eq(developments.id, developmentId),
    });

    return development || null;
  }

  /**
   * Get development with phases
   */
  async getDevelopmentWithPhases(developmentId: number): Promise<DevelopmentWithPhases | null> {
    const db = await getDb();
    if (!db) return null;
    
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
  async getDeveloperDevelopments(developerId: number): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];
    
    // Use raw select to include subquery for rejection reason
    // This avoids joining the whole table and getting duplicates
    const devs = await db.select({
      id: developments.id,
      name: developments.name,
      slug: developments.slug,
      approvalStatus: developments.approvalStatus,
      developmentType: developments.developmentType,
      city: developments.city,
      province: developments.province,
      totalUnits: developments.totalUnits,
      createdAt: developments.createdAt,
      updatedAt: developments.updatedAt,
      // Subquery for latest rejection reason
      rejectionReason: sql<string>`(
        SELECT rejection_reason 
        FROM development_approval_queue 
        WHERE development_id = ${developments.id} 
        AND status = 'rejected'
        ORDER BY submitted_at DESC 
        LIMIT 1
      )`
    })
    .from(developments)
    .where(eq(developments.developerId, developerId))
    .orderBy(desc(developments.createdAt));

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

    if (input.showHouseAddress !== undefined) {
      updateData.showHouseAddress = input.showHouseAddress ? 1 : 0;
    }

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

    // If development was rejected, reset approval status to draft on edit so it doesn't look like "Rejected" while working
    if (existing.approvalStatus === 'rejected') {
        updateData.approvalStatus = 'draft';
    }

    // Update development
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    await db.update(developments)
      .set(updateData)
      .where(eq(developments.id, developmentId));

    const updated = await this.getDevelopment(developmentId);
    if (!updated) throw new Error('Failed to update development');

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
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    await db.delete(developments).where(eq(developments.id, developmentId));

    // Decrement usage counter
    await developerSubscriptionService.decrementUsage(developerId, 'developments');
  }

  /**
   * Publish development (Submit for Review)
   * Validates: Requirements 9.1
   */
  async publishDevelopment(developmentId: number, developerId: number, isTrusted: boolean): Promise<Development> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Verify ownership
    const existing = await this.getDevelopment(developmentId);
    if (!existing || existing.developerId !== developerId) {
       throw new Error('Unauthorized');
    }

    // Guard: Prevent re-publishing if already approved
    if (existing.approvalStatus === 'approved') {
       throw new Error('Development is already published');
    }

    // Guard: Prevent duplicate pending submissions for non-trusted devs
    if (!isTrusted && existing.approvalStatus === 'pending') {
        throw new Error('Development is already pending review');
    }

    // System Reviewer Constant (null implies system/auto when status is approved)
    const SYSTEM_REVIEWER_ID = null;

    // Determine Status
    const newStatus = isTrusted ? 'approved' : 'pending';
    const isPublished = isTrusted ? 1 : 0;
    const publishedAt = isTrusted ? new Date().toISOString() : null;
    const notes = isTrusted ? 'Auto-approved (trusted developer)' : null;

    // 1. Update Development Status
    await db.update(developments)
      .set({
        isPublished: isPublished,
        approvalStatus: newStatus,
        publishedAt: publishedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(developments.id, developmentId));

    const development = await this.getDevelopment(developmentId);
    if (!development) throw new Error('Failed to update development status');

    // Determine submission type based on history
    const priorHistory = await db.select({ id: developmentApprovalQueue.id })
        .from(developmentApprovalQueue)
        .where(eq(developmentApprovalQueue.developmentId, developmentId))
        .limit(1);
    
    const submissionType = priorHistory.length > 0 ? 'update' : 'initial';

    // 2. Create Queue Entry (Audit Trail)
    await db.insert(developmentApprovalQueue).values({
      developmentId,
      submittedBy: developerId,
      status: newStatus,
      submissionType: submissionType,
      submittedAt: new Date().toISOString(),
      reviewNotes: notes,
      reviewedBy: isTrusted ? SYSTEM_REVIEWER_ID : undefined, 
      reviewedAt: publishedAt,
    });

    return development;
  }

  /**
   * Approve development (Admin only)
   */
  async approveDevelopment(
    developmentId: number, 
    adminId: number, 
    complianceChecks?: Record<string, boolean>
  ): Promise<Development> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 1. Update Queue Entry
    // Find the latest pending/reviewing entry
    const [queueEntry] = await db.select()
      .from(developmentApprovalQueue)
      .where(and(
        eq(developmentApprovalQueue.developmentId, developmentId),
        eq(developmentApprovalQueue.status, 'pending')
      ))
      .orderBy(desc(developmentApprovalQueue.submittedAt))
      .limit(1);

    if (queueEntry) {
        await db.update(developmentApprovalQueue)
          .set({
            status: 'approved',
            reviewedBy: adminId,
            reviewedAt: new Date().toISOString(),
            complianceChecks: complianceChecks || null,
          })
          .where(eq(developmentApprovalQueue.id, queueEntry.id));
    }

    // 2. Update Development (Go Live)
    await db.update(developments)
      .set({
        isPublished: 1,
        approvalStatus: 'approved',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(developments.id, developmentId));

    const development = await this.getDevelopment(developmentId);
    if (!development) throw new Error('Failed to update development status');

    return development;
  }

  /**
   * Reject development (Admin only)
   */
  async rejectDevelopment(developmentId: number, adminId: number, reason: string): Promise<Development> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 1. Update Queue Entry
    const [queueEntry] = await db.select()
        .from(developmentApprovalQueue)
        .where(and(
            eq(developmentApprovalQueue.developmentId, developmentId),
            eq(developmentApprovalQueue.status, 'pending')
        ))
        .orderBy(desc(developmentApprovalQueue.submittedAt))
        .limit(1);

    if (queueEntry) {
        await db.update(developmentApprovalQueue)
            .set({
                status: 'rejected',
                rejectionReason: reason,
                reviewedBy: adminId,
                reviewedAt: new Date().toISOString(),
            })
            .where(eq(developmentApprovalQueue.id, queueEntry.id));
    }

    // 2. Update Development (Stay Hidden, Marked Rejected)
    await db.update(developments)
      .set({
        isPublished: 0,
        approvalStatus: 'rejected',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(developments.id, developmentId));

    const development = await this.getDevelopment(developmentId);
    if (!development) throw new Error('Failed to update development status');

    return development;
  }

  /**
   * Request changes (Soft Rejection)
   */
  async requestChanges(developmentId: number, adminId: number, feedback: string): Promise<Development> {
    // We reuse the rejection flow but precise the intent in the reason text
    // This avoids schema changes while allowing the UI to distinguish
    return this.rejectDevelopment(developmentId, adminId, `[CHANGES_REQUESTED] ${feedback}`);
  }

  /**
   * Unpublish development (Developer action)
   */
  async unpublishDevelopment(developmentId: number, developerId: number): Promise<Development> {
    const development = await this.updateDevelopment(developmentId, developerId, {
      isPublished: false,
      // We don't reset approvalStatus to draft here to preserve history, 
      // but maybe we should if they want to 'withdraw' it? 
      // For now, simple unpublish.
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
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const [result] = await db.insert(developmentPhases).values({
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
    });
    
    const phase = await db.query.developmentPhases.findFirst({
         where: eq(developmentPhases.id, result.insertId as number)
    });
    if (!phase) throw new Error('Failed to create phase');

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
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
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
    await db.update(developmentPhases)
      .set({
        ...phaseData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(developmentPhases.id, phaseId));

    const updated = await db.query.developmentPhases.findFirst({
        where: eq(developmentPhases.id, phaseId)
    });
    if (!updated) throw new Error('Failed to update phase');

    return updated;
  }

  /**
   * Delete phase
   */
  async deletePhase(phaseId: number, developerId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
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
    const db = await getDb();
    if (!db) return [];
    
    const phases = await db.query.developmentPhases.findMany({
      where: eq(developmentPhases.developmentId, developmentId),
      orderBy: [developmentPhases.phaseNumber],
    });

    return phases;
  }

  /**
   * Save development draft
   */
  async saveDraft(
    developerId: number,
    draftData: any,
    draftId?: number
  ): Promise<{ id: number }> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const currentStep = draftData.currentPhase || 1;
    const draftName = draftData.developmentData?.name || 'Untitled Draft';

    if (draftId) {
      // Verify ownership and update
      const existing = await db.query.developmentDrafts.findFirst({
        where: and(
          eq(developmentDrafts.id, draftId),
          eq(developmentDrafts.developerId, developerId)
        ),
      });

      if (existing) {
        await db.update(developmentDrafts)
          .set({
            draftData,
            draftName,
            currentStep,
            lastModified: new Date().toISOString(),
            progress: Math.round((currentStep / 5) * 100),
          })
          .where(eq(developmentDrafts.id, draftId));
        
        return { id: draftId };
      }
    }

    // Create new draft
    const [result] = await db.insert(developmentDrafts).values({
      developerId,
      draftData,
      draftName,
      currentStep,
      progress: Math.round((currentStep / 5) * 100),
    });

    return { id: result.insertId as number };
  }

  /**
   * Get development draft
   */
  async getDraft(draftId: number, developerId: number): Promise<any | null> {
    const db = await getDb();
    if (!db) return null;

    const draft = await db.query.developmentDrafts.findFirst({
      where: and(
        eq(developmentDrafts.id, draftId),
        eq(developmentDrafts.developerId, developerId)
      ),
    });

    return draft || null;
  }
}

export const developmentService = new DevelopmentService();
