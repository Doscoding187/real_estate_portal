import { trpc } from '@/lib/trpc';

/**
 * After an approve/reject/review, refresh everything that counts pending work so the
 * sidebar badges, the dashboard inbox and the pulse figures never show a stale queue.
 */
export function useInvalidateAdminQueues(): () => void {
  const utils = trpc.useUtils();
  return () => {
    void utils.admin.getAdminActionItems.invalidate();
    void utils.admin.getLaunchDashboardStats.invalidate();
    void utils.admin.getDailyInbox.invalidate();
  };
}
