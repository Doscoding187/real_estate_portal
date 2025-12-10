# Agency Content Attribution - Quick Deployment Guide

## Overview

This guide provides a streamlined process for deploying the agency content attribution feature to production.

**Estimated Time**: 15-30 minutes  
**Downtime Required**: None (zero-downtime deployment)  
**Rollback Available**: Yes

---

## Prerequisites

Before starting:

- [ ] Database admin access
- [ ] Application deployment access
- [ ] Node.js 18+ installed
- [ ] All tests passing
- [ ] Code reviewed and approved

---

## Quick Deployment (Automated)

### Option 1: Full Automated Deployment

```bash
# Run the automated deployment script
npx tsx scripts/deploy-agency-attribution.ts
```

This script will:
1. ✅ Run pre-deployment checks
2. ✅ Create database backup (recommended)
3. ✅ Execute database migration
4. ✅ Verify schema changes
5. ✅ Build backend and frontend
6. ✅ Run post-deployment verification

### Option 2: Dry Run (Recommended First)

```bash
# See what would happen without making changes
npx tsx scripts/deploy-agency-attribution.ts --dry-run
```

### Option 3: Skip Backup (Not Recommended)

```bash
# Skip database backup (use only if you have external backups)
npx tsx scripts/deploy-agency-attribution.ts --skip-backup
```

---

## Manual Deployment (Step-by-Step)

### Step 1: Database Migration (Task 12.1)

```bash
# Run migration
npx tsx scripts/run-agency-attribution-migration.ts

# Verify migration
npx tsx scripts/verify-agency-attribution.ts
```

**Expected Output**:
```
✅ Agency Attribution Migration completed successfully!
📊 Summary:
  - Added agency_id to explore_shorts table
  - Added creator_type and agency_id to explore_content table
  - Created composite indexes for performance
  - Added foreign key constraints
```

### Step 2: Backend Deployment (Task 12.2)

```bash
# Build backend
npm run build

# Clear cache (if using Redis)
redis-cli FLUSHDB

# Restart services
pm2 restart all
# OR
npm run start:prod
```

**Verify Backend**:
```bash
# Test API endpoint
curl -X POST http://localhost:5000/api/explore/getAgencyFeed \
  -H "Content-Type: application/json" \
  -d '{"agencyId": 1, "limit": 5}'
```

### Step 3: Frontend Deployment (Task 12.3)

```bash
# Build frontend
cd client
npm run build

# Deploy (adjust for your hosting provider)
npm run deploy
# OR
vercel --prod
```

**Verify Frontend**:
- Navigate to `/explore/agency/1`
- Check agency analytics dashboard
- Test content upload
- Verify no console errors

---

## Verification Checklist

After deployment, verify:

### Database
- [ ] `agency_id` column exists in `explore_shorts`
- [ ] `creator_type` and `agency_id` columns exist in `explore_content`
- [ ] All indexes created
- [ ] Foreign key constraints active
- [ ] No data loss

### Backend
- [ ] `getAgencyFeed` endpoint works
- [ ] `getAgencyAnalytics` endpoint works
- [ ] No errors in application logs
- [ ] Query performance acceptable (< 500ms)

### Frontend
- [ ] Agency feed page loads
- [ ] Agency analytics dashboard works
- [ ] Content upload shows agency attribution
- [ ] No console errors
- [ ] Mobile responsive

---

## Rollback Instructions

If issues occur:

```bash
# Rollback database
npx tsx scripts/run-agency-attribution-migration.ts --rollback

# Restore previous code version
git checkout <previous-commit>
npm install
npm run build
pm2 restart all
```

---

## Monitoring

After deployment, monitor:

### First Hour
- Application error rates
- Database query performance
- API response times
- User-reported issues

### First 24 Hours
- Overall system stability
- Feature usage metrics
- Performance trends
- User feedback

### First Week
- Long-term performance impact
- Feature adoption rates
- Bug reports
- Optimization opportunities

---

## Troubleshooting

### Issue: Migration fails with "Duplicate column"

**Solution**: Migration already applied. This is safe - the script handles this automatically.

### Issue: Foreign key constraint fails

**Solution**: Check for orphaned data:
```sql
SELECT DISTINCT agency_id 
FROM explore_shorts 
WHERE agency_id IS NOT NULL 
  AND agency_id NOT IN (SELECT id FROM agencies);
```

### Issue: Application errors after deployment

**Solution**:
```bash
# Clear cache
redis-cli FLUSHDB

# Restart application
pm2 restart all

# Check logs
pm2 logs --lines 100
```

### Issue: Performance degradation

**Solution**:
```sql
-- Analyze tables
ANALYZE TABLE explore_shorts;
ANALYZE TABLE explore_content;

-- Verify indexes
SHOW INDEX FROM explore_shorts;
```

---

## Support Resources

- **API Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Quick Start Guide**: [QUICK_START.md](./QUICK_START.md)
- **Migration Guide**: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Deployment Checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

## Post-Deployment Tasks

After successful deployment:

1. **Update Documentation**
   - [ ] Update changelog
   - [ ] Update API docs
   - [ ] Update user guides

2. **Team Communication**
   - [ ] Notify team of successful deployment
   - [ ] Share deployment summary
   - [ ] Document any issues encountered

3. **Optional: Data Backfill**
   - [ ] Review historical content
   - [ ] Run backfill script (if needed)
   - [ ] Verify backfilled data

4. **Monitoring Setup**
   - [ ] Set up alerts for errors
   - [ ] Monitor performance metrics
   - [ ] Track feature usage

---

## Success Criteria

Deployment is successful when:

✅ All database migrations applied  
✅ No application errors  
✅ All tests passing  
✅ API endpoints responding correctly  
✅ Frontend loads without errors  
✅ Performance within acceptable range  
✅ No data loss or corruption  

---

## Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Pre-deployment checks | 5 min | Verify prerequisites |
| Database migration | 2-5 min | Apply schema changes |
| Backend deployment | 5-10 min | Build and deploy services |
| Frontend deployment | 5-10 min | Build and deploy UI |
| Verification | 5-10 min | Test functionality |
| **Total** | **15-30 min** | End-to-end deployment |

---

## Contact

For deployment support:
- Development Team: [contact info]
- DevOps Team: [contact info]
- Emergency Rollback: [contact info]

---

**Last Updated**: December 2025  
**Version**: 1.0.0
