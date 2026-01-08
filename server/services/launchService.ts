import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";

/**
 * Launch Service
 * 
 * Manages the phased launch process for the Explore Partner Marketplace.
 * Tracks launch phases, content quotas, and metrics to ensure successful
 * cold start and ecosystem maturity.
 * 
 * Requirements: 16.13, 16.19
 */

export interface LaunchPhase {
  id: string;
  phase: 'pre_launch' | 'launch_period' | 'ramp_up' | 'ecosystem_maturity';
  startDate: Date;
  endDate?: Date;
  primaryContentRatio: number; // 0.80 for launch, 0.70 for maturity
  algorithmWeight: number;     // 0.0 for launch, 0.50 for ramp-up, 1.0 for maturity
  editorialWeight: number;     // 1.0 for launch, 0.50 for ramp-up, 0.0 for maturity
  isActive: boolean;
  createdAt: Date;
}

export interface LaunchContentQuota {
  id: string;
  contentType: string;
  requiredCount: number;
  currentCount: number;
  lastUpdated: Date;
}

export interface LaunchMetrics {
  id: string;
  metricDate: Date;
  topicEngagementRate: number;    // Target: 60%
  partnerContentWatchRate: number; // Target: 40%
  saveShareRate: number;           // Target: 30%
  weeklyVisitsPerUser: number;     // Target: 3+
  algorithmConfidenceScore: number; // Target: 75%
  createdAt: Date;
}

export interface LaunchReadinessResult {
  isReady: boolean;
  quotasMet: boolean;
  quotaDetails: {
    contentType: string;
    required: number;
    current: number;
    met: boolean;
  }[];
  missingQuotas: string[];
  totalContentCount: number;
  requiredContentCount: number;
}

export interface PhaseTransitionResult {
  success: boolean;
  previousPhase: string;
  newPhase: string;
  message: string;
}

class LaunchService {
  /**
   * Get the current active launch phase
   * Requirements: 16.13
   */
  async getCurrentPhase(): Promise<LaunchPhase | null> {
    const result = await db.query.launchPhases.findFirst({
      where: (phases, { eq }) => eq(phases.isActive, true),
      orderBy: (phases, { desc }) => [desc(phases.startDate)]
    });

    if (!result) return null;

    return {
      id: result.id,
      phase: result.phase as LaunchPhase['phase'],
      startDate: result.startDate,
      endDate: result.endDate || undefined,
      primaryContentRatio: Number(result.primaryContentRatio),
      algorithmWeight: Number(result.algorithmWeight),
      editorialWeight: Number(result.editorialWeight),
      isActive: result.isActive,
      createdAt: result.createdAt
    };
  }

  /**
   * Get phase configuration for a specific phase
   * Requirements: 16.19
   */
  getPhaseConfiguration(phase: string): LaunchPhase {
    const configs: Record<string, Omit<LaunchPhase, 'id' | 'startDate' | 'endDate' | 'isActive' | 'createdAt'>> = {
      pre_launch: {
        phase: 'pre_launch',
        primaryContentRatio: 0.80,
        algorithmWeight: 0.0,
        editorialWeight: 1.0
      },
      launch_period: {
        phase: 'launch_period',
        primaryContentRatio: 0.80,
        algorithmWeight: 0.0,
        editorialWeight: 1.0
      },
      ramp_up: {
        phase: 'ramp_up',
        primaryContentRatio: 0.70,
        algorithmWeight: 0.50,
        editorialWeight: 0.50
      },
      ecosystem_maturity: {
        phase: 'ecosystem_maturity',
        primaryContentRatio: 0.70,
        algorithmWeight: 1.0,
        editorialWeight: 0.0
      }
    };

    const config = configs[phase];
    if (!config) {
      throw new Error(`Unknown phase: ${phase}`);
    }

    return {
      ...config,
      id: '',
      startDate: new Date(),
      isActive: false,
      createdAt: new Date()
    };
  }

