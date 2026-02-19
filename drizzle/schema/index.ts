export * from './core';
export * from './agencies';
export * from './locations';
export * from './billing';
export * from './listings';
export * from './developments';
export * from './media';
export * from './explore';
export * from './marketplace';
export * from './views';
export * from './analytics';
export * from './leads';

// Type helpers (schema surface)
import type { users, auditLogs } from './core';

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
