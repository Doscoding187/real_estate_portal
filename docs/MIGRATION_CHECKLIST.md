# Migration Checklist

This checklist ensures safe database migrations and prevents schema drift.

## Pre-Migration

- [ ] Confirm `DATABASE_URL` points to the correct environment
  - Development: `listify_property_sa`
  - Staging: staging database
  - Production: production database

- [ ] Backup current database (if production)

  ```bash
  # TiDB Cloud: Use console to create snapshot
  # Or export via mysqldump
  ```

- [ ] Review migration files in `drizzle/migrations/`
  - Check for breaking changes
  - Verify enum values match expectations
  - Confirm foreign key relationships

## Migration Execution

1. **Run Migrations**

   ```bash
   pnpm db:push
   ```

2. **Verify Contract**

   ```bash
   pnpm db:verify
   ```

   Expected output:

   ```
   ✅ All contract checks passed!
   ```

3. **Run Integration Tests**
   ```bash
   pnpm test:integration
   ```

## Post-Migration Verification

- [ ] Verify critical tables exist:
  - `developments`
  - `unit_types`
  - `agent_memory`
  - `agent_tasks`
  - `agent_knowledge`

- [ ] Verify enum values are correct:
  - `developments.status` → `['launching-soon', 'selling', 'sold-out']`
  - `developments.developmentType` → `['residential', 'commercial', 'mixed_use', 'land']`
  - `unit_types.parking` → `['none', '1', '2', 'carport', 'garage']`

- [ ] Test wizard publish flow manually:
  - Create new development
  - Add unit types
  - Upload media
  - Click "Publish"
  - Verify success message

## Rollback Procedure

If migration fails:

1. **Stop the application**

   ```bash
   # Kill the server process
   ```

2. **Restore from backup**

   ```bash
   # TiDB Cloud: Use console to restore snapshot
   ```

3. **Investigate failure**
   - Check migration logs
   - Review schema changes
   - Test in development environment

4. **Fix and retry**
   - Update migration files
   - Test locally first
   - Re-run migration

## Common Issues

### Issue: "Table already exists"

**Solution**: Migration was partially applied. Check `__drizzle_migrations` table and manually drop conflicting tables if safe.

### Issue: "Enum value mismatch"

**Solution**: Run `pnpm db:verify` to see exact mismatch. Update Drizzle schema or migration file to match.

### Issue: "Foreign key constraint fails"

**Solution**: Ensure referenced tables exist first. Check migration order.

## Security Checklist

- [ ] Rotate TiDB credentials if exposed in logs
- [ ] Verify `DATABASE_URL` is in `.env` (not committed)
- [ ] Confirm SSL/TLS is enabled for production connections
- [ ] Review user permissions (principle of least privilege)

## Deployment Checklist

- [ ] Run `pnpm db:verify` in CI
- [ ] All integration tests pass
- [ ] Manual smoke test completed
- [ ] Staging deployment successful
- [ ] Production deployment scheduled
- [ ] Rollback plan documented
- [ ] Team notified of deployment window
