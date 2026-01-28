import { foundingPartnerService } from './foundingPartnerService';
import { launchService } from './launchService';
import { contentQuotaService } from './contentQuotaService';

/**
 * Founding Partner Content Tracker
 *
 * Integrates with content approval service to automatically track
 * founding partner content commitments and update quotas.
 *
 * Requirements: 16.30
 */

export interface ContentTrackingResult {
  tracked: boolean;
  isFoundingPartner: boolean;
  isPreLaunch: boolean;
  preLaunchCount?: number;
  weeklyCount?: number;
  weekIndex?: number;
  quotaUpdated: boolean;
}

class FoundingPartnerContentTracker {
  /**
   * Track content approval for founding partners
   * Automatically updates pre-launch or weekly content counts
   * Requirements: 16.30
   */
  async trackContentApproval(
    partnerId: string,
    contentId: string,
    contentType: string,
  ): Promise<ContentTrackingResult> {
    // Check if partner is a founding partner
    const isFoundingPartner = await foundingPartnerService.isFoundingPartner(partnerId);

    if (!isFoundingPartner) {
      return {
        tracked: false,
        isFoundingPartner: false,
        isPreLaunch: false,
        quotaUpdated: false,
      };
    }

    // Get current launch phase
    const currentPhase = await launchService.getCurrentPhase();
    const isPreLaunch = currentPhase?.phase === 'pre_launch';

    // Get founding partner status
    const status = await foundingPartnerService.getFoundingPartnerStatus(partnerId);

    if (!status) {
      return {
        tracked: false,
        isFoundingPartner: true,
        isPreLaunch,
        quotaUpdated: false,
      };
    }

    let preLaunchCount: number | undefined;
    let weeklyCount: number | undefined;
    let weekIndex: number | undefined;

    // Track based on launch phase
    if (isPreLaunch) {
      // Track pre-launch content
      await foundingPartnerService.trackPreLaunchContent(partnerId);
      preLaunchCount = status.preLaunchContentDelivered + 1;

      console.log(
        `Tracked pre-launch content for founding partner ${partnerId}: ` +
          `${preLaunchCount}/5-10 pieces`,
      );
    } else {
      // Track weekly content
      weekIndex = foundingPartnerService.getCurrentWeekIndex(status.enrollmentDate);
      await foundingPartnerService.trackWeeklyContent(partnerId, weekIndex);

      const updatedStatus = await foundingPartnerService.getFoundingPartnerStatus(partnerId);
      weeklyCount = updatedStatus?.weeklyContentDelivered[weekIndex] || 0;

      console.log(
        `Tracked weekly content for founding partner ${partnerId}: ` +
          `Week ${weekIndex}, Count: ${weeklyCount}`,
      );
    }

    // Update launch content quotas
    let quotaUpdated = false;
    try {
      await contentQuotaService.trackContentCreation(contentType, partnerId);
      quotaUpdated = true;
    } catch (error) {
      console.error(`Failed to update quota for content type ${contentType}:`, error);
    }

    return {
      tracked: true,
      isFoundingPartner: true,
      isPreLaunch,
      preLaunchCount,
      weeklyCount,
      weekIndex,
      quotaUpdated,
    };
  }

  /**
   * Check commitment status and issue warnings if needed
   * Should be called periodically (e.g., weekly)
   * Requirements: 16.30
   */
  async checkCommitmentsAndWarn(): Promise<{
    checked: number;
    warned: number;
    revoked: number;
  }> {
    const activePartners = await foundingPartnerService.getActiveFoundingPartners();
    let warned = 0;
    let revoked = 0;

    for (const partner of activePartners) {
      const commitment = await foundingPartnerService.checkContentCommitment(partner.partnerId);

      // Only warn if not already at max warnings
      if (!commitment.isCompliant && partner.warningCount < 2) {
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

        if (reasons.length > 0) {
          await foundingPartnerService.issueWarning(partner.partnerId, reasons.join('; '));
          warned++;

          // Check if this warning caused revocation
          const updatedStatus = await foundingPartnerService.getFoundingPartnerStatus(
            partner.partnerId,
          );
          if (updatedStatus?.status === 'revoked') {
            revoked++;
          }
        }
      }
    }

    return {
      checked: activePartners.length,
      warned,
      revoked,
    };
  }

