/**
 * Partner Analytics Service - Usage Examples
 * Demonstrates how to use the partner analytics service
 */

import { partnerAnalyticsService } from './partnerAnalyticsService';

/**
 * Example 1: Get complete analytics dashboard for a partner
 */
async function getPartnerDashboard(partnerId: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Last 30 days

  // Fetch all analytics in parallel
  const [summary, trends, topContent, funnel, benchmarks, boostROI] = await Promise.all([
    partnerAnalyticsService.getPartnerAnalyticsSummary(partnerId, startDate, endDate),
    partnerAnalyticsService.getPerformanceTrends(partnerId, 'daily', startDate, endDate),
    partnerAnalyticsService.getContentRankedByPerformance(partnerId, 5),
    partnerAnalyticsService.getConversionFunnel(partnerId, startDate, endDate),
    partnerAnalyticsService.getTierBenchmarks(),
    partnerAnalyticsService.getBoostCampaignROI(partnerId),
  ]);

  return {
    overview: summary,
    performanceTrends: trends,
    topPerformingContent: topContent,
    conversionFunnel: funnel,
    tierComparison: benchmarks,
    boostCampaigns: boostROI,
  };
}

/**
 * Example 2: Compare partner performance to tier average
 */
async function compareToTierAverage(partnerId: string, tierId: number) {
  const summary = await partnerAnalyticsService.getPartnerAnalyticsSummary(partnerId);
  const benchmarks = await partnerAnalyticsService.getTierBenchmarks();

  const tierBenchmark = benchmarks.find(b => b.tierId === tierId);

  if (!tierBenchmark) {
    throw new Error('Tier not found');
  }

  return {
    partner: {
      views: summary.totalViews,
      engagementRate: summary.engagementRate,
      leadConversions: summary.leadConversions,
    },
    tierAverage: {
      views: tierBenchmark.averageViews,
      engagementRate: tierBenchmark.averageEngagementRate,
      leadConversions: tierBenchmark.averageLeadConversion,
    },
    comparison: {
      viewsVsTier: ((summary.totalViews / tierBenchmark.averageViews) * 100).toFixed(1) + '%',
      engagementVsTier:
        ((summary.engagementRate / tierBenchmark.averageEngagementRate) * 100).toFixed(1) + '%',
      leadsVsTier:
        ((summary.leadConversions / tierBenchmark.averageLeadConversion) * 100).toFixed(1) + '%',
    },
  };
}

/**
 * Example 3: Identify underperforming content
 */
async function identifyUnderperformingContent(partnerId: string) {
  const topContent = await partnerAnalyticsService.getContentRankedByPerformance(partnerId, 100);

  // Calculate median engagement rate
  const sortedByEngagement = [...topContent].sort((a, b) => a.engagementRate - b.engagementRate);
  const medianEngagement =
    sortedByEngagement[Math.floor(sortedByEngagement.length / 2)]?.engagementRate || 0;

  // Find content below median
  const underperforming = topContent.filter(
    content => content.engagementRate < medianEngagement * 0.5, // 50% below median
  );

  return {
    medianEngagementRate: medianEngagement,
    underperformingContent: underperforming.map(content => ({
      id: content.contentId,
      title: content.title,
      engagementRate: content.engagementRate,
      qualityScore: content.qualityScore,
      recommendation:
        content.qualityScore < 50
          ? 'Consider removing or updating this content'
          : 'Content quality is good, try boosting visibility',
    })),
  };
}

/**
 * Example 4: Calculate boost campaign effectiveness
 */
async function analyzeBoostEffectiveness(partnerId: string) {
  const campaigns = await partnerAnalyticsService.getBoostCampaignROI(partnerId);

  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
  const avgROI = campaigns.reduce((sum, c) => sum + c.roi, 0) / campaigns.length;

  const bestCampaign = campaigns.reduce(
    (best, current) => (current.roi > best.roi ? current : best),
    campaigns[0],
  );

  const worstCampaign = campaigns.reduce(
    (worst, current) => (current.roi < worst.roi ? current : worst),
    campaigns[0],
  );

  return {
    summary: {
      totalCampaigns: campaigns.length,
      totalSpent,
      totalLeads,
      averageROI: avgROI.toFixed(2) + '%',
      overallCostPerLead: (totalSpent / totalLeads).toFixed(2),
    },
    bestPerforming: {
      campaignId: bestCampaign.campaignId,
      roi: bestCampaign.roi + '%',
      costPerLead: bestCampaign.costPerLead,
    },
    worstPerforming: {
      campaignId: worstCampaign.campaignId,
      roi: worstCampaign.roi + '%',
      costPerLead: worstCampaign.costPerLead,
    },
    recommendations:
      avgROI < 0
        ? 'Consider pausing boost campaigns and focusing on organic content quality'
        : 'Boost campaigns are profitable, consider increasing budget for top performers',
  };
}

