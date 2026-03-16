# Agent Onboarding v2 Production Rollout

## 1) Deploy backend first (blocker)
- Deploy the commit that includes `server/migrations/runSqlMigrations.ts` parser hardening.
- Print the DB target first, then run self-check:

```bash
pnpm migration:sql:selfcheck:onboarding:safe:production
```

This runs SQL migrations and fails if required onboarding columns/indexes are missing.

## 2) Verify schema in production DB

```sql
-- users trial fields
SELECT column_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'users'
  AND column_name IN ('plan', 'trialStatus', 'trialStartedAt', 'trialEndsAt');

-- agents onboarding fields
SELECT column_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'agents'
  AND column_name IN ('slug', 'profileCompletionScore', 'profileCompletionFlags', 'email');

-- agents slug indexes
SELECT index_name
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'agents'
  AND index_name IN ('uq_agents_slug', 'idx_agents_slug');
```

## 3) One-time legacy normalization
- `approvedBy` is an integer FK in this schema. Use `NULL`, not `'system'`.

```sql
UPDATE agents a
JOIN users u ON u.id = a.userId
SET a.status = 'approved',
    a.approvedAt = NOW(),
    a.approvedBy = NULL
WHERE a.status = 'pending'
  AND u.emailVerified = 1;
```

## 4) Prod smoke test
- Register agent
- Verify email (redirect should land on `/onboarding/agent-profile?verified=true`)
- Save wizard progress
- Publish profile
- Open public profile `/agents/:slug`
- Validate resend verification cooldown behavior
- Validate listing submit-for-review is server-side blocked when `canPublishListings=false`

## 5) Deliverability checks
- Validate verification email delivery on:
  - Gmail
  - Outlook/Hotmail
  - One corporate inbox
- Confirm links point to production `APP_URL` and not localhost.
