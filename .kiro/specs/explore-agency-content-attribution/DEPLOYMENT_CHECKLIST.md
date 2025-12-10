# Agency Content Attribution - Production Deployment Checklist

## Deployment Date: [To be filled]
## Deployed By: [To be filled]

---

## Pre-Deployment Checklist

### Database Preparation
- [ ] **Database backup completed**
  - Backup location: _______________
  - Backup size: _______________
  - Backup verified: Yes/No
  
- [ ] **Database connection verified**
  - Can connect to production DB: Yes/No
  - Admin privileges confirmed: Yes/No

- [ ] **Staging migration tested**
  - Migration ran successfully on staging: Yes/No
  - No data loss confirmed: Yes/No
  - Performance acceptable: Yes/No

### Code Preparation
- [ ] **All tests passing**
  - Unit tests: ✅ Passing
  - Integration tests: ✅ Passing
  - Property-based tests: ⚠️ Optional (not implemented)

- [ ] **Code review completed**
  - Backend changes reviewed: Yes/No
  - Frontend changes reviewed: Yes/No
  - Migration scripts reviewed: Yes/No

- [ ] **Dependencies updated**
  - `npm install` completed: Yes/No
  - No security vulnerabilities: Yes/No

### Monitoring Setup
- [ ] **Monitoring tools ready**
  - Database monitoring active: Yes/No
  - Application logs accessible: Yes/No
  - Error tracking configured: Yes/No

---

## Deployment Steps

### Phase 1: Database Migration (Task 12.1)

#### Step 1.1: Backup Production Database
```bash
# Create backup
mysqldump -u [username] -p [database] > backup_agency_attribution_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```
- [ ] Backup created successfully
- [ ] Backup file size verified (should be > 0 bytes)
- [ ] Backup location recorded

#### Step 1.2: Run Migration Script
```bash
# Navigate to project root
cd /path/to/project

# Run migration
npx tsx scripts/run-agency-attribution-migration.ts
```
- [ ] Migration script executed
- [ ] No errors reported
- [ ] All statements completed

#### Step 1.3: Verify Schema Changes
```sql
-- Verify explore_shorts
DESCRIBE explore_shorts;

-- Verify explore_content
DESCRIBE explore_content;

-- Check indexes
SHOW INDEX FROM explore_shorts WHERE Key_name LIKE '%agency%';
SHOW INDEX FROM explore_content WHERE Key_name LIKE '%agency%';
```
- [ ] `agency_id` column exists in `explore_shorts`
- [ ] `creator_type` column exists in `explore_content`
- [ ] `agency_id` column exists in `explore_content`
- [ ] All indexes created successfully
- [ ] Foreign key constraints active

#### Step 1.4: Test Queries
```sql
-- Test agency feed query
SELECT * FROM explore_shorts WHERE agency_id = 1 LIMIT 5;

-- Test creator type query
SELECT * FROM explore_content WHERE creator_type = 'agency' LIMIT 5;

-- Test performance with indexes
EXPLAIN SELECT * FROM explore_shorts 
WHERE agency_id = 1 AND is_published = 1 
ORDER BY published_at DESC LIMIT 20;
```
- [ ] Queries execute without errors
- [ ] Query performance acceptable (< 500ms)
- [ ] Indexes being used (check EXPLAIN output)

#### Step 1.5: Monitor Performance
- [ ] Database CPU usage normal
- [ ] Database memory usage normal
- [ ] No connection pool exhaustion
- [ ] Query response times acceptable

**Task 12.1 Status**: ⬜ Not Started | ⏳ In Progress | ✅ Complete | ❌ Failed

---

### Phase 2: Backend Deployment (Task 12.2)

#### Step 2.1: Deploy Service Layer Changes
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build backend
npm run build
```
- [ ] Code pulled successfully
- [ ] Dependencies installed
- [ ] Build completed without errors

#### Step 2.2: Deploy API Router Changes
```bash
# Restart backend services
pm2 restart all
# OR
npm run start:prod
```
- [ ] Services restarted successfully
- [ ] No startup errors in logs
- [ ] Health check endpoint responding

#### Step 2.3: Clear Caches
```bash
# Clear Redis cache (if applicable)
redis-cli FLUSHDB

# Or clear specific keys
redis-cli DEL "explore:feed:*"
redis-cli DEL "explore:agency:*"
```
- [ ] Cache cleared successfully
- [ ] No cache-related errors

#### Step 2.4: Monitor Error Rates
```bash
# Check application logs
pm2 logs --lines 100

# Monitor error tracking dashboard
# [Link to error tracking tool]
```
- [ ] No critical errors in logs
- [ ] Error rate within normal range
- [ ] No database connection errors

#### Step 2.5: Verify Endpoints
```bash
# Test getAgencyFeed endpoint
curl -X POST http://[production-url]/api/explore/getAgencyFeed \
  -H "Content-Type: application/json" \
  -d '{"agencyId": 1, "limit": 5}'

# Test getAgencyAnalytics endpoint (requires auth)
curl -X POST http://[production-url]/api/explore/getAgencyAnalytics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [token]" \
  -d '{"agencyId": 1}'
