import { db } from '../db';
import {
  contentApprovalQueue,
  explorePartners,
  partnerTiers,
  exploreContent,
  exploreShorts,
} from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { partnerService } from './partnerService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ContentApprovalQueue {
  id: string;
  contentId: string;
  partnerId: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewerId?: string;
  feedback?: string;
  autoApprovalEligible: boolean;
}

export interface ApprovalDecision {
  status: 'approved' | 'rejected' | 'revision_requested';
  feedback?: string;
  violationTypes?: string[];
}

export interface QueueFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'revision_requested';
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
    // Check if partner exists
    const partner = await db.query.explorePartners.findFirst({
      where: eq(explorePartners.id, partnerId),
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Check if content already in queue
    const existingQueueItem = await db.query.contentApprovalQueue.findFirst({
      where: and(
        eq(contentApprovalQueue.contentId, contentId),
        eq(contentApprovalQueue.partnerId, partnerId),
      ),
    });

    if (existingQueueItem) {
      throw new Error('Content already submitted for approval');
    }

    // Determine if eligible for auto-approval
    // Partners with 3+ approved content pieces are eligible
    const isEligible = await partnerService.isEligibleForAutoApproval(partnerId);

    const queueId = randomUUID();
    const [queueItem] = await db.insert(contentApprovalQueue).values({
      id: queueId,
      contentId,
      partnerId,
      status: 'pending',
      autoApprovalEligible: isEligible,
    });

    return {
      id: queueId,
      contentId,
      partnerId,
      status: 'pending',
      submittedAt: new Date(),
      autoApprovalEligible: isEligible,
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
    // Find the queue item for this content
    const queueItem = await db.query.contentApprovalQueue.findFirst({
      where: eq(contentApprovalQueue.contentId, contentId),
    });

    if (!queueItem) {
      // If content not in queue, it may already be approved
      // We need to create a new queue item for review
      const content = await db.query.exploreContent.findFirst({
        where: eq(exploreContent.id, parseInt(contentId)),
      });

      if (!content) {
        throw new Error('Content not found');
      }

      if (!content.partnerId) {
        throw new Error('Content does not have an associated partner');
      }

      // Create new queue item for flagged content
      const queueId = randomUUID();
      await db.insert(contentApprovalQueue).values({
        id: queueId,
        contentId,
        partnerId: content.partnerId,
        status: 'pending',
        autoApprovalEligible: false,
        feedback: `Flagged by user ${reporterId}: ${reason}`,
      });

      return;
    }

    // Update existing queue item
    await db
      .update(contentApprovalQueue)
      .set({
        status: 'pending',
        autoApprovalEligible: false,
        feedback: `Flagged by user ${reporterId}: ${reason}`,
      })
      .where(eq(contentApprovalQueue.id, queueItem.id));
  }

  /**
   * Route content to manual review queue
   * Used internally to force manual review
   * Requirements: 6.3
   */
  async routeToManualReview(queueId: string, reason: string): Promise<void> {
    await db
      .update(contentApprovalQueue)
      .set({
        status: 'pending',
        autoApprovalEligible: false,
        feedback: reason,
      })
      .where(eq(contentApprovalQueue.id, queueId));
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
    const queueItem = await db.query.contentApprovalQueue.findFirst({
      where: eq(contentApprovalQueue.id, queueId),
    });

    if (!queueItem) {
      throw new Error('Queue item not found');
    }

    // Validate decision has feedback for rejections and revision requests
    if (
      (decision.status === 'rejected' || decision.status === 'revision_requested') &&
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
    if (decision.status === 'revision_requested') {
      feedbackMessage += '\n\nPlease make the requested changes and resubmit.';
    }

    // Update queue item with decision
    await db
      .update(contentApprovalQueue)
      .set({
        status: decision.status,
        reviewedAt: sql`CURRENT_TIMESTAMP`,
        reviewerId,
        feedback: feedbackMessage,
      })
      .where(eq(contentApprovalQueue.id, queueId));

    // If approved, increment partner's approved content count
    if (decision.status === 'approved') {
      await partnerService.incrementApprovedContentCount(queueItem.partnerId);

      // Recalculate partner trust score after approval
      await partnerService.calculateTrustScore(queueItem.partnerId);
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
      partnerId: item.partnerId,
      status: item.status,
      submittedAt: new Date(item.submittedAt),
      reviewedAt: item.reviewedAt ? new Date(item.reviewedAt) : undefined,
      reviewerId: item.reviewerId || undefined,
      feedback: item.feedback || undefined,
      autoApprovalEligible: item.autoApprovalEligible,
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
    const items = await db.query.contentApprovalQueue.findMany({
      where: eq(contentApprovalQueue.partnerId, partnerId),
    });

    const total = items.length;
    const approved = items.filter(i => i.status === 'approved').length;
    const rejected = items.filter(i => i.status === 'rejected').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const revisionRequested = items.filter(i => i.status === 'revision_requested').length;

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
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(contentApprovalQueue.status, filters.status));
    }

    if (filters.partnerId) {
      conditions.push(eq(contentApprovalQueue.partnerId, filters.partnerId));
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
      partnerId: item.partnerId,
      status: item.status,
      submittedAt: new Date(item.submittedAt),
      reviewedAt: item.reviewedAt ? new Date(item.reviewedAt) : undefined,
      reviewerId: item.reviewerId || undefined,
      feedback: item.feedback || undefined,
      autoApprovalEligible: item.autoApprovalEligible,
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