  /**
   * Check if all launch readiness criteria are met
   * Requirements: 16.6
   */
  async checkLaunchReadiness(): Promise<LaunchReadinessResult> {
    const quotas = await this.getContentQuotas();
    
    const quotaDetails = quotas.map(quota => ({
      contentType: quota.contentType,
      required: quota.requiredCount,
      current: quota.currentCount,
      met: quota.currentCount >= quota.requiredCount
    }));

    const missingQuotas = quotaDetails
      .filter(q => !q.met)
      .map(q => `${q.contentType}: ${q.current}/${q.required}`);

    const totalContentCount = quotaDetails.reduce((sum, q) => sum + q.current, 0);
    const requiredContentCount = quotaDetails.reduce((sum, q) => sum + q.required, 0);
    const quotasMet = missingQuotas.length === 0;

    return {
      isReady: quotasMet && totalContentCount >= 200,
      quotasMet,
      quotaDetails,
      missingQuotas,
      totalContentCount,
      requiredContentCount
    };
  }

  /**
   * Get all content quotas with current progress
   * Requirements: 16.3, 16.5
   */
  async getContentQuotas(): Promise<LaunchContentQuota[]> {
    const results = await db.query.launchContentQuotas.findMany({
      orderBy: (quotas, { asc }) => [asc(quotas.contentType)]
    });

    return results.map(r => ({
      id: r.id,
      contentType: r.contentType,
      requiredCount: r.requiredCount,
      currentCount: r.currentCount,
      lastUpdated: r.lastUpdated
    }));
  }

  /**
   * Get launch metrics for a specific date or latest
   * Requirements: 16.17, 16.22, 16.31
   */
  async getLaunchMetrics(date?: Date): Promise<LaunchMetrics | null> {
    let result;
    
    if (date) {
      result = await db.query.launchMetrics.findFirst({
        where: (metrics, { eq }) => eq(metrics.metricDate, date)
      });
    } else {
      result = await db.query.launchMetrics.findFirst({
        orderBy: (metrics, { desc }) => [desc(metrics.metricDate)]
      });
    }

    if (!result) return null;

    return {
      id: result.id,
      metricDate: result.metricDate,
      topicEngagementRate: Number(result.topicEngagementRate || 0),
      partnerContentWatchRate: Number(result.partnerContentWatchRate || 0),
      saveShareRate: Number(result.saveShareRate || 0),
      weeklyVisitsPerUser: Number(result.weeklyVisitsPerUser || 0),
      algorithmConfidenceScore: Number(result.algorithmConfidenceScore || 0),
      createdAt: result.createdAt
    };
  }

  /**
   * Transition to a new launch phase
   * Requirements: 16.13, 16.19
   */
  async transitionPhase(newPhase: string): Promise<PhaseTransitionResult> {
    const currentPhase = await this.getCurrentPhase();
    const config = this.getPhaseConfiguration(newPhase);

    // Deactivate current phase
    if (currentPhase) {
      await db.update(db.schema.launchPhases)
        .set({ 
          isActive: false,
          endDate: new Date()
        })
        .where(eq(db.schema.launchPhases.id, currentPhase.id));
    }

    // Create new phase
    const newPhaseId = crypto.randomUUID();
    await db.insert(db.schema.launchPhases).values({
      id: newPhaseId,
      phase: config.phase,
      startDate: new Date(),
      primaryContentRatio: config.primaryContentRatio.toString(),
      algorithmWeight: config.algorithmWeight.toString(),
      editorialWeight: config.editorialWeight.toString(),
      isActive: true
    });

    return {
      success: true,
      previousPhase: currentPhase?.phase || 'none',
      newPhase: config.phase,
      message: `Successfully transitioned from ${currentPhase?.phase || 'none'} to ${config.phase}`
    };
  }

