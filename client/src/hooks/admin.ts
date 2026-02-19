import { trpc } from '../lib/trpc';

export const useAnalytics = () => trpc.admin.getAnalytics.useQuery();
export const useAgencies = (params?: any) => trpc.admin.listAgencies.useQuery(params ?? {});
export const useSubscriptions = () => trpc.admin.getRevenueAnalytics.useQuery();
export const useListings = (params?: any) => trpc.admin.listProperties.useQuery(params ?? {});
export const useUsers = (params?: any) => trpc.admin.listUsers.useQuery(params ?? {});
export const useTickets = () => trpc.admin.getAdminActionItems.useQuery();
export const useAuditLogs = (params?: any) =>
  trpc.admin.getDevelopmentAuditLogs.useQuery({
    developmentId: Number(params?.developmentId ?? 0),
    limit: params?.limit,
    offset: params?.offset,
  });
