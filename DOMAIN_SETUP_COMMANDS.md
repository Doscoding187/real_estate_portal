# ⚡ Domain Setup Quick Commands
## propertylistifysa.co.za

This guide provides copy-paste commands for setting up your domain.

---

## 🔧 Step 1: Commit SEO Changes to Git

```powershell
# Navigate to your project directory
cd C:\Users\Edward\Desktop\real_estate_portal

# Check what files were created/modified
git status

# Add all the new domain configuration files
git add client/index.html
git add client/public/robots.txt
git add client/public/sitemap.xml
git add .env.production
git add DOMAIN_SETUP_GUIDE.md
git add DOMAIN_SETUP_CHECKLIST.md

# Commit the changes
git commit -m "Add domain configuration for propertylistifysa.co.za

- Enhanced SEO meta tags in index.html
- Added robots.txt for search engine crawling
- Created sitemap.xml with main pages
- Updated .env.production with domain-specific config
- Added comprehensive domain setup documentation"

# Push to repository (triggers auto-deploy on Vercel)
git push origin main
```

---

## 🌐 Step 2: DNS Configuration Commands

### Check DNS Propagation
Use these URLs to verify DNS propagation:

```
https://dnschecker.org/#A/propertylistifysa.co.za
https://dnschecker.org/#CNAME/www.propertylistifysa.co.za
https://dnschecker.org/#CNAME/api.propertylistifysa.co.za
```

### Flush Local DNS Cache (Windows)
```powershell
ipconfig /flushdns
```

---

## 🧪 Step 3: Testing Commands

### Test Frontend Access
```powershell
# Test main domain (expect 200 OK or redirect)
curl -I https://propertylistifysa.co.za

# Test www subdomain (should redirect to apex)
curl -I https://www.propertylistifysa.co.za

# Test robots.txt
curl https://propertylistifysa.co.za/robots.txt

# Test sitemap.xml
curl https://propertylistifysa.co.za/sitemap.xml
```

### Test API Backend
```powershell
# Test API health endpoint
curl https://api.propertylistifysa.co.za/health

# Test API with verbose output
curl -v https://api.propertylistifysa.co.za/health
```

### Test SSL Certificate
```powershell
# Windows - check certificate details
curl -v https://propertylistifysa.co.za 2>&1 | findstr "SSL"
```

---

## ☁️ Step 4: Vercel Configuration (via CLI)

### Install Vercel CLI (if not installed)
```powershell
pnpm add -g vercel
```

### Login to Vercel
```powershell
vercel login
```

### Link Project
```powershell
vercel link
```

### Add Domain via CLI
```powershell
# Add apex domain
vercel domains add propertylistifysa.co.za

# Add www subdomain
vercel domains add www.propertylistifysa.co.za
```

### Set Environment Variables
```powershell
# Set API URL for production
vercel env add VITE_API_URL production
# When prompted, enter: https://api.propertylistifysa.co.za

# Set app title for production
vercel env add VITE_APP_TITLE production
# When prompted, enter: PropertyListify SA

# List all environment variables
vercel env ls
```

### Trigger Deployment
```powershell
# Deploy to production
vercel --prod

# Or just push to git and let auto-deploy handle it
git push origin main
```

---

## 🚂 Step 5: Railway Configuration

Railway doesn't have a CLI for domain management, use the dashboard:
1. Go to: https://railway.app/dashboard
2. Select your backend project
3. Settings → Domains → Add Custom Domain
4. Enter: `api.propertylistifysa.co.za`

### Set Environment Variables via Railway CLI (Optional)

```powershell
# Install Railway CLI
pnpm add -g @railway/cli

# Login
railway login

# Link project
railway link

# Set environment variables
railway variables set FRONTEND_URL=https://propertylistifysa.co.za
railway variables set CORS_ORIGIN="https://propertylistifysa.co.za,https://www.propertylistifysa.co.za"

# View all variables
railway variables
```

---

## 🔍 Step 6: Verification Commands

### Check if Domain Resolves
```powershell
# Check A record for apex domain
nslookup propertylistifysa.co.za

# Check CNAME for www
nslookup www.propertylistifysa.co.za

# Check CNAME for api
nslookup api.propertylistifysa.co.za
```

### Check SSL Certificate Expiry
```powershell
# Using OpenSSL (if installed)
openssl s_client -connect propertylistifysa.co.za:443 -servername propertylistifysa.co.za < nul 2>&1 | findstr "Verify return code"
```

