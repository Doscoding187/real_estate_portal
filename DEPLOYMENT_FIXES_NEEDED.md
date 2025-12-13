# Deployment Issues - Quick Fix Guide

## Issues Found

### 1. ❌ Missing Analytics Route Registration
**Error:** `api/analytics/track:1 Failed to load resource: the server responded with a status of 405`

**Problem:** The analytics router exists but isn't registered in the Express app.

**Fix:** Add analytics router to `server/_core/index.ts`

### 2. ❌ CORS Configuration Issue  
**Error:** `Access to fetch at 'https://realestateportal-production-9bb8.up.railway.app/api/trpc/...' has been blocked by CORS policy`

**Problem:** CORS is configured but may need the exact Vercel URL added.

**Current allowed origins:**
- ✅ `https://real-estate-portal-xi.vercel.app`
- ✅ Pattern: `*.vercel.app`

**Status:** Should work, but verify Railway backend is running

### 3. ⚠️ Missing Environment Variables
**Warning:** `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID` not defined

**Problem:** These need to be set in Vercel environment variables.

**Fix:** Add to Vercel:
```
VITE_ANALYTICS_ENDPOINT=https://realestateportal-production-9bb8.up.railway.app/api/analytics
VITE_ANALYTICS_WEBSITE_ID=real-estate-portal-prod
```

### 4. ⚠️ Font Preload Warning
**Warning:** `inter-var.woff2 was preloaded using link preload but not used`

**Problem:** Font is preloaded but may not be used immediately.

**Fix:** Minor - can be ignored or font preload can be removed if not critical.

---

## Quick Fixes to Apply

### Fix 1: Register Analytics Router

**File:** `server/_core/index.ts`

Add after line 60 (after tRPC setup):

```typescript
// Analytics endpoint (for advertise page tracking)
import analyticsRouter from '../routes/analytics';
app.use('/api/analytics', analyticsRouter);
```

### Fix 2: Verify Railway Backend is Running

Check Railway dashboard:
- Is the backend service running?
- Check logs for errors
- Verify the URL is correct

### Fix 3: Add Environment Variables to Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add:
   - `VITE_ANALYTICS_ENDPOINT` = `https://realestateportal-production-9bb8.up.railway.app/api/analytics`
   - `VITE_ANALYTICS_WEBSITE_ID` = `real-estate-portal-prod`
5. Redeploy

### Fix 4: Verify Backend Environment Variables

Ensure Railway has:
- `JWT_SECRET` (critical!)
- `DATABASE_URL`
- All other required vars from `.env.example`

---

## Testing After Fixes

1. **Test Analytics:**
   ```bash
   curl -X POST https://realestateportal-production-9bb8.up.railway.app/api/analytics/track \
     -H "Content-Type: application/json" \
     -d '{"eventType":"test","page":"advertise"}'
   ```

2. **Test CORS:**
   - Open browser console on Vercel site
   - Check if TRPC calls succeed
   - Look for CORS errors

3. **Test Environment Variables:**
   - Check browser console for warnings
   - Verify analytics endpoint is defined

---

## Priority Order

1. **HIGH:** Fix analytics router registration (Fix 1)
2. **HIGH:** Verify Railway backend is running (Fix 2)  
3. **MEDIUM:** Add Vercel environment variables (Fix 3)
4. **LOW:** Font preload warning (Fix 4)

---

## Next Steps

Would you like me to:
1. Apply Fix 1 (register analytics router)?
2. Create a deployment checklist?
3. Help debug Railway backend?
