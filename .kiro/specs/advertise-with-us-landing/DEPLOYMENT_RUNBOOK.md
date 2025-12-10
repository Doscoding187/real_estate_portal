# Deployment Runbook - Advertise With Us Landing Page

**Purpose**: Step-by-step guide for deploying the Advertise With Us landing page  
**Audience**: DevOps engineers, deployment managers  
**Estimated Time**: 30-45 minutes (first deployment), 10-15 minutes (subsequent)

---

## Table of Contents

1. [Pre-Deployment Preparation](#pre-deployment-preparation)
2. [Deployment Procedure](#deployment-procedure)
3. [Verification Steps](#verification-steps)
4. [Rollback Procedure](#rollback-procedure)
5. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Preparation

### 1. Environment Setup (5 minutes)

**Checklist**:
- [ ] Access to production servers
- [ ] Access to CMS admin panel
- [ ] Access to analytics dashboard
- [ ] Access to error monitoring dashboard
- [ ] Deployment credentials verified

**Commands**:
```bash
# Verify access
ssh production-server
aws s3 ls s3://production-bucket
kubectl get pods -n production
```

### 2. Code Preparation (10 minutes)

**Checklist**:
- [ ] Latest code pulled from main branch
- [ ] All tests passing locally
- [ ] No merge conflicts
- [ ] Version number updated in package.json

**Commands**:
```bash
# Pull latest code
git checkout main
git pull origin main

# Verify clean state
git status

# Run tests
npm ci
npm run test
npm run lint
npm run type-check

# Build locally to verify
npm run build
```

### 3. Environment Variables (5 minutes)

**Checklist**:
- [ ] `.env.production` file created from template
- [ ] All required variables set
- [ ] API keys valid
- [ ] URLs correct for production

**Commands**:
```bash
# Copy template
cp .kiro/specs/advertise-with-us-landing/.env.production.template .env.production

# Edit with production values
nano .env.production

# Validate environment variables
npm run validate:env
```

**Required Variables**:
```bash
VITE_APP_URL="https://platform.com"
VITE_ANALYTICS_ID="G-XXXXXXXXXX"
VITE_CMS_API_URL="https://cms.platform.com/api"
VITE_CMS_API_KEY="[REDACTED]"
VITE_SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
```

### 4. Content Preparation (10 minutes)

**Checklist**:
- [ ] Production images uploaded to CDN
- [ ] Partner logos finalized
- [ ] CMS content reviewed and approved
- [ ] All links verified

**CMS Content Checklist**:
- [ ] Hero headline and subheadline
- [ ] Billboard banner image and text
- [ ] Trust signals
- [ ] Partner type cards (5)
- [ ] FAQ items (6-10)
- [ ] Pricing card content (4)

**Commands**:
```bash
# Upload images to CDN
aws s3 sync ./assets/images s3://cdn-bucket/advertise/ --acl public-read

# Verify images accessible
curl -I https://cdn.platform.com/advertise/hero-image.jpg
```

### 5. Pre-Deployment Testing (10 minutes)

**Checklist**:
- [ ] Staging deployment successful
- [ ] Staging verification complete
- [ ] Performance audit passed (Lighthouse 90+)
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Cross-browser testing complete

**Commands**:
```bash
# Deploy to staging
npm run deploy:staging

# Run Lighthouse audit on staging
npm run lighthouse -- https://staging.platform.com/advertise

# Run accessibility audit
npm run a11y -- https://staging.platform.com/advertise
```

---

## Deployment Procedure

### Step 1: Create Deployment Tag (2 minutes)

**Purpose**: Tag the release for version tracking

**Commands**:
```bash
# Get current version
VERSION=$(node -p "require('./package.json').version")

# Create git tag
git tag -a "v${VERSION}" -m "Release v${VERSION}: Advertise With Us Landing Page"

# Push tag
git push origin "v${VERSION}"

# Verify tag created
git tag -l "v${VERSION}"
```

**Expected Output**:
```
v1.0.0
```

### Step 2: Build Production Bundle (3 minutes)

**Purpose**: Create optimized production build

**Commands**:
```bash
# Clean previous builds
rm -rf dist/

# Install dependencies (clean install)
npm ci

# Build for production
NODE_ENV=production npm run build

# Verify build output
ls -lh dist/
du -sh dist/
```

**Expected Output**:
```
dist/
├── assets/
│   ├── main-[hash].js      (~200KB gzipped)
│   ├── main-[hash].css     (~50KB gzipped)
│   └── ...
├── index.html
└── ...

Total: ~300KB gzipped
```

**Quality Checks**:
```bash
# Check bundle size
npm run analyze

# Verify no source maps in production
! grep -r "sourceMappingURL" dist/

# Verify environment variables embedded
grep -q "platform.com" dist/assets/main-*.js
```

### Step 3: Deploy to Production (5 minutes)

**Purpose**: Upload build to production servers

#### Option A: AWS S3 + CloudFront

```bash
# Sync to S3 bucket
aws s3 sync dist/ s3://production-bucket/advertise/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# Upload index.html with short cache
aws s3 cp dist/index.html s3://production-bucket/advertise/index.html \
  --cache-control "public, max-age=300, must-revalidate"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/advertise/*"
```

#### Option B: Vercel

```bash
# Deploy to Vercel
vercel --prod

# Or using Vercel CLI with specific project
vercel deploy --prod --name advertise-landing
```

#### Option C: Netlify

```bash
# Deploy to Netlify
netlify deploy --prod --dir=dist

# Or using Netlify CLI
netlify deploy --prod --site=advertise-landing
```

#### Option D: Kubernetes

```bash
# Build Docker image
docker build -t advertise-landing:v1.0.0 .

# Push to registry
docker push registry.platform.com/advertise-landing:v1.0.0

# Update Kubernetes deployment
kubectl set image deployment/advertise-landing \
  advertise-landing=registry.platform.com/advertise-landing:v1.0.0 \
  -n production

# Verify rollout
kubectl rollout status deployment/advertise-landing -n production
```

**Expected Output**:
```
deployment "advertise-landing" successfully rolled out
```

### Step 4: Verify Deployment (3 minutes)

**Purpose**: Confirm deployment successful

**Commands**:
```bash
# Check HTTP status
curl -I https://platform.com/advertise

# Verify content
curl -s https://platform.com/advertise | grep -q "Advertise With Us"

# Check assets loading
curl -I https://platform.com/assets/main-[hash].js

# Run automated verification
./scripts/verify-deployment.sh
```

**Expected Output**:
```
HTTP/2 200
content-type: text/html
✅ Deployment verified successfully!
```

### Step 5: Warm CDN Cache (2 minutes)

**Purpose**: Pre-populate CDN cache for faster initial loads

**Commands**:
```bash
# Warm cache for main page
curl https://platform.com/advertise > /dev/null

# Warm cache for critical assets
curl https://cdn.platform.com/advertise/hero-image.jpg > /dev/null
curl https://cdn.platform.com/advertise/billboard-image.jpg > /dev/null

# Warm cache for different viewports (if using responsive images)
curl -H "User-Agent: Mobile" https://platform.com/advertise > /dev/null
```

### Step 6: Enable Monitoring (2 minutes)

**Purpose**: Activate monitoring and alerts

**Commands**:
```bash
# Enable Sentry monitoring
curl -X POST https://sentry.io/api/0/projects/advertise-landing/enable/

# Enable uptime monitoring
curl -X POST https://api.uptimerobot.com/v2/newMonitor \
  -d "api_key=[REDACTED]" \
  -d "url=https://platform.com/advertise" \
  -d "friendly_name=Advertise Landing Page"

# Verify monitoring active
curl https://sentry.io/api/0/projects/advertise-landing/stats/
```

---

## Verification Steps

### Automated Verification (2 minutes)

**Run automated verification script**:

```bash
#!/bin/bash
# verify-deployment.sh

set -e

echo "🔍 Starting deployment verification..."

# 1. Check page loads
echo "✓ Checking page accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://platform.com/advertise)
if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Page not accessible (HTTP $HTTP_CODE)"
  exit 1
fi

# 2. Check critical assets
echo "✓ Checking critical assets..."
curl -f https://platform.com/assets/main.js > /dev/null 2>&1 || {
  echo "❌ Main JS not found"
  exit 1
}

# 3. Check SEO meta tags
echo "✓ Checking SEO meta tags..."
PAGE_CONTENT=$(curl -s https://platform.com/advertise)
echo "$PAGE_CONTENT" | grep -q "Advertise With Us" || {
  echo "❌ Title tag missing"
  exit 1
}

# 4. Check structured data
echo "✓ Checking structured data..."
echo "$PAGE_CONTENT" | grep -q "application/ld+json" || {
  echo "❌ Structured data missing"
  exit 1
}

# 5. Check analytics
echo "✓ Checking analytics..."
echo "$PAGE_CONTENT" | grep -q "G-" || {
  echo "❌ Analytics not found"
  exit 1
}

# 6. Check performance
echo "✓ Checking performance..."
LOAD_TIME=$(curl -s -o /dev/null -w "%{time_total}" https://platform.com/advertise)
if (( $(echo "$LOAD_TIME > 3.0" | bc -l) )); then
  echo "⚠️  Warning: Slow load time ($LOAD_TIME seconds)"
fi

echo "✅ All checks passed!"
echo "📊 Load time: ${LOAD_TIME}s"
```

### Manual Verification (5 minutes)

**Functional Testing**:

1. **Page Load**
   - [ ] Open https://platform.com/advertise
   - [ ] Page loads in < 2 seconds
   - [ ] No console errors
   - [ ] All images load

2. **Hero Section**
   - [ ] Headline visible
   - [ ] Billboard banner displays
   - [ ] Primary CTA clickable → Goes to `/role-selection`
   - [ ] Secondary CTA clickable → Goes to `/contact`

3. **Partner Selection**
   - [ ] 5 partner type cards visible
   - [ ] Cards have hover effect
   - [ ] Clicking card navigates to sub-landing page

4. **Value Proposition**
   - [ ] 4 feature blocks visible
   - [ ] Fade-up animation on scroll
   - [ ] Icons display correctly

5. **How It Works**
   - [ ] 3 process steps visible
   - [ ] Sequential numbering correct
   - [ ] CTA button clickable

6. **Features Grid**
   - [ ] 6 feature tiles visible
   - [ ] Hover lift animation works
   - [ ] Responsive grid layout

7. **Social Proof**
   - [ ] Metrics display with count-up animation
   - [ ] Partner logos visible (if available)

8. **Pricing Preview**
   - [ ] 4 pricing cards visible
   - [ ] Cards clickable → Navigate to pricing page
   - [ ] "View Full Pricing" CTA works

9. **Final CTA**
   - [ ] Headline and subtext visible
   - [ ] Both CTAs clickable

10. **FAQ**
    - [ ] FAQ items visible
    - [ ] Accordion expands/collapses
    - [ ] Only one item open at a time

11. **Mobile Sticky CTA** (mobile only)
    - [ ] Appears after scrolling past hero
    - [ ] Clickable → Goes to `/role-selection`
    - [ ] Dismissible

**Analytics Verification**:

1. **Open GA4 Real-time Report**
   - [ ] Page view event appears
   - [ ] Device type correct
   - [ ] Location correct

2. **Test Event Tracking**
   - [ ] Click primary CTA → `cta_click` event fires
   - [ ] Click partner type → `partner_type_click` event fires
   - [ ] Scroll to bottom → `scroll_depth` events fire
   - [ ] Expand FAQ → `faq_expand` event fires

3. **Verify Event Parameters**
   - [ ] `device_type` present
   - [ ] `session_id` present
   - [ ] `timestamp` present

**Performance Verification**:

```bash
# Run Lighthouse audit
npm run lighthouse -- https://platform.com/advertise

# Expected scores:
# Performance: 90+
# Accessibility: 95+
# Best Practices: 100
# SEO: 100
```

**Accessibility Verification**:

1. **Keyboard Navigation**
   - [ ] Tab through all interactive elements
   - [ ] Focus indicators visible
   - [ ] Enter/Space activates elements

2. **Screen Reader** (optional but recommended)
   - [ ] Open with NVDA/JAWS/VoiceOver
   - [ ] Navigate through page
   - [ ] All content announced correctly

**Cross-Browser Verification**:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Rollback Procedure

### When to Rollback

Rollback immediately if:
- Page returns 500 errors
- Critical functionality broken (CTAs not working)
- Analytics completely broken
- Performance severely degraded (> 5s load time)
- Security vulnerability discovered

Consider rollback if:
- Minor functionality broken (FAQ not expanding)
- Analytics partially broken (some events not firing)
- Performance moderately degraded (2-3s load time)
- High error rate in monitoring (> 5%)

### Quick Rollback (2 minutes)

**Automated Rollback**:

```bash
# Rollback to previous version
npm run rollback:production

# Or manually
git revert HEAD
git push origin main
npm run deploy:production
```

### Manual Rollback (5 minutes)

#### Option A: AWS S3 + CloudFront

```bash
# List previous versions
aws s3api list-object-versions \
  --bucket production-bucket \
  --prefix advertise/

# Restore previous version
aws s3api copy-object \
  --bucket production-bucket \
  --copy-source production-bucket/advertise/index.html?versionId=PREVIOUS_VERSION_ID \
  --key advertise/index.html

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/advertise/*"
```

#### Option B: Kubernetes

```bash
# Rollback deployment
kubectl rollout undo deployment/advertise-landing -n production

# Verify rollback
kubectl rollout status deployment/advertise-landing -n production

# Check pods
kubectl get pods -n production -l app=advertise-landing
```

#### Option C: Vercel/Netlify

```bash
# Vercel: Rollback to previous deployment
vercel rollback

# Netlify: Restore previous deploy
netlify deploy --restore PREVIOUS_DEPLOY_ID
```

### Post-Rollback Actions

1. **Verify Rollback Successful**
   ```bash
   curl -I https://platform.com/advertise
   ./scripts/verify-deployment.sh
   ```

2. **Notify Stakeholders**
   - Post in #engineering-alerts Slack channel
   - Update status page
   - Notify product team

3. **Investigate Root Cause**
   - Review error logs
   - Check monitoring dashboards
   - Analyze failed deployment

4. **Document Incident**
   - Create incident report
   - Document root cause
   - Document resolution steps
   - Schedule post-mortem

---

## Troubleshooting

### Issue: Deployment Fails

**Symptoms**: Build fails, deployment command errors

**Diagnosis**:
```bash
# Check build logs
npm run build 2>&1 | tee build.log

# Check for TypeScript errors
npm run type-check

# Check for linting errors
npm run lint
```

**Solutions**:
1. Fix TypeScript/linting errors
2. Verify all dependencies installed
3. Check environment variables set correctly
4. Verify deployment credentials valid

### Issue: Page Returns 404

**Symptoms**: https://platform.com/advertise returns 404

**Diagnosis**:
```bash
# Check if files uploaded
aws s3 ls s3://production-bucket/advertise/

# Check routing configuration
cat vercel.json  # or netlify.toml
```

**Solutions**:
1. Verify files uploaded to correct location
2. Check routing configuration
3. Verify CDN cache invalidated
4. Check DNS configuration

### Issue: Assets Not Loading

**Symptoms**: Images or JS/CSS files return 404

**Diagnosis**:
```bash
# Check asset paths in HTML
curl -s https://platform.com/advertise | grep -o 'src="[^"]*"'

# Check if assets exist
curl -I https://platform.com/assets/main-[hash].js
```

**Solutions**:
1. Verify assets uploaded to CDN
2. Check asset paths in build
3. Verify CORS headers configured
4. Check CDN cache status

### Issue: Analytics Not Tracking

**Symptoms**: No events in GA4 real-time

**Diagnosis**:
```bash
# Check if analytics ID in page
curl -s https://platform.com/advertise | grep "G-"

# Check browser console for errors
# (manual check in browser)

# Verify GTM container loaded
curl -s https://platform.com/advertise | grep "GTM-"
```

**Solutions**:
1. Verify analytics ID correct in environment variables
2. Check ad blockers disabled
3. Verify GTM container published
4. Check browser console for errors
5. Test in incognito mode

### Issue: Slow Performance

**Symptoms**: Page load time > 3 seconds

**Diagnosis**:
```bash
# Measure load time
curl -s -o /dev/null -w "Time: %{time_total}s\n" https://platform.com/advertise

# Run Lighthouse audit
npm run lighthouse -- https://platform.com/advertise

# Check bundle size
npm run analyze
```

**Solutions**:
1. Verify CDN caching enabled
2. Check bundle size (should be < 500KB gzipped)
3. Verify lazy loading working
4. Check server response time
5. Verify image optimization enabled

### Issue: CMS Content Not Loading

**Symptoms**: Page shows default content instead of CMS content

**Diagnosis**:
```bash
# Check CMS API
curl -H "Authorization: Bearer $CMS_API_KEY" \
  https://cms.platform.com/api/advertise_page_content

# Check browser console for errors
# (manual check in browser)
```

**Solutions**:
1. Verify CMS API key valid
2. Check CMS API endpoint correct
3. Verify content published in CMS
4. Check CORS headers on CMS API
5. Verify network connectivity to CMS

---

## Post-Deployment Monitoring

### First 15 Minutes

**Monitor**:
- [ ] Error rate in Sentry
- [ ] Page views in GA4 real-time
- [ ] Response time in uptime monitor
- [ ] Server resources (CPU, memory)

**Alert Thresholds**:
- Error rate > 1%
- Response time > 3 seconds
- Uptime < 99%

### First 2 Hours

**Monitor**:
- [ ] Conversion rates (CTA clicks)
- [ ] Bounce rate
- [ ] Average session duration
- [ ] Core Web Vitals

**Alert Thresholds**:
- Bounce rate > 50%
- CTA click rate < 3%
- LCP > 2.5s

### First 24 Hours

**Monitor**:
- [ ] Total page views
- [ ] Unique visitors
- [ ] Traffic sources
- [ ] Device breakdown

**Review**:
- [ ] Error logs
- [ ] Performance trends
- [ ] User feedback
- [ ] Analytics reports

---

## Success Criteria

Deployment is considered successful when:

- [x] Page loads successfully (HTTP 200)
- [x] All CTAs navigate correctly
- [x] Analytics tracking working
- [x] No critical errors in monitoring
- [x] Performance meets targets (Lighthouse 90+)
- [x] Accessibility compliant (WCAG AA)
- [x] Cross-browser compatible
- [x] Mobile responsive
- [x] SEO optimized
- [x] Error rate < 1%

---

## Contacts

**Engineering Team**:
- Slack: #engineering-support
- Email: engineering@platform.com
- On-call: +27 XX XXX XXXX

**DevOps Team**:
- Slack: #devops-alerts
- Email: devops@platform.com
- On-call: +27 XX XXX XXXX

**Product Team**:
- Slack: #product-support
- Email: product@platform.com

---

**Runbook Version**: 1.0.0  
**Last Updated**: December 10, 2025  
**Next Review**: After first production deployment