  /**
   * Get commitment progress summary for a founding partner
   * Requirements: 16.30
   */
  async getCommitmentProgress(partnerId: string): Promise<{
    isFoundingPartner: boolean;
    commitment?: {
      preLaunch: {
        required: number;
        delivered: number;
        percentComplete: number;
        isMet: boolean;
      };
      weekly: {
        requiredPerWeek: number;
        totalRequired: number;
        totalDelivered: number;
        averagePerWeek: number;
        isMet: boolean;
      };
      overall: {
        isCompliant: boolean;
        warningCount: number;
        maxWarnings: number;
        status: string;
      };
    };
  }> {
    const isFoundingPartner = await foundingPartnerService.isFoundingPartner(partnerId);

    if (!isFoundingPartner) {
      return { isFoundingPartner: false };
    }

    const status = await foundingPartnerService.getFoundingPartnerStatus(partnerId);
    const commitmentStatus = await foundingPartnerService.checkContentCommitment(partnerId);

    if (!status) {
      return { isFoundingPartner: true };
    }

    const weeksActive = Math.floor(
      (Date.now() - status.enrollmentDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );

    const totalWeeklyDelivered = status.weeklyContentDelivered.reduce(
      (sum, count) => sum + count,
      0,
    );
    const averagePerWeek = weeksActive > 0 ? totalWeeklyDelivered / weeksActive : 0;

    return {
      isFoundingPartner: true,
      commitment: {
        preLaunch: {
          required: commitmentStatus.preLaunchProgress.required,
          delivered: commitmentStatus.preLaunchProgress.delivered,
          percentComplete: Math.round(
            (commitmentStatus.preLaunchProgress.delivered /
              commitmentStatus.preLaunchProgress.required) *
              100,
          ),
          isMet: commitmentStatus.preLaunchMet,
        },
        weekly: {
          requiredPerWeek: 2,
          totalRequired: commitmentStatus.weeklyProgress.required,
          totalDelivered: commitmentStatus.weeklyProgress.delivered,
          averagePerWeek: Math.round(averagePerWeek * 10) / 10,
          isMet: commitmentStatus.weeklyMet,
        },
        overall: {
          isCompliant: commitmentStatus.isCompliant,
          warningCount: commitmentStatus.warningCount,
          maxWarnings: 2,
          status: status.status,
        },
      },
    };
  }

  /**
   * Get weekly content breakdown for a founding partner
   * Requirements: 16.30
   */
  async getWeeklyBreakdown(partnerId: string): Promise<{
    weeks: {
      weekIndex: number;
      startDate: Date;
      endDate: Date;
      contentDelivered: number;
      required: number;
      isMet: boolean;
    }[];
  } | null> {
    const status = await foundingPartnerService.getFoundingPartnerStatus(partnerId);

    if (!status) {
      return null;
    }

    const currentWeekIndex = foundingPartnerService.getCurrentWeekIndex(status.enrollmentDate);
    const weeks = [];

    for (let i = 0; i <= currentWeekIndex; i++) {
      const weekStart = new Date(status.enrollmentDate);
      weekStart.setDate(weekStart.getDate() + i * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const contentDelivered = status.weeklyContentDelivered[i] || 0;

      weeks.push({
        weekIndex: i,
        startDate: weekStart,
        endDate: weekEnd,
        contentDelivered,
        required: 2,
        isMet: contentDelivered >= 2,
      });
    }

    return { weeks };
  }

  /**
   * Send reminder to founding partners about commitments
   * Requirements: 16.30
   */
  async sendCommitmentReminders(): Promise<{
    sent: number;
    failed: number;
  }> {
    const activePartners = await foundingPartnerService.getActiveFoundingPartners();
    let sent = 0;
    let failed = 0;

    for (const partner of activePartners) {
      try {
        const progress = await this.getCommitmentProgress(partner.partnerId);

        if (progress.commitment && !progress.commitment.overall.isCompliant) {
          // TODO: Send email reminder
          console.log(`Reminder sent to founding partner ${partner.partnerId}`);
          console.log(
            `Pre-launch: ${progress.commitment.preLaunch.delivered}/${progress.commitment.preLaunch.required}`,
          );
          console.log(
            `Weekly: ${progress.commitment.weekly.totalDelivered}/${progress.commitment.weekly.totalRequired}`,
          );
          sent++;
        }
      } catch (error) {
        console.error(`Failed to send reminder to ${partner.partnerId}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Get all founding partners with commitment issues
   * Requirements: 16.30
   */
  async getPartnersWithCommitmentIssues(): Promise<
    {
      partnerId: string;
      issues: string[];
      warningCount: number;
      status: string;
    }[]
  > {
    const activePartners = await foundingPartnerService.getActiveFoundingPartners();
    const partnersWithIssues = [];

    for (const partner of activePartners) {
      const commitment = await foundingPartnerService.checkContentCommitment(partner.partnerId);

      if (!commitment.isCompliant) {
        const issues: string[] = [];

        if (!commitment.preLaunchMet) {
          issues.push(
            `Pre-launch: ${commitment.preLaunchProgress.delivered}/${commitment.preLaunchProgress.required}`,
          );
        }

        if (!commitment.weeklyMet) {
          issues.push(
            `Weekly: ${commitment.weeklyProgress.delivered}/${commitment.weeklyProgress.required}`,
          );
        }

        partnersWithIssues.push({
          partnerId: partner.partnerId,
          issues,
          warningCount: partner.warningCount,
          status: partner.status,
        });
      }
    }

    return partnersWithIssues;
  }
}

export const foundingPartnerContentTracker = new FoundingPartnerContentTracker();
