import { db } from '../db';
import {
  contentApprovalQueue,
  explorePartners,
  partnerTiers,
  exploreContent,
} from '../../drizzle/schema';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { partnerService } from './partnerService';

const toInt = (value: string | number): number =>
  typeof value === 'number' ? value : Number(value);

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ContentApprovalQueue {
  id: number;
  contentId: number;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'changes_requested';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewerId?: number;
  feedback?: string;
}

export interface ApprovalDecision {
  status: 'approved' | 'rejected' | 'reviewing' | 'changes_requested';
  feedback?: string;
  violationTypes?: string[];
}

export interface QueueFilters {
  status?: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'changes_requested';
  partnerId?: string;
  limit?: number;
  offset?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ContentSubmission {
  contentId: string;
  partnerId: string;
  contentType: string;
  metadata?: any;
  ctas?: string[];
}

// ============================================================================
// CONTENT APPROVAL SERVICE
// ============================================================================

export class ContentApprovalService {
  /**
   * Submit content for approval
   * Routes first 3 submissions to manual queue
   * Enables auto-approval after 3 approved pieces
   * Requirements: 6.1, 6.2
   */
  async submitForApproval(contentId: string, partnerId: string): Promise<ContentApprovalQueue> {
    const contentIdNum = toInt(contentId);
    if (!Number.isFinite(contentIdNum)) {
      throw new Error('Invalid contentId');
    }

    // Check if partner exists
    const partner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, partnerId),
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    const submittedBy = toInt(partner.userId);
    if (!Number.isFinite(submittedBy)) {
      throw new Error('Partner userId is not a numeric user id');
    }

    // Check if content already in queue
    const existingQueueItem = await db.query.contentApprovalQueue.findFirst({
      where: and(eq(contentApprovalQueue.contentId, contentIdNum)),
    });

    if (existingQueueItem) {
      throw new Error('Content already submitted for approval');
    }

    const [queueItem] = await db.insert(contentApprovalQueue).values({
      contentId: contentIdNum,
      submittedBy,
      status: 'pending',
    });

    return {
      id: Number((queueItem as any)?.insertId ?? (queueItem as any)?.[0]?.insertId),
      contentId: contentIdNum,
      status: 'pending',
      submittedAt: new Date(),
    };
  }

  /**
   * Check if partner is eligible for auto-approval
   * Requirements: 6.1, 6.2
   */
  async checkAutoApprovalEligibility(partnerId: string): Promise<boolean> {
    return await partnerService.isEligibleForAutoApproval(partnerId);
  }

  /**
   * Flag content for manual review
   * Routes flagged content to manual review regardless of partner status
   * Requirements: 6.3
   */
  async flagContent(contentId: string, reason: string, reporterId: string): Promise<void> {
    const contentIdNum = toInt(contentId);
    if (!Number.isFinite(contentIdNum)) {
      throw new Error('Invalid contentId');
    }

    // Find the queue item for this content
    const queueItem = await db.query.contentApprovalQueue.findFirst({
      where: eq(contentApprovalQueue.contentId, contentIdNum),
    });

    if (!queueItem) {
      // If content not in queue, it may already be approved
      // We need to create a new queue item for review
      const content = await db.query.exploreContent.findFirst({
        where: eq(exploreContent.id, contentIdNum),
      });

      if (!content) {
        throw new Error('Content not found');
      }

      // Create new queue item for flagged content
      const reporterIdNum = toInt(reporterId);
      if (!Number.isFinite(reporterIdNum)) {
        throw new Error('Invalid reporterId');
      }

      await db.insert(contentApprovalQueue).values({
        contentId: contentIdNum,
        submittedBy: reporterIdNum,
        status: 'pending',
        reviewNotes: `Flagged by user ${reporterId}: ${reason}`,
      });

      return;
    }

    // Update existing queue item
    await db
      .update(contentApprovalQueue)
      .set({
        status: 'pending',
        reviewNotes: `Flagged by user ${reporterId}: ${reason}`,
      })
      .where(eq(contentApprovalQueue.id, queueItem.id));
  }

  /**
   * Route content to manual review queue
   * Used internally to force manual review
   * Requirements: 6.3
   */
  async routeToManualReview(queueId: string, reason: string): Promise<void> {
    const queueIdNum = toInt(queueId);
    if (!Number.isFinite(queueIdNum)) {
      throw new Error('Invalid queueId');
    }

    await db
      .update(contentApprovalQueue)
      .set({
        status: 'pending',
        reviewNotes: reason,
      })
      .where(eq(contentApprovalQueue.id, queueIdNum));
  }