---

## 📊 Step 7: Google Search Console Setup

### Verify Domain Ownership (DNS Method)

1. Go to: https://search.google.com/search-console
2. Add property: `https://propertylistifysa.co.za`
3. Choose **Domain** verification type
4. Google will provide a TXT record like:
   ```
   Type: TXT
   Name: @
   Value: google-site-verification=xxxxxxxxxxx
   ```
5. Add this to your DNS settings
6. Click **Verify**

### Submit Sitemap
```
URL to submit: https://propertylistifysa.co.za/sitemap.xml
```

---

## 🚨 Troubleshooting Commands

### If DNS Not Propagating
```powershell
# Clear local DNS cache
ipconfig /flushdns

# Check with Google DNS specifically
nslookup propertylistifysa.co.za 8.8.8.8

# Trace DNS resolution
nslookup -debug propertylistifysa.co.za
```

### If API CORS Errors
```powershell
# Test CORS headers
curl -H "Origin: https://propertylistifysa.co.za" -H "Access-Control-Request-Method: GET" -X OPTIONS https://api.propertylistifysa.co.za/api/properties -v
```

### Check Railway Logs
```powershell
# Using Railway CLI
railway logs
```

### Check Vercel Logs
```powershell
# Using Vercel CLI
vercel logs
```

---

## 🔄 Rollback Commands (Emergency)

### If You Need to Rollback Vercel Deployment
```powershell
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### If You Need to Rollback Railway
```powershell
# Via Railway CLI
railway rollback
```

---

## 📝 Generate Production Secrets

### Generate Strong JWT Secret
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Generate Random API Key
```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

---

## 🎯 Complete Setup Script (All-in-One)

Save this as `setup-domain.ps1` and run it after configuring DNS:

```powershell
# Domain Setup Automation Script
Write-Host "🚀 Starting Domain Setup for propertylistifysa.co.za" -ForegroundColor Green

# Step 1: Commit changes
Write-Host "`n📝 Step 1: Committing domain configuration..." -ForegroundColor Yellow
git add -A
git commit -m "Add domain configuration for propertylistifysa.co.za"
git push origin main

# Step 2: Wait for deployment
Write-Host "`n⏳ Step 2: Waiting 30 seconds for auto-deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 3: Test DNS
Write-Host "`n🌐 Step 3: Testing DNS resolution..." -ForegroundColor Yellow
nslookup propertylistifysa.co.za
nslookup www.propertylistifysa.co.za
nslookup api.propertylistifysa.co.za

# Step 4: Test Frontend
Write-Host "`n🎨 Step 4: Testing frontend..." -ForegroundColor Yellow
curl -I https://propertylistifysa.co.za

# Step 5: Test API
Write-Host "`n🔌 Step 5: Testing API..." -ForegroundColor Yellow
curl https://api.propertylistifysa.co.za/health

Write-Host "`n✅ Setup script complete! Check the output above for any errors." -ForegroundColor Green
Write-Host "📋 Use DOMAIN_SETUP_CHECKLIST.md to verify all steps are complete." -ForegroundColor Cyan
```

---

## 📚 Useful Links

- **DNS Checker**: https://dnschecker.org
- **SSL Checker**: https://www.ssllabs.com/ssltest/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Railway Dashboard**: https://railway.app/dashboard
- **Google Search Console**: https://search.google.com/search-console
- **Vercel Docs - Custom Domains**: https://vercel.com/docs/concepts/projects/custom-domains
- **Railway Docs - Custom Domains**: https://docs.railway.app/deploy/exposing-your-app#custom-domains

---

## 💡 Pro Tips

1. **DNS Propagation**: Can take up to 48 hours, but usually completes in 1-2 hours
2. **SSL Certificates**: Auto-provisioned by Vercel/Railway within 5-10 minutes after DNS propagates
3. **Testing**: Use incognito/private browsing to test without cache
4. **Mobile Testing**: Test on mobile data to bypass local DNS cache
5. **CORS**: Most CORS issues are due to typos in `CORS_ORIGIN` - check for spaces!

---

**Need Help?** Check `DOMAIN_SETUP_GUIDE.md` for detailed explanations or `DOMAIN_SETUP_CHECKLIST.md` for tracking progress.
