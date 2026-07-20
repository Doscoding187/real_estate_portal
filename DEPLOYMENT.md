# Railway Environment & Deployment Rules

## CRITICAL: Environment Safety Rules

### 1. PRODUCTION PROTECTION

- ⛔ NEVER deploy to Production without explicit human approval
- ⛔ NEVER make database changes in Production without confirmation
- ✅ ALWAYS deploy to Staging first for any code/schema changes
- ✅ ALWAYS ask for confirmation before Production deployments

### 2. Default Environment Behavior

**When the user doesn't specify an environment:**

- Code changes, features, bug fixes → Deploy to **Staging**
- Database migrations, schema changes → Test in **Staging** first
- Configuration updates → Apply to **Staging** first
- Testing/CI/CD → Use **Testing** environment

### 3. Environment Purposes

**STAGING** (Primary Development Environment)

- Purpose: Test all changes before Production
- Database: `listify_staging`
- NODE_ENV: `staging`
- Use for: Feature development, bug fixes, integration testing, user acceptance testing
- Default deployment target unless specified otherwise

**PRODUCTION** (Live Environment)

- Purpose: Serve real users
- Database: `listify_property_sa`
- NODE_ENV: `production`
- Use for: Verified, tested code only
- Requires: Explicit approval from user

**TESTING** (CI/CD Environment)

- Purpose: Automated tests, CI/CD pipelines
- Database: `listify_test`
- NODE_ENV: `test`
- Use for: Automated test suites, GitHub Actions, integration tests

---

## DEPLOYMENT WORKFLOW

### Standard Workflow (ALWAYS follow this unless told otherwise)

```
1. Make code changes
2. Deploy to STAGING
3. Wait for user verification/testing
4. Ask: "Staging deployment successful. Would you like me to deploy to Production?"
5. Only after user confirms → Deploy to PRODUCTION
6. Provide rollback instructions
```

### Before ANY Production Deployment

**Required Checks:**

1. ✅ Confirm Staging deployment is working correctly
2. ✅ Ask user: "Ready to deploy to Production? This will affect live users."
3. ✅ List what's being deployed (features, fixes, migrations)
4. ✅ Warn about any database migrations or breaking changes
5. ✅ Wait for explicit "yes" or "deploy to production" confirmation

**After Production Deployment:**

1. ✅ Monitor deployment logs for errors
2. ✅ Confirm application started successfully
3. ✅ Provide rollback command if needed
4. ✅ Document what was deployed

---

## PROMPT INTERPRETATION GUIDE

### Clear Instructions (Do what user says)

- ✅ "Deploy to Staging" → Deploy to Staging
- ✅ "Push to Production" → Ask for confirmation, then deploy to Production
- ✅ "Deploy this to prod" → Ask for confirmation, then deploy to Production
- ✅ "Test this in the Testing environment" → Use Testing environment

### Ambiguous Instructions (Ask for clarification)

- ❓ "Deploy this" → Ask: "Which environment? (Staging/Production/Testing)"
- ❓ "Push the changes" → Ask: "Should I deploy to Staging first, or directly to Production?"
- ❓ "Update the database" → Ask: "Which environment should I update?"

### Implicit Instructions (Use default: Staging)

- 🔵 "Add this feature" → Deploy to Staging
- 🔵 "Fix this bug" → Deploy to Staging
- 🔵 "Update the API endpoint" → Deploy to Staging
- 🔵 "Modify the schema" → Test in Staging first

---

## DATABASE CONNECTION VALIDATION

### Database Guards (Automatic Protection)

Your application has Database Guards that prevent environment mismatches:

- If NODE_ENV=production but connected to staging DB → App will NOT start
- If NODE_ENV=staging but connected to production DB → App will NOT start
- These guards protect against accidental cross-environment connections

### Connection String Mapping

```
PRODUCTION:
> Database connection values must be supplied through protected deployment environment variables and are not stored in this repository.
NODE_ENV=production

STAGING:
> Database connection values must be supplied through protected deployment environment variables and are not stored in this repository.
NODE_ENV=staging

TESTING:
> Database connection values must be supplied through protected deployment environment variables and are not stored in this repository.
NODE_ENV=test
```

---

## DEPLOYMENT COMMANDS & RESPONSES

### When Deploying to Staging

```
"Deploying to Staging environment...

Environment: Staging
Database: listify_staging
Branch: [branch name]
Changes: [list changes]

[deployment logs]

✅ Staging deployment successful!
🔗 Staging URL: [provide URL]

Would you like me to:
1. Deploy to Production
2. Make additional changes in Staging
3. Run tests
```

### When Deploying to Production

```
⚠️  PRODUCTION DEPLOYMENT CONFIRMATION REQUIRED

Environment: Production (LIVE)
Database: listify_property_sa (LIVE DATA)
Changes to deploy:
- [list all changes]

This will affect real users. Are you sure you want to proceed?
Please confirm with "yes" or "deploy to production"
```

**After confirmation:**

```
"Deploying to Production...

Environment: Production
Database: listify_property_sa
Changes: [list changes]

[deployment logs]

✅ Production deployment successful!
🔗 Production URL: [provide URL]

🔄 Rollback command (if needed):
railway rollback [deployment-id]

Monitoring for errors...
```

---

## ERROR HANDLING

### If Deployment Fails

1. Show full error logs
2. Identify the issue
3. Suggest fixes
4. Ask: "Should I attempt to fix this in Staging?"
5. Never attempt Production fixes without approval

### If Database Connection Fails

1. Verify NODE_ENV matches environment
2. Check DATABASE_URL is correct for environment
3. Verify Database Guards are working
4. Suggest checking Railway environment variables

---

## QUICK REFERENCE

| Scenario              | Environment                    | Approval Needed |
| --------------------- | ------------------------------ | --------------- |
| New feature           | Staging                        | No              |
| Bug fix               | Staging                        | No              |
| Database migration    | Staging                        | No              |
| Configuration change  | Staging                        | No              |
| Promote to Production | Production                     | YES ✋          |
| Hotfix (urgent)       | Staging first, then Production | YES ✋          |
| Running tests         | Testing                        | No              |

---

## EXAMPLES

### ✅ GOOD Agent Behavior

**User:** "Add a new endpoint for user profiles"
**Agent:** "I'll add the new endpoint and deploy to Staging for testing..."
[deploys to Staging]
**Agent:** "Endpoint added successfully in Staging. Test it at [URL]. Ready to deploy to Production?"

---

**User:** "Fix the authentication bug"
**Agent:** "I'll fix the bug and deploy to Staging first..."
[deploys to Staging]
**Agent:** "Bug fixed in Staging. Please verify the fix works. Should I deploy to Production?"

---

**User:** "Deploy to production"
**Agent:** "⚠️ You're requesting a Production deployment. This will affect live users.
Changes to deploy: [lists changes from Staging]
Please confirm: Are you ready to deploy to Production?"

---

### ❌ BAD Agent Behavior

**User:** "Add a new endpoint"
**Agent:** [Deploys directly to Production without testing] ❌ WRONG

**User:** "Fix this bug"
**Agent:** [Asks "which environment?"] ❌ WRONG (should default to Staging)

**User:** "Deploy to production"
**Agent:** [Deploys immediately without confirmation] ❌ WRONG

---

## REMEMBER

1. **When in doubt → Deploy to Staging**
2. **Production = Always ask first**
3. **Testing = CI/CD and automated tests only**
4. **Safety > Speed**
5. **One environment at a time**
6. **Always provide URLs and logs**
7. **User verification before Production**

---

END OF CONFIGURATION
