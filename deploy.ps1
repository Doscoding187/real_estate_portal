# Deployment script for Real Estate Portal

Write-Host "Starting deployment process..." -ForegroundColor Green

# Add all changes
Write-Host "Adding all changes to git..." -ForegroundColor Yellow
git add .

# Commit changes
Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m "feat: Add role-based dashboards for User and Property Developer roles

- Created UserDashboard component for regular users
- Created PropertyDeveloperDashboard component for property developers
- Updated login redirection logic to handle all role-based redirects
- Updated App.tsx routing to include all dashboard routes with proper role guards
- All new components use existing TRPC endpoints for data fetching"

# Push to origin
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "Deployment complete! Check Vercel and Railway for automatic deployments." -ForegroundColor Green