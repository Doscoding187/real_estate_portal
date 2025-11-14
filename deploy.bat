@echo off
REM Deployment script for Real Estate Portal

echo Starting deployment process...

REM Add all changes
echo Adding all changes to git...
git add .

REM Commit changes
echo Committing changes...
git commit -m "feat: Add role-based dashboards for User and Property Developer roles

- Created UserDashboard component for regular users
- Created PropertyDeveloperDashboard component for property developers
- Updated login redirection logic to handle all role-based redirects
- Updated App.tsx routing to include all dashboard routes with proper role guards
- All new components use existing TRPC endpoints for data fetching"

REM Push to origin
echo Pushing to GitHub...
git push origin main

echo Deployment complete! Check Vercel and Railway for automatic deployments.