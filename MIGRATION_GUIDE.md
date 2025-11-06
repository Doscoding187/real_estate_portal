# Migration Guide: Manus OAuth → Custom Authentication

This guide documents how to migrate from Manus AI OAuth to a custom authentication system that you fully control.

## Overview

**What We're Replacing:**
- Manus OAuth server calls
- `openId` as user identifier
- Manus SDK dependencies
- Manus OAuth callback endpoint

**What We're Creating:**
- Email/Password authentication
- Custom JWT session tokens
- User registration and login endpoints
- Password hashing (bcrypt)
- Optional: Social login (Google, GitHub, etc.)

## Migration Steps

### Step 1: Install New Dependencies

```bash
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

These are for password hashing.

### Step 2: Update Database Schema

The `users` table already has `openId` field. We'll keep it for backward compatibility but add new fields:

```sql
-- Add these fields to users table:
ALTER TABLE users ADD COLUMN email VARCHAR(320) UNIQUE;
ALTER TABLE users ADD COLUMN passwordHash VARCHAR(255);
ALTER TABLE users ADD COLUMN emailVerified INT DEFAULT 0;
```

Or update `drizzle/schema.ts` and run `pnpm db:push`.

### Step 3: Create New Authentication Files

We'll create:
- `server/_core/auth.ts` - Custom auth service (replaces SDK)
- `server/routers/auth.ts` - Registration/login endpoints
- Update `server/_core/oauth.ts` → rename to handle custom auth

### Step 4: Replace Manus SDK References

Files to update:
- `server/_core/sdk.ts` → Replace with custom auth service
- `server/_core/context.ts` → Update to use new auth
- `server/_core/oauth.ts` → Replace OAuth callback with custom login
- `server/_core/env.ts` → Remove Manus env vars, add new ones

### Step 5: Update Frontend

- Replace `ManusDialog.tsx` with custom login form
- Update `useAuth.ts` if needed
- Remove Manus-related UI components

### Step 6: Environment Variables

Remove:
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`

Add:
- `JWT_SECRET` (you should already have this)
- `BCRYPT_ROUNDS=10` (optional, for password hashing)

## Files That Need Changes

### Backend Files:
1. `server/_core/sdk.ts` - Replace entire file
2. `server/_core/oauth.ts` - Replace OAuth routes with custom auth
3. `server/_core/context.ts` - Update auth verification
4. `server/_core/env.ts` - Remove Manus env vars
5. `server/routers.ts` - Add registration/login endpoints
6. `drizzle/schema.ts` - Add password/email fields

### Frontend Files:
1. `client/src/components/ManusDialog.tsx` - Replace with LoginForm
2. `client/src/const.ts` - Update login URL function
3. `client/src/_core/hooks/useAuth.ts` - Minor updates (optional)

### Config Files:
1. `vite.config.ts` - Remove Manus plugin (optional)
2. `.env` - Update environment variables

## Post-Migration Benefits

✅ **Full Control**: You own the authentication system
✅ **No External Dependencies**: No reliance on Manus OAuth server
✅ **Flexible**: Easy to add features (email verification, 2FA, etc.)
✅ **Portable**: Works anywhere, easy to migrate/deploy
✅ **Customizable**: Add social login later if needed

## Next Steps After Migration

1. **Add Email Verification** (optional)
2. **Password Reset Flow** (forgot password)
3. **Social Login** (Google, GitHub, etc.) using Passport.js
4. **Two-Factor Authentication** (2FA)
5. **Account Management** (change password, update profile)

## Testing Checklist

After migration, test:
- [ ] User registration
- [ ] User login
- [ ] Session persistence (cookie works)
- [ ] Protected routes require auth
- [ ] Logout works correctly
- [ ] Existing users (if migrating data) still work

## Rollback Plan

If you need to rollback:
1. Git commit before migration
2. Keep old Manus files backed up
3. Restore environment variables
4. Revert database schema changes

---

**Note**: This migration maintains backward compatibility where possible. Existing sessions using Manus will stop working after migration, but users can re-register with email/password.

