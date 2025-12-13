# Vercel Environment Variables Setup

## Required Environment Variables for Production

Add these in Vercel Dashboard → Your Project → Settings → Environment Variables

### 1. Analytics Configuration
```
VITE_ANALYTICS_ENDPOINT=https://realestateportal-production-9bb8.up.railway.app/api/analytics
VITE_ANALYTICS_WEBSITE_ID=real-estate-portal-prod
```

### 2. API Configuration
```
VITE_API_URL=https://realestateportal-production-9bb8.up.railway.app
```

### 3. Application Configuration
```
VITE_APP_TITLE=Real Estate Portal
NODE_ENV=production
```

### 4. Google Maps (if using location features)
```
GOOGLE_MAPS_API_KEY=your_key_here
GOOGLE_PLACES_API_KEY=your_key_here
```

### 5. AWS S3 (if using image uploads)
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
S3_BUCKET_NAME=your-bucket-name
CLOUDFRONT_URL=https://your-cloudfront-url.cloudfront.net
```

---

## How to Add in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Settings" tab
4. Click "Environment Variables" in sidebar
5. For each variable:
   - Enter the **Key** (e.g., `VITE_ANALYTICS_ENDPOINT`)
   - Enter the **Value**
   - Select environments: **Production**, **Preview**, **Development**
   - Click "Save"

6. After adding all variables, redeploy:
   - Go to "Deployments" tab
   - Click "..." on latest deployment
   - Click "Redeploy"

---

## Verification

After redeployment, check browser console:
- ✅ No warnings about missing `VITE_ANALYTICS_ENDPOINT`
- ✅ No warnings about missing `VITE_ANALYTICS_WEBSITE_ID`
- ✅ Analytics tracking works without errors

---

## Railway Backend Environment Variables

Ensure Railway also has these set:

```
JWT_SECRET=your-secret-key-here
DATABASE_URL=your-database-url
NODE_ENV=production
SKIP_FRONTEND=true
```

The `SKIP_FRONTEND=true` tells Railway to only run the backend API, not serve frontend files (since Vercel handles that).
