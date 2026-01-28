import { db } from '../db';
import { eq, and, count } from 'drizzle-orm';

/**
 * Founding Partner Service
 *
 * Manages the Early Partner Program with special benefits for founding partners.
 * Tracks enrollment, content commitments, and benefit eligibility.
 *
 * Requirements: 16.25, 16.26, 16.28, 16.29, 16.30
 */

export interface FoundingPartner {
  partnerId: string;
  enrollmentDate: Date;
  benefitsEndDate: Date;
  preLaunchContentDelivered: number;
  weeklyContentDelivered: number[];
  warningCount: number;
  status: 'active' | 'warning' | 'revoked';
  createdAt: Date;
}

export interface FoundingPartnerBenefits {
  featuredTierMonths: 3;
  foundingBadge: boolean;
  coMarketingEligible: boolean;
  fastTrackReview: boolean; // 24hr vs 48hr
}

export interface ContentCommitment {
  preLaunch: { required: number; delivered: number };
  weekly: { required: number; delivered: number };
}

export interface CommitmentStatus {
  partnerId: string;
  isCompliant: boolean;
  preLaunchMet: boolean;
  weeklyMet: boolean;
  preLaunchProgress: { required: number; delivered: number };
  weeklyProgress: { required: number; delivered: number };
  warningCount: number;
  nextWarningThreshold: number;
}

export interface EnrollmentResult {
  success: boolean;
  partnerId?: string;
  message: string;
  foundingPartner?: FoundingPartner;
}

const MAX_FOUNDING_PARTNERS = 15;
const PRE_LAUNCH_COMMITMENT_MIN = 5;
const PRE_LAUNCH_COMMITMENT_MAX = 10;
const WEEKLY_COMMITMENT = 2;
const FEATURED_TIER_MONTHS = 3;
const MAX_WARNINGS = 2;

class FoundingPartnerService {
  /**
   * Enroll a partner in the Founding Partner Program
   * Requirements: 16.25, 16.29
   */
  async enrollFoundingPartner(partnerId: string): Promise<EnrollmentResult> {
    // Check if enrollment is still open
    const isOpen = await this.checkEnrollmentOpen();

    if (!isOpen) {
      return {
        success: false,
        message: 'Founding Partner Program enrollment is closed. Maximum of 15 partners reached.',
      };
    }

    // Check if partner already enrolled
    const existing = await db.query.foundingPartners.findFirst({
      where: (fp, { eq }: any) => eq(fp.partnerId, partnerId),
    });

    if (existing) {
      return {
        success: false,
        message: 'Partner is already enrolled in the Founding Partner Program.',
      };
    }

    // Calculate benefits end date (3 months from now)
    const enrollmentDate = new Date();
    const benefitsEndDate = new Date();
    benefitsEndDate.setMonth(benefitsEndDate.getMonth() + FEATURED_TIER_MONTHS);

    // Create founding partner record
    await db.insert(db.schema.foundingPartners).values({
      partnerId,
      enrollmentDate,
      benefitsEndDate,
      preLaunchContentDelivered: 0,
      weeklyContentDelivered: JSON.stringify([]),
      warningCount: 0,
      status: 'active',
    });

    const foundingPartner = await this.getFoundingPartnerStatus(partnerId);

    return {
      success: true,
      partnerId,
      message:
        'Successfully enrolled in Founding Partner Program with 3 months Featured tier access.',
      foundingPartner: foundingPartner || undefined,
    };
  }

  /**
   * Check if Founding Partner enrollment is still open
   * Requirements: 16.29
   */
  async checkEnrollmentOpen(): Promise<boolean> {
    const result = await db.select({ count: count() }).from(db.schema.foundingPartners);

    const currentCount = result[0]?.count || 0;
    return currentCount < MAX_FOUNDING_PARTNERS;
  }

  /**
   * Get founding partner status for a specific partner
   * Requirements: 16.25
   */
  async getFoundingPartnerStatus(partnerId: string): Promise<FoundingPartner | null> {
    const result = await db.query.foundingPartners.findFirst({
      where: (fp, { eq }: any) => eq(fp.partnerId, partnerId),
    });

    if (!result) return null;

    let weeklyContentDelivered: number[] = [];
    try {
      weeklyContentDelivered = JSON.parse(result.weeklyContentDelivered as string);
    } catch (e) {
      weeklyContentDelivered = [];
    }

    return {
      partnerId: result.partnerId,
      enrollmentDate: result.enrollmentDate,
      benefitsEndDate: result.benefitsEndDate,
      preLaunchContentDelivered: result.preLaunchContentDelivered,
      weeklyContentDelivered,
      warningCount: result.warningCount,
      status: result.status as FoundingPartner['status'],
      createdAt: result.createdAt,
    };
  }

