# Deployment Instructions

## Overview
This document provides instructions for deploying the Real Estate Portal application with the newly added role-based dashboards.

## Changes Included in This Deployment

### New Features
1. **User Dashboard** - A new dashboard for regular users (role: 'user')
2. **Property Developer Dashboard** - A new dashboard for property developers (role: 'property_developer')

### Updates
1. **Enhanced Login Redirection** - Improved role-based redirection logic
2. **Routing Configuration** - Added new routes with proper authentication guards

## Deployment Process

### Prerequisites
- Git installed and configured
- Access to the GitHub repository (https://github.com/Doscoding187/real_estate_portal.git)
- Appropriate permissions to push to the repository

### Step 1: Commit Changes
```bash
git add .
git commit -m "feat: Add role-based dashboards for User and Property Developer roles"
```

### Step 2: Push to GitHub
```bash
git push origin main
```

### Step 3: Automatic Deployments

#### Vercel (Frontend)
- Vercel is configured to automatically deploy from the GitHub repository
- Build command: `pnpm build:frontend`
- Output directory: `dist/public`
- The deployment will be available at your configured Vercel domain

#### Railway (Backend)
- Railway is configured to automatically deploy from the GitHub repository
- Build command: `pnpm build:railway`
- Start command: `pnpm start`
- The deployment will be available at your configured Railway domain

## Files Changed/Added

### New Files
1. `client/src/pages/UserDashboard.tsx` - Dashboard for regular users
2. `client/src/pages/PropertyDeveloperDashboard.tsx` - Dashboard for property developers

### Modified Files
1. `client/src/pages/Login.tsx` - Updated role-based redirection logic
2. `client/src/App.tsx` - Added new routes with authentication guards

## Testing After Deployment

1. **Role-Based Redirection**
   - Log in as a regular user (role: 'user') and verify redirection to `/user/dashboard`
   - Log in as a property developer (role: 'property_developer') and verify redirection to `/developer/dashboard`

2. **Dashboard Functionality**
   - Test User Dashboard features (favorites, recently viewed, etc.)
   - Test Property Developer Dashboard features (projects, listings, team management)

3. **Existing Functionality**
   - Verify Super Admin dashboard still works correctly
   - Verify Agency Admin dashboard still works correctly
   - Verify Agent dashboard still works correctly

## Troubleshooting

### If Deployment Fails
1. Check GitHub Actions/Workflows for error messages
2. Verify all dependencies are correctly specified in package.json
3. Ensure the build commands in vercel.json and package.json are correct

### If Redirection Issues Occur
1. Verify the role names in the database match those in the code
2. Check browser console for any JavaScript errors
3. Ensure all new routes are properly configured in App.tsx

## Rollback Procedure

If issues are discovered after deployment:

1. Revert the last commit:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. Or deploy a previous known working version:
   ```bash
   git checkout <previous-commit-hash>
   git push origin main --force
   ```

## Support
For deployment issues, contact the development team or check the deployment logs in Vercel and Railway dashboards.