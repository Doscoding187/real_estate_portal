export type AuthUser = {
  id: number;
  role?: string | null;
  email?: string | null;
  name?: string | null;
  agencyId?: number | null;
  [key: string]: unknown;
};

export function requireUser(ctx: { user?: AuthUser | null }): AuthUser {
  const u = ctx.user;
  if (!u) throw new Error('UNAUTHORIZED');
  if (typeof u.id !== 'number') throw new Error('UNAUTHORIZED');
  return u;
}
