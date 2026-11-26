import { and, eq, like, or, type SQL } from 'drizzle-orm';
import { agencies } from '../../drizzle/schema';
import { escapeLike } from './adminUserView';

/**
 * WHERE conditions for agency.list. Filters narrow the result, so they are AND-ed
 * (they were OR-ed, which widened the list as more filters were added).
 */
export function buildAgencyListWhere(input: {
  search?: string;
  subscriptionPlan?: string;
  isVerified?: boolean;
}): SQL | undefined {
  const conditions: SQL[] = [];
  const search = input.search?.trim();
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    conditions.push(or(like(agencies.name, pattern), like(agencies.email, pattern))!);
  }
  if (input.subscriptionPlan) {
    conditions.push(eq(agencies.subscriptionPlan, input.subscriptionPlan));
  }
  if (input.isVerified !== undefined) {
    conditions.push(eq(agencies.isVerified, input.isVerified ? 1 : 0));
  }
  return conditions.length ? and(...conditions) : undefined;
}