```
- [ ] `getAgencyFeed` returns 200 OK
- [ ] `getAgencyAnalytics` requires authentication
- [ ] Response format matches expected schema
- [ ] No 500 errors

**Task 12.2 Status**: ⬜ Not Started | ⏳ In Progress | ✅ Complete | ❌ Failed

---

### Phase 3: Frontend Deployment (Task 12.3)

#### Step 3.1: Build Production Bundle
```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Build for production
npm run build
```
- [ ] Build completed successfully
- [ ] No TypeScript errors
- [ ] No build warnings (or acceptable warnings documented)
- [ ] Bundle size acceptable

#### Step 3.2: Deploy to CDN
```bash
# Deploy to hosting provider
# (Vercel, Netlify, AWS S3, etc.)
npm run deploy
# OR
vercel --prod
```
- [ ] Deployment initiated
- [ ] Deployment completed successfully
- [ ] New version live on production URL

#### Step 3.3: Clear Browser Caches
- [ ] CDN cache purged (if applicable)
- [ ] Service worker updated (if applicable)
- [ ] Browser cache headers verified

#### Step 3.4: Test User Flows
Manual testing checklist:

**Agency Feed Page**
- [ ] Navigate to `/explore/agency/[id]`
- [ ] Agency header displays correctly
- [ ] Content feed loads
- [ ] Pagination works
- [ ] No console errors

**Agency Analytics Dashboard**
- [ ] Navigate to agency analytics page
- [ ] Metrics cards display
- [ ] Agent breakdown table loads
- [ ] Top content list displays
- [ ] No console errors

**Content Upload**
- [ ] Upload form loads
- [ ] Agency attribution detected
- [ ] Upload completes successfully
- [ ] Content appears in agency feed

**Explore Home**
- [ ] Agency filter dropdown works
- [ ] Filtering by agency works
- [ ] URL updates with agency parameter
- [ ] Clear filter works

#### Step 3.5: Monitor Analytics
- [ ] Page load times acceptable
- [ ] No JavaScript errors reported
- [ ] User engagement metrics normal
- [ ] No broken images/videos

**Task 12.3 Status**: ⬜ Not Started | ⏳ In Progress | ✅ Complete | ❌ Failed

---

## Post-Deployment Verification

### Functional Testing
- [ ] Agency feed displays content correctly
- [ ] Agency analytics show accurate metrics
- [ ] Content upload attributes to agency
- [ ] Filtering by agency works
- [ ] Pagination works correctly
- [ ] Error handling works (404 for invalid agency)

### Performance Testing
- [ ] Agency feed loads in < 500ms (uncached)
- [ ] Agency feed loads in < 200ms (cached)
- [ ] Database queries use indexes
- [ ] No N+1 query issues
- [ ] Memory usage stable

### Security Testing
- [ ] Agency analytics requires authentication
- [ ] Users can only access their agency data
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevention in place
- [ ] CSRF protection active

### Backward Compatibility
- [ ] Existing content without agency_id displays correctly
- [ ] Legacy API calls still work
- [ ] No breaking changes for existing users
- [ ] NULL agency fields handled gracefully

---

## Rollback Plan

### When to Rollback
Rollback if:
- Critical errors in production
- Data corruption detected
- Performance degradation > 50%
- User-facing bugs affecting > 10% of users

### Rollback Steps

#### 1. Stop Application
```bash
pm2 stop all
```

#### 2. Rollback Database
```bash
# Run rollback script
npx tsx scripts/run-agency-attribution-migration.ts --rollback

# OR manually
mysql -u [username] -p [database] < drizzle/migrations/rollback-agency-attribution.sql
```

#### 3. Restore Previous Code Version
```bash
git checkout [previous-commit-hash]
npm install
npm run build
pm2 restart all
```

#### 4. Verify Rollback
- [ ] Database schema reverted
- [ ] Application starts without errors
- [ ] Existing functionality works

---

## Communication Plan

### Before Deployment
- [ ] Notify development team
- [ ] Notify QA team
- [ ] Notify product team
- [ ] Schedule deployment window

### During Deployment
- [ ] Post status updates in team chat
- [ ] Monitor for issues
- [ ] Be ready to rollback

### After Deployment
- [ ] Announce successful deployment
- [ ] Share deployment summary
- [ ] Document any issues encountered
- [ ] Update changelog

---

## Deployment Summary

**Deployment Date**: _______________  
**Deployment Time**: _______________  
**Deployed By**: _______________  
**Deployment Duration**: _______________  

**Status**: ⬜ Success | ⬜ Partial Success | ⬜ Failed | ⬜ Rolled Back

**Issues Encountered**:
- 
- 
- 

**Resolution**:
- 
- 
- 

**Next Steps**:
- [ ] Monitor for 24 hours
- [ ] Gather user feedback
- [ ] Plan data backfill (optional)
- [ ] Update documentation

---

## Sign-off

**Database Migration**: _______________  
**Backend Deployment**: _______________  
**Frontend Deployment**: _______________  
**QA Verification**: _______________  
**Product Approval**: _______________  

---

**Deployment Complete**: ⬜ Yes | ⬜ No  
**Ready for Production Traffic**: ⬜ Yes | ⬜ No