  /**
   * Review content with approve/reject/revision decision
   * Provides feedback on rejection
   * Requirements: 6.5
   */
  async reviewContent(
    queueId: string,
    decision: ApprovalDecision,
    reviewerId: string,
  ): Promise<void> {
    const queueIdNum = toInt(queueId);
    if (!Number.isFinite(queueIdNum)) {
      throw new Error('Invalid queueId');
    }

    const queueItem = await db.query.contentApprovalQueue.findFirst({
      where: eq(contentApprovalQueue.id, queueIdNum),
    });

    if (!queueItem) {
      throw new Error('Queue item not found');
    }

    // Validate decision has feedback for rejections and revision requests
    if (
      (decision.status === 'rejected' || decision.status === 'changes_requested') &&
      !decision.feedback
    ) {
      throw new Error('Feedback is required for rejected or revision-requested content');
    }

    // Build comprehensive feedback message
    let feedbackMessage = decision.feedback || '';

    if (decision.violationTypes && decision.violationTypes.length > 0) {
      feedbackMessage += `\n\nViolation types: ${decision.violationTypes.join(', ')}`;
    }

    // Add guidance for rejected content
    if (decision.status === 'rejected') {
      feedbackMessage += '\n\nPlease review our content guidelines and ensure your content:';
      feedbackMessage += '\n- Provides educational value, not just promotion';
      feedbackMessage += "\n- Matches your tier's allowed content types";
      feedbackMessage += '\n- Uses only approved CTAs for your tier';
      feedbackMessage += '\n- Has complete and accurate metadata';
      feedbackMessage += '\n\nAsk yourself: "Would I watch this even if I wasn\'t buying?"';
    }

    // Add guidance for revision requests
    if (decision.status === 'changes_requested') {
      feedbackMessage += '\n\nPlease make the requested changes and resubmit.';
    }

    // Update queue item with decision
    const reviewerIdNum = toInt(reviewerId);
    await db
      .update(contentApprovalQueue)
      .set({
        status: decision.status,
        reviewedAt: sql`CURRENT_TIMESTAMP`,
        assignedTo: Number.isFinite(reviewerIdNum) ? reviewerIdNum : undefined,
        reviewNotes: feedbackMessage,
        rejectionReason: decision.status === 'rejected' ? feedbackMessage : undefined,
      })
      .where(eq(contentApprovalQueue.id, queueIdNum));

    // If approved, increment partner's approved content count
    if (decision.status === 'approved') {
      // Partner linkage is not present in the approval queue schema.
      // Partner counters are updated elsewhere until schema is aligned.
    }
  }

  /**
   * Get pending reviews for a specific reviewer
   * Requirements: 6.5
   */
  async getPendingReviews(
    reviewerId?: string,
    limit: number = 50,
  ): Promise<ContentApprovalQueue[]> {
    const items = await db.query.contentApprovalQueue.findMany({
      where: eq(contentApprovalQueue.status, 'pending'),
      orderBy: [desc(contentApprovalQueue.submittedAt)],
      limit,
    });

    return items.map(item => ({
      id: item.id,
      contentId: item.contentId,
      status: item.status,
      submittedAt: new Date(item.submittedAt),
      reviewedAt: item.reviewedAt ? new Date(item.reviewedAt) : undefined,
      reviewerId: item.assignedTo || undefined,
      feedback: item.reviewNotes || undefined,
    }));
  }

