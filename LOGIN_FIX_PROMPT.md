# 🚨 URGENT: Fix Login API Routing in Vercel

## Problem Identified
The frontend is calling Vercel instead of Railway backend because `VITE_API_URL` environment variable is not set in Vercel.

**Current (broken)**: `https://real-estate-portal-xi.vercel.app/api/auth/login`
**Should be**: `https://realestateportal-production-8e32.up.railway.app/api/auth/login`

## 🔧 EXECUTE THIS PROMPT EXACTLY (For Roo Code Agent)

```bash
# ==========================================
# 🧩 Vercel Environment Variable Configuration
# ==========================================

# Step 1: Navigate to project root (where .vercel directory exists)
cd /path/to/your/project/root

# Step 2: Add the production backend API base URL
vercel env add VITE_API_URL production <<EOF
https://realestateportal-production-8e32.up.railway.app
EOF

# Step 3: (Optional but recommended) Add the same variable for Preview environments
vercel env add VITE_API_URL preview <<EOF
https://realestateportal-production-8e32.up.railway.app
EOF

# Step 4: Verify the variable is present
vercel env ls

# Step 5: Trigger a clean rebuild of the frontend so the environment variable is embedded at build time
vercel --prod --force
```

## ✅ Expected Results After Execution

1. **Environment Variable Set**: `VITE_API_URL=https://realestateportal-production-8e32.up.railway.app`
2. **Network Requests Point To**: `https://realestateportal-production-8e32.up.railway.app/api/auth/login`
3. **No More 405 Errors**: Requests hit Railway backend instead of Vercel
4. **No More JSON Parse Errors**: Railway returns proper JSON responses

## 🧪 Verification Steps (After Deployment)

1. **Open deployed app in browser**
2. **Open Developer Console**
3. **Run**: `console.log(import.meta.env.VITE_API_URL);`
4. **Expected Output**: `https://realestateportal-production-8e32.up.railway.app`
5. **Check Network Tab**: All API calls should go to `realestateportal-production-8e32.up.railway.app`

## 🚨 Critical Rules

- **DO NOT modify variable name** - it must be exactly `VITE_API_URL`
- **DO NOT add trailing slash** to the URL value
- **DO run from project root** where `.vercel` directory exists
- **DO trigger clean rebuild** with `--force` flag

## 📋 Strict Instructions for Code Agent

1. Execute all commands in sequence without modification
2. Wait for each command to complete before running the next
3. If any command fails, report the exact error message
4. After successful deployment, confirm the environment variable is working
5. Test that login requests now go to Railway backend

## 🎯 Success Criteria

The login functionality will work when:
- ✅ `import.meta.env.VITE_API_URL` outputs the Railway URL
- ✅ Network requests show `realestateportal-production-8e32.up.railway.app` domain
- ✅ No more 405 Method Not Allowed errors
- ✅ No more "Unexpected end of JSON input" errors

## 🔄 Alternative: Manual Vercel Dashboard Setup

If CLI approach doesn't work, configure manually:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Click "Add New"
3. **Name**: `VITE_API_URL`
4. **Value**: `https://realestateportal-production-8e32.up.railway.app`
5. **Target**: Production (and Preview if desired)
6. Click "Save"
7. Go to Deployments tab
8. Click "..." on latest deployment → "Redeploy"

---

**This prompt must be executed exactly as written to fix the login API routing issue.**