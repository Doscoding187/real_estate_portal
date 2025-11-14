import { trpc } from '../lib/trpc';

export const useAnalytics = () => trpc.admin.getAnalytics.useQuery();
export const useAgencies = (params?: { status?: string; tier?: string; search?: string }) =>
  trpc.admin.listAgencies.useQuery(params ?? {});
export const useSubscriptions = () => trpc.admin.listSubscriptions.useQuery();
export const useListings = (params?: { status?: string; page?: number; limit?: number }) =>
  trpc.admin.listProperties.useQuery(params ?? {});
export const useUsers = (params?: any) => trpc.admin.listUsers.useQuery(params ?? {});
export const useTickets = () => trpc.admin.listSupportTickets.useQuery();
export const useAuditLogs = (params?: any) => trpc.admin.getAuditLogs.useQuery(params ?? {});