  /**
   * Trigger Cold Start Recovery Mode
   * Increases editorial curation when metrics underperform
   * Requirements: 16.32
   */
  async triggerRecoveryMode(): Promise<void> {
    const currentPhase = await this.getCurrentPhase();
    
    if (!currentPhase) {
      throw new Error('No active phase found');
    }

    // Increase editorial weight, decrease algorithm weight
    const recoveryEditorialWeight = Math.min(currentPhase.editorialWeight + 0.2, 1.0);
    const recoveryAlgorithmWeight = Math.max(currentPhase.algorithmWeight - 0.2, 0.0);

    await db.update(db.schema.launchPhases)
      .set({
        editorialWeight: recoveryEditorialWeight.toString(),
        algorithmWeight: recoveryAlgorithmWeight.toString()
      })
      .where(eq(db.schema.launchPhases.id, currentPhase.id));

    console.log(`Recovery mode activated: Editorial ${recoveryEditorialWeight}, Algorithm ${recoveryAlgorithmWeight}`);
  }

  /**
   * Update content quota count
   * Requirements: 16.3, 16.5
   */
  async updateContentQuota(contentType: string, count: number): Promise<void> {
    await db.update(db.schema.launchContentQuotas)
      .set({
        currentCount: count,
        lastUpdated: new Date()
      })
      .where(eq(db.schema.launchContentQuotas.contentType, contentType));
  }

  /**
   * Increment content quota count
   * Requirements: 16.3, 16.5
   */
  async incrementContentQuota(contentType: string): Promise<void> {
    const quota = await db.query.launchContentQuotas.findFirst({
      where: (quotas, { eq }) => eq(quotas.contentType, contentType)
    });

    if (quota) {
      await this.updateContentQuota(contentType, quota.currentCount + 1);
    }
  }

  /**
   * Record launch metrics for a specific date
   * Requirements: 16.17, 16.22, 16.31
   */
  async recordLaunchMetrics(metrics: {
    metricDate: Date;
    topicEngagementRate: number;
    partnerContentWatchRate: number;
    saveShareRate: number;
    weeklyVisitsPerUser: number;
    algorithmConfidenceScore: number;
  }): Promise<void> {
    const id = crypto.randomUUID();
    
    await db.insert(db.schema.launchMetrics).values({
      id,
      metricDate: metrics.metricDate,
      topicEngagementRate: metrics.topicEngagementRate.toString(),
      partnerContentWatchRate: metrics.partnerContentWatchRate.toString(),
      saveShareRate: metrics.saveShareRate.toString(),
      weeklyVisitsPerUser: metrics.weeklyVisitsPerUser.toString(),
      algorithmConfidenceScore: metrics.algorithmConfidenceScore.toString()
    });
  }

  /**
   * Check if metrics are underperforming and trigger recovery if needed
   * Requirements: 16.32
   */
  async checkMetricsAndRecover(): Promise<boolean> {
    const metrics = await this.getLaunchMetrics();
    
    if (!metrics) return false;

    const targets = {
      topicEngagementRate: 60,
      partnerContentWatchRate: 40,
      saveShareRate: 30,
      weeklyVisitsPerUser: 3
    };

    const underperforming = [
      { name: 'Topic Engagement', value: metrics.topicEngagementRate, target: targets.topicEngagementRate },
      { name: 'Partner Content Watch', value: metrics.partnerContentWatchRate, target: targets.partnerContentWatchRate },
      { name: 'Save/Share', value: metrics.saveShareRate, target: targets.saveShareRate },
      { name: 'Weekly Visits', value: metrics.weeklyVisitsPerUser, target: targets.weeklyVisitsPerUser }
    ].filter(m => m.value < m.target * 0.8); // 20% below target

    if (underperforming.length > 0) {
      console.log('Metrics underperforming:', underperforming);
      await this.triggerRecoveryMode();
      return true;
    }

    return false;
  }
}

export const launchService = new LaunchService();