  /**
   * Get review statistics for a partner
   * Requirements: 6.5
   */
  async getPartnerReviewStats(partnerId: string): Promise<{
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    revisionRequested: number;
    approvalRate: number;
  }> {
    const partner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, partnerId),
    });

    if (!partner) {
      return {
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        revisionRequested: 0,
        approvalRate: 0,
      };
    }

    const submittedBy = toInt(partner.userId);
    if (!Number.isFinite(submittedBy)) {
      return {
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        revisionRequested: 0,
        approvalRate: 0,
      };
    }

    const items = await db.query.contentApprovalQueue.findMany({
      where: eq(contentApprovalQueue.submittedBy, submittedBy),
    });

    const total = items.length;
    const approved = items.filter(i => i.status === 'approved').length;
    const rejected = items.filter(i => i.status === 'rejected').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const revisionRequested = items.filter(i => i.status === 'changes_requested').length;

    const approvalRate = total > 0 ? (approved / total) * 100 : 0;

    return {
      total,
      approved,
      rejected,
      pending,
      revisionRequested,
      approvalRate: Math.round(approvalRate * 100) / 100,
    };
  }

  /**
   * Get approval queue with filters
   * Requirements: 6.1, 6.2, 6.3
   */
  async getApprovalQueue(filters: QueueFilters = {}): Promise<ContentApprovalQueue[]> {
    const conditions: SQL[] = [];

    if (filters.status) {
      conditions.push(eq(contentApprovalQueue.status, filters.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db.query.contentApprovalQueue.findMany({
      where: whereClause,
      orderBy: [desc(contentApprovalQueue.submittedAt)],
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    return items.map(item => ({
      id: item.id,
      contentId: item.contentId,
      status: item.status,
      submittedAt: new Date(item.submittedAt),
      reviewedAt: item.reviewedAt ? new Date(item.reviewedAt) : undefined,
      reviewerId: item.assignedTo || undefined,
      feedback: item.reviewNotes || undefined,
    }));
  }

  /**
   * Validate content rules against partner tier permissions
   * Requirements: 1.6, 15.2, 15.3
   */
  async validateContentRules(content: ContentSubmission, partner: any): Promise<ValidationResult> {
    const errors: string[] = [];

    // Get partner tier information
    const tier = await db.query.partnerTiers.findFirst({
      where: eq(partnerTiers.id, partner.tierId),
    });

    if (!tier) {
      errors.push('Partner tier not found');
      return { isValid: false, errors };
    }

    // Parse allowed content types and CTAs
    const allowedContentTypes =
      typeof tier.allowedContentTypes === 'string'
        ? JSON.parse(tier.allowedContentTypes)
        : tier.allowedContentTypes;

    const allowedCTAs =
      typeof tier.allowedCTAs === 'string' ? JSON.parse(tier.allowedCTAs) : tier.allowedCTAs;

    // Validate content type against tier permissions
    if (!allowedContentTypes.includes(content.contentType)) {
      errors.push(
        `Content type "${content.contentType}" not allowed for tier "${tier.name}". ` +
          `Allowed types: ${allowedContentTypes.join(', ')}`,
      );
    }

    // Validate CTAs against tier permissions
    if (content.ctas && content.ctas.length > 0) {
      const invalidCTAs = content.ctas.filter(cta => !allowedCTAs.includes(cta));
      if (invalidCTAs.length > 0) {
        errors.push(
          `CTAs not allowed for tier "${tier.name}": ${invalidCTAs.join(', ')}. ` +
            `Allowed CTAs: ${allowedCTAs.join(', ')}`,
        );
      }
    }

    // Validate metadata completeness
    if (!content.metadata) {
      errors.push('Content metadata is required');
    } else {
      // Check for required metadata fields
      const requiredFields = ['title', 'description'];
      const missingFields = requiredFields.filter(field => !content.metadata[field]);

      if (missingFields.length > 0) {
        errors.push(`Missing required metadata fields: ${missingFields.join(', ')}`);
      }

      // Validate title length
      if (content.metadata.title && content.metadata.title.length < 10) {
        errors.push('Title must be at least 10 characters long');
      }

      if (content.metadata.title && content.metadata.title.length > 255) {
        errors.push('Title must not exceed 255 characters');
      }

      // Validate description length
      if (content.metadata.description && content.metadata.description.length < 20) {
        errors.push('Description must be at least 20 characters long');
      }

      // Check for promotional language without educational value
      if (content.metadata.description) {
        const promotionalKeywords = [
          'buy now',
          'limited time',
          'act fast',
          "don't miss",
          'exclusive offer',
          'special deal',
          'hurry',
        ];

        const hasPromotionalLanguage = promotionalKeywords.some(keyword =>
          content.metadata.description.toLowerCase().includes(keyword),
        );

        if (hasPromotionalLanguage) {
          errors.push(
            'Content appears to be purely promotional. Please add educational value. ' +
              'Ask yourself: "Would I watch this even if I wasn\'t buying?"',
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate content type against tier permissions
   * Requirements: 1.6
   */
  async validateContentType(contentType: string, tierId: number): Promise<boolean> {
    const tier = await db.query.partnerTiers.findFirst({
      where: eq(partnerTiers.id, tierId),
    });

    if (!tier) {
      return false;
    }

    const allowedContentTypes =
      typeof tier.allowedContentTypes === 'string'
        ? JSON.parse(tier.allowedContentTypes)
        : tier.allowedContentTypes;

    return allowedContentTypes.includes(contentType);
  }

  /**
   * Validate CTAs against tier permissions
   * Requirements: 1.6
   */
  async validateCTAs(
    ctas: string[],
    tierId: number,
  ): Promise<{ isValid: boolean; invalidCTAs: string[] }> {
    const tier = await db.query.partnerTiers.findFirst({
      where: eq(partnerTiers.id, tierId),
    });

    if (!tier) {
      return { isValid: false, invalidCTAs: ctas };
    }

    const allowedCTAs =
      typeof tier.allowedCTAs === 'string' ? JSON.parse(tier.allowedCTAs) : tier.allowedCTAs;

    const invalidCTAs = ctas.filter(cta => !allowedCTAs.includes(cta));

    return {
      isValid: invalidCTAs.length === 0,
      invalidCTAs,
    };
  }

  /**
   * Validate metadata completeness
   * Requirements: 15.3
   */
  validateMetadataCompleteness(metadata: any): { isValid: boolean; missingFields: string[] } {
    const requiredFields = ['title', 'description'];
    const missingFields = requiredFields.filter(field => !metadata || !metadata[field]);

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }
}

// Export singleton instance
export const contentApprovalService = new ContentApprovalService();
