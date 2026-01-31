import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import superjson from 'superjson';
import type { TrpcContext } from './context';
import { applyBrandContext, type EnhancedTRPCContext } from './brandContext';

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;

    // Zod v4 can be ZodError, but also sometimes wrapped / different instance
    const isZod =
      cause &&
      typeof cause === 'object' &&
      ('issues' in (cause as any) || cause instanceof ZodError);

    const zodError = isZod
      ? ((cause as any).flatten?.() ?? { formErrors: [], fieldErrors: {} })
      : undefined;

    return {
      ...shape,
      data: {
        ...shape.data,
        // Safe optional payload for client-side display/debugging
        zodError,
        _zod: zodError, // Backwards compatibility for some client versions
        cause: cause ? String((cause as any)?.message ?? cause) : undefined, // safe string
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware: Require authenticated user
 */
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: UNAUTHED_ERR_MSG });
  }

  // Apply brand context for super admin emulator mode
  const enhancedCtx = await applyBrandContext(ctx);

  return next({
    ctx: enhancedCtx,
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Middleware: Require specific role(s)
 * Usage: requireRole(['agent', 'agency_admin'])
 */
export function requireRole(allowedRoles: string[]) {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }

    if (!allowedRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  });
}

/**
 * Middleware: Require super_admin role
 * For platform-level administrative actions
 */
const requireSuperAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  if (ctx.user.role !== 'super_admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message:
        'Super admin privileges required. This action is restricted to platform administrators.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Middleware: Require agency_admin role
 * For agency-level administrative actions
 */
const requireAgencyAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  if (ctx.user.role !== 'agency_admin' && ctx.user.role !== 'super_admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Agency admin privileges required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Middleware: Require agent role (or higher)
 */
const requireAgent = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  const allowedRoles = ['agent', 'agency_admin', 'super_admin'];
  if (!allowedRoles.includes(ctx.user.role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Agent privileges required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Procedure: Super admin only
 */
export const superAdminProcedure = t.procedure.use(requireSuperAdmin);

/**
 * Procedure: Agency admin only (super_admin can also access)
 */
export const agencyAdminProcedure = t.procedure.use(requireAgencyAdmin);

/**
 * Procedure: Agent or higher
 */
export const agentProcedure = t.procedure.use(requireAgent);

/**
 * Legacy admin procedure (for backward compatibility)
 * @deprecated Use superAdminProcedure or agencyAdminProcedure instead
 * Now checks for both super_admin and agency_admin roles
 */
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Support both super_admin and agency_admin roles for backward compatibility
    if (!ctx.user || (ctx.user.role !== 'super_admin' && ctx.user.role !== 'agency_admin')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