/**
 * Example 5: Generate weekly performance report
 */
async function generateWeeklyReport(partnerId: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const [currentWeek, previousWeek] = await Promise.all([
    partnerAnalyticsService.getPartnerAnalyticsSummary(partnerId, startDate, endDate),
    partnerAnalyticsService.getPartnerAnalyticsSummary(
      partnerId,
      new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      startDate,
    ),
  ]);

  const viewsChange =
    ((currentWeek.totalViews - previousWeek.totalViews) / previousWeek.totalViews) * 100;
  const engagementChange = currentWeek.engagementRate - previousWeek.engagementRate;
  const leadsChange =
    ((currentWeek.totalLeads - previousWeek.totalLeads) / previousWeek.totalLeads) * 100;

  return {
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    metrics: {
      views: {
        current: currentWeek.totalViews,
        previous: previousWeek.totalViews,
        change: viewsChange.toFixed(1) + '%',
        trend: viewsChange > 0 ? 'up' : 'down',
      },
      engagementRate: {
        current: currentWeek.engagementRate + '%',
        previous: previousWeek.engagementRate + '%',
        change: engagementChange.toFixed(2) + ' points',
        trend: engagementChange > 0 ? 'up' : 'down',
      },
      leads: {
        current: currentWeek.totalLeads,
        previous: previousWeek.totalLeads,
        change: leadsChange.toFixed(1) + '%',
        trend: leadsChange > 0 ? 'up' : 'down',
      },
    },
  };
}

/**
 * Example 6: Optimize content strategy based on analytics
 */
async function getContentStrategyRecommendations(partnerId: string) {
  const [topContent, funnel, summary] = await Promise.all([
    partnerAnalyticsService.getContentRankedByPerformance(partnerId, 20),
    partnerAnalyticsService.getConversionFunnel(partnerId),
    partnerAnalyticsService.getPartnerAnalyticsSummary(partnerId),
  ]);

  // Analyze content types
  const contentByType = topContent.reduce(
    (acc, content) => {
      acc[content.type] = acc[content.type] || { count: 0, totalViews: 0, totalEngagements: 0 };
      acc[content.type].count++;
      acc[content.type].totalViews += content.views;
      acc[content.type].totalEngagements += content.engagements;
      return acc;
    },
    {} as Record<string, { count: number; totalViews: number; totalEngagements: number }>,
  );

  const recommendations = [];

  // Recommendation 1: Content type focus
  const bestType = Object.entries(contentByType).reduce((best, [type, data]) => {
    const avgEngagement = data.totalEngagements / data.totalViews;
    const bestAvg = best.data.totalEngagements / best.data.totalViews;
    return avgEngagement > bestAvg ? { type, data } : best;
  });
  recommendations.push(`Focus on ${bestType.type} content - it has the highest engagement rate`);

  // Recommendation 2: Conversion optimization
  if (funnel.viewToEngagementRate < 10) {
    recommendations.push('Engagement rate is low. Consider improving content quality and CTAs');
  }
  if (funnel.engagementToLeadRate < 5) {
    recommendations.push('Lead conversion is low. Review your lead capture forms and offers');
  }

  // Recommendation 3: Content volume
  if (summary.totalContent < 10) {
    recommendations.push('Increase content volume to improve visibility and reach');
  }

  // Recommendation 4: Quality focus
  if (summary.averageQualityScore < 60) {
    recommendations.push('Focus on improving content quality - current average is below target');
  }

  return {
    currentStrategy: {
      totalContent: summary.totalContent,
      contentMix: Object.entries(contentByType).map(([type, data]) => ({
        type,
        count: data.count,
        percentage: ((data.count / topContent.length) * 100).toFixed(1) + '%',
      })),
      averageQuality: summary.averageQualityScore,
    },
    performance: {
      viewToEngagement: funnel.viewToEngagementRate + '%',
      engagementToLead: funnel.engagementToLeadRate + '%',
      overallConversion: funnel.overallConversionRate + '%',
    },
    recommendations,
  };
}

// Export examples
export const examples = {
  getPartnerDashboard,
  compareToTierAverage,
  identifyUnderperformingContent,
  analyzeBoostEffectiveness,
  generateWeeklyReport,
  getContentStrategyRecommendations,
};
