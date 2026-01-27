# Database Migration & Schema Management

## 🔒 Critical Rules

### 1. Naming Convention (FROZEN)

- **Database columns/tables**: `snake_case`
- **TypeScript/Application**: `camelCase` (via Drizzle mapping)
- **Never rename columns** — use Drizzle's mapping feature instead

Example:

```typescript
// ✅ CORRECT: TypeScript camelCase → DB snake_case
devOwnerType: mysqlEnum('dev_owner_type', ['platform', 'developer']);
developmentId: int('development_id');
```

### 2. Migration Workflow (PRODUCTION SAFE)

#### Local Development

```bash
# Option A: Migrations (recommended)
pnpm db:generate    # Generate migration from schema changes
pnpm db:migrate     # Apply migrations to database

# Option B: Push (prototyping only)
pnpm db:push        # Direct schema sync (use for local sandbox only)
```

#### Staging/Production

```bash
# ✅ ONLY use migrations
pnpm db:generate    # Generate migration locally
pnpm db:migrate     # Apply to staging/prod

# ❌ NEVER use push in shared environments
```

### 3. CI/CD Pipeline

The DB contract verification runs **before all other checks**:

```
1. Install dependencies
2. Apply migrations (pnpm db:migrate)
3. ✅ Run DB contract verification (pnpm db:verify:ci)
4. Run lint/typecheck/tests (only if #3 passes)
5. Build application (only if #4 passes)
```

**Pipeline fails if schema drift is detected.**

### 4. Bootstrap Tool Warning

`scripts/mark-migrations-applied.ts` is **ONLY for**:

- Initial adoption (DB exists, migrations table empty)
- Recovery (migrations table corrupted)

**Never use for regular deployments** — it masks drift and can cause data corruption.

## 📊 Verification Commands

```bash
# Human-readable output
pnpm db:verify

# CI-friendly JSON output
pnpm db:verify:ci
```

## 🔍 Schema Drift Prevention

The contract verifier checks:

- ✅ Required tables exist
- ✅ Required columns exist with correct types
- ✅ Enum values match expectations
- ✅ Migration count matches files

**If verification fails, the build pipeline stops immediately.**

## 🚀 Deployment Checklist

- [ ] Schema changes committed to `drizzle/schema.ts`
- [ ] Migration generated via `pnpm db:generate`
- [ ] Migration tested locally
- [ ] `pnpm db:verify` passes
- [ ] PR created with migration file
- [ ] CI pipeline passes (includes DB verification)
- [ ] Deploy to staging → run migrations
- [ ] Verify staging DB with `pnpm db:verify`
- [ ] Deploy to production → run migrations
- [ ] Verify production DB with `pnpm db:verify`
