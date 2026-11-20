import { trpc } from '@/lib/trpc';

/**
 * Real pending-work counts for the sidebar badges. Reuses the dashboard queries, so the
 * query cache serves both. A failed or loading query yields no badge (never a made-up zero).
 */
export function useAdminQueueCounts(): { payments?: number; approvals?: number } {
  const launch = trpc.admin.getLaunchDashboardStats.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const actions = trpc.admin.getAdminActionItems.useQuery(undefined, { refetchInterval: 30000 });
  const approvals = actions.data
    ? actions.data.pendingAgentApprovals +
      actions.data.pendingListingApprovals +
      actions.data.pendingDevelopmentApprovals
    : undefined;
  return { payments: launch.data?.eftAwaitingReview, approvals };
}