  /**
   * Check if a partner is a founding partner
   * Requirements: 16.25
   */
  async isFoundingPartner(partnerId: string): Promise<boolean> {
    const status = await this.getFoundingPartnerStatus(partnerId);
    return status !== null && status.status === 'active';
  }

  /**
   * Get founding partner benefits configuration
   * Requirements: 16.26, 16.28
   */
  getFoundingPartnerBenefits(): FoundingPartnerBenefits {
    return {
      featuredTierMonths: FEATURED_TIER_MONTHS,
      foundingBadge: true,
      coMarketingEligible: true,
      fastTrackReview: true, // 24hr vs 48hr
    };
  }

  /**
   * Check if founding partner benefits are still active
   * Requirements: 16.26
   */
  async areBenefitsActive(partnerId: string): Promise<boolean> {
    const status = await this.getFoundingPartnerStatus(partnerId);

    if (!status || status.status !== 'active') {
      return false;
    }

    const now = new Date();
    return now <= status.benefitsEndDate;
  }

  /**
   * Check content commitment status for a founding partner
   * Requirements: 16.30
   */
  async checkContentCommitment(partnerId: string): Promise<CommitmentStatus> {
    const status = await this.getFoundingPartnerStatus(partnerId);

    if (!status) {
      throw new Error('Partner is not enrolled in Founding Partner Program');
    }

    const preLaunchMet = status.preLaunchContentDelivered >= PRE_LAUNCH_COMMITMENT_MIN;

    // Calculate weekly commitment (average 2 per week)
    const weeksActive = Math.floor(
      (Date.now() - status.enrollmentDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    const requiredWeeklyTotal = Math.max(0, weeksActive * WEEKLY_COMMITMENT);
    const deliveredWeeklyTotal = status.weeklyContentDelivered.reduce(
      (sum, count) => sum + count,
      0,
    );
    const weeklyMet = deliveredWeeklyTotal >= requiredWeeklyTotal;

    return {
      partnerId,
      isCompliant: preLaunchMet && weeklyMet,
      preLaunchMet,
      weeklyMet,
      preLaunchProgress: {
        required: PRE_LAUNCH_COMMITMENT_MIN,
        delivered: status.preLaunchContentDelivered,
      },
      weeklyProgress: {
        required: requiredWeeklyTotal,
        delivered: deliveredWeeklyTotal,
      },
      warningCount: status.warningCount,
      nextWarningThreshold: MAX_WARNINGS - status.warningCount,
    };
  }

  /**
   * Track pre-launch content delivery
   * Requirements: 16.30
   */
  async trackPreLaunchContent(partnerId: string): Promise<void> {
    const status = await this.getFoundingPartnerStatus(partnerId);

    if (!status) {
      throw new Error('Partner is not enrolled in Founding Partner Program');
    }

    await db
      .update(db.schema.foundingPartners)
      .set({
        preLaunchContentDelivered: status.preLaunchContentDelivered + 1,
      })
      .where(eq(db.schema.foundingPartners.partnerId, partnerId));
  }

  /**
   * Track weekly content delivery
   * Requirements: 16.30
   */
  async trackWeeklyContent(partnerId: string, weekIndex: number): Promise<void> {
    const status = await this.getFoundingPartnerStatus(partnerId);

    if (!status) {
      throw new Error('Partner is not enrolled in Founding Partner Program');
    }

    const weeklyContent = [...status.weeklyContentDelivered];

    // Ensure array is large enough
    while (weeklyContent.length <= weekIndex) {
      weeklyContent.push(0);
    }

    weeklyContent[weekIndex] = (weeklyContent[weekIndex] || 0) + 1;

    await db
      .update(db.schema.foundingPartners)
      .set({
        weeklyContentDelivered: JSON.stringify(weeklyContent),
      })
      .where(eq(db.schema.foundingPartners.partnerId, partnerId));
  }

  /**
   * Issue a warning for missed content commitments
   * Requirements: 16.30
   */
  async issueWarning(partnerId: string, reason: string): Promise<void> {
    const status = await this.getFoundingPartnerStatus(partnerId);

    if (!status) {
      throw new Error('Partner is not enrolled in Founding Partner Program');
    }

    const newWarningCount = status.warningCount + 1;
    const newStatus = newWarningCount >= MAX_WARNINGS ? 'revoked' : 'warning';

    await db
      .update(db.schema.foundingPartners)
      .set({
        warningCount: newWarningCount,
        status: newStatus,
      })
      .where(eq(db.schema.foundingPartners.partnerId, partnerId));

    console.log(`Warning issued to founding partner ${partnerId}: ${reason}`);
    console.log(`Warning count: ${newWarningCount}/${MAX_WARNINGS}`);

    if (newStatus === 'revoked') {
      console.log(
        `Founding Partner status REVOKED for ${partnerId} after ${MAX_WARNINGS} warnings`,
      );
      await this.revokeFoundingStatus(partnerId);
    }
  }

  /**
   * Revoke founding partner status
   * Requirements: 16.30
   */
  async revokeFoundingStatus(partnerId: string): Promise<void> {
    await db
      .update(db.schema.foundingPartners)
      .set({
        status: 'revoked',
      })
      .where(eq(db.schema.foundingPartners.partnerId, partnerId));

    console.log(`Founding Partner status revoked for ${partnerId}`);

    // TODO: Remove Featured tier subscription
    // TODO: Remove founding badge
    // TODO: Notify partner of revocation
  }

  /**
   * Get all active founding partners
   * Requirements: 16.25
   */
  async getActiveFoundingPartners(): Promise<FoundingPartner[]> {
    const results = await db.query.foundingPartners.findMany({
      where: (fp, { eq }: any) => eq(fp.status, 'active'),
    });

    return results.map(r => {
      let weeklyContentDelivered: number[] = [];
      try {
        weeklyContentDelivered = JSON.parse(r.weeklyContentDelivered as string);
      } catch (e) {
        weeklyContentDelivered = [];
      }

      return {
        partnerId: r.partnerId,
        enrollmentDate: r.enrollmentDate,
        benefitsEndDate: r.benefitsEndDate,
        preLaunchContentDelivered: r.preLaunchContentDelivered,
        weeklyContentDelivered,
        warningCount: r.warningCount,
        status: r.status as FoundingPartner['status'],
        createdAt: r.createdAt,
      };
    });
  }

  /**
   * Get founding partners count
   * Requirements: 16.29
   */
  async getFoundingPartnersCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(db.schema.foundingPartners);

    return result[0]?.count || 0;
  }

  /**
   * Check all founding partners for commitment compliance
   * and issue warnings as needed
   * Requirements: 16.30
   */
  async checkAllCommitments(): Promise<void> {
    const activePartners = await this.getActiveFoundingPartners();

    for (const partner of activePartners) {
      const commitment = await this.checkContentCommitment(partner.partnerId);

      if (!commitment.isCompliant) {
        const reasons: string[] = [];

        if (!commitment.preLaunchMet) {
          reasons.push(
            `Pre-launch commitment not met: ${commitment.preLaunchProgress.delivered}/${commitment.preLaunchProgress.required}`,
          );
        }

        if (!commitment.weeklyMet) {
          reasons.push(
            `Weekly commitment not met: ${commitment.weeklyProgress.delivered}/${commitment.weeklyProgress.required}`,
          );
        }

        if (reasons.length > 0 && partner.warningCount < MAX_WARNINGS) {
          await this.issueWarning(partner.partnerId, reasons.join('; '));
        }
      }
    }
  }

  /**
   * Get current week index since enrollment
   * Requirements: 16.30
   */
  getCurrentWeekIndex(enrollmentDate: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - enrollmentDate.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return diffWeeks;
  }

  /**
   * Get commitment requirements
   * Requirements: 16.30
   */
  getCommitmentRequirements(): ContentCommitment {
    return {
      preLaunch: {
        required: PRE_LAUNCH_COMMITMENT_MIN,
        delivered: 0,
      },
      weekly: {
        required: WEEKLY_COMMITMENT,
        delivered: 0,
      },
    };
  }
}

export const foundingPartnerService = new FoundingPartnerService();
