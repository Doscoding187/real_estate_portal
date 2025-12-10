# 🚀 Agency Attribution Deployment - Quick Reference Card

## One-Command Deployment

```bash
# Automated deployment (recommended)
npx tsx scripts/deploy-agency-attribution.ts
```

---

## Manual Deployment (3 Steps)

### 1️⃣ Database Migration
```bash
npx tsx scripts/run-agency-attribution-migration.ts
```

### 2️⃣ Backend Deployment
```bash
npm run build && pm2 restart all
```

### 3️⃣ Frontend Deployment
```bash
cd client && npm run build && npm run deploy
```

---

## Quick Verification

### Database
```sql
DESCRIBE explore_shorts;  -- Check for agency_id column
DESCRIBE explore_content; -- Check for creator_type, agency_id
```

### Backend
```bash
curl -X POST http://localhost:5000/api/explore/getAgencyFeed \
  -H "Content-Type: application/json" \
  -d '{"agencyId": 1, "limit": 5}'
```

### Frontend
- Navigate to `/explore/agency/1`
- Check browser console (no errors)

---

## Quick Rollback

```bash
npx tsx scripts/run-agency-attribution-migration.ts --rollback
```

---

## Key Files

| File | Purpose |
|------|---------|
| `scripts/deploy-agency-attribution.ts` | Automated deployment |
| `scripts/run-agency-attribution-migration.ts` | Database migration |
| `DEPLOYMENT_GUIDE.md` | Full deployment guide |
| `DEPLOYMENT_CHECKLIST.md` | Detailed checklist |

---

## Success Criteria

✅ No errors in logs  
✅ API endpoints respond  
✅ Frontend loads correctly  
✅ Query performance < 500ms  
✅ No data loss  

---

## Emergency Contacts

- **Rollback**: Run rollback script immediately
- **Support**: Check DEPLOYMENT_GUIDE.md
- **Issues**: Review MIGRATION_GUIDE.md

---

## Estimated Time

⏱️ **15-30 minutes** total deployment time

---

**Status**: ✅ READY FOR PRODUCTION
