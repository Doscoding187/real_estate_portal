export * from './core';
export * from './agencies';
export * from './locations';
export * from './googlePlacesMonitoring';
export * from './billing';
export * from './partners';
export * from './listings';
export * from './developments';
export * from './media';
export * from './explore';
export * from './marketplace';
export * from './distribution';
export * from './analytics';
export * from './leads';
export * from './agencyDeals';
export * from './servicesEngine';
export * from './demand';
export * from './referrals';
export * from './canvassing';
export * from './listingPerformance';

// Type helpers (schema surface)
import type { users, auditLogs } from './core';

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
