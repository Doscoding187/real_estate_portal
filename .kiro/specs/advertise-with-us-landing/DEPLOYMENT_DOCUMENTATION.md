# Deployment Documentation - Advertise With Us Landing Page

**Version**: 1.0.0  
**Last Updated**: December 10, 2025  
**Requirements**: 10.5

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [CMS Configuration](#cms-configuration)
3. [Analytics Setup](#analytics-setup)
4. [Deployment Checklist](#deployment-checklist)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Alerts](#monitoring--alerts)

---

## Environment Variables

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Application
VITE_APP_NAME="Property Platform"
VITE_APP_URL="https://platform.com"
VITE_API_BASE_URL="https://api.platform.com"

# Analytics
VITE_ANALYTICS_ID="UA-XXXXXXXXX-X"
VITE_ANALYTICS_ENABLED="true"
VITE_GTM_ID="GTM-XXXXXXX"

# CMS (Payload CMS)
VITE_CMS_API_URL="https://cms.platform.com/api"
VITE_CMS_API_KEY="your-cms-api-key-here"
VITE_CMS_ENABLED="true"

# Image CDN
VITE_IMAGE_CDN_URL="https://cdn.platform.com"
VITE_IMAGE_OPTIMIZATION_ENABLED="true"

# Error Monitoring (Sentry)
VITE_SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
VITE_SENTRY_ENVIRONMENT="production"
VITE_SENTRY_ENABLED="true"

# Feature Flags
VITE_FEATURE_CMS_CONTENT="true"
VITE_FEATURE_ANALYTICS="true"
VITE_FEATURE_ERROR_MONITORING="true"

# Performance
VITE_ENABLE_LAZY_LOADING="true"
VITE_ENABLE_CODE_SPLITTING="true"
VITE_ENABLE_IMAGE_OPTIMIZATION="true"

# SEO
VITE_SITE_NAME="Property Platform"
VITE_SITE_DESCRIPTION="South Africa's leading property marketplace"
VITE_SITE_LOGO="https://platform.com/logo.png"
VITE_TWITTER_HANDLE="@propertyplatform"
```

### Environment Variable Validation

Before deployment, validate all environment variables:

```bash
# Run validation script
npm run validate:env

# Or manually check
node scripts/validate-env.js
```

### Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use environment-specific files**: `.env.development`, `.env.staging`, `.env.production`
3. **Rotate API keys** regularly (every 90 days)
4. **Use secrets management** for sensitive values (AWS Secrets Manager, Vault)
5. **Restrict API key permissions** to minimum required scope

---

## CMS Configuration

### Payload CMS Setup

The landing page supports dynamic content management through Payload CMS.

#### 1. CMS Collections

Create the following collections in Payload CMS:

**Collection: `advertise_page_content`**
```typescript
{
  slug: 'advertise_page_content',
  fields: [
    {
      name: 'hero',
      type: 'group',
      fields: [
        { name: 'headline', type: 'text', required: true, maxLength: 70 },
        { name: 'subheadline', type: 'textarea', required: true, maxLength: 150 },
        { name: 'primaryCTALabel', type: 'text', required: true },
        { name: 'primaryCTAHref', type: 'text', required: true },
        { name: 'secondaryCTALabel', type: 'text', required: true },
        { name: 'secondaryCTAHref', type: 'text', required: true },
      ]
    },
    {
      name: 'billboard',
      type: 'group',
      fields: [
        { name: 'imageUrl', type: 'upload', relationTo: 'media', required: true },
        { name: 'developmentName', type: 'text', required: true },
        { name: 'tagline', type: 'text', required: true },
        { name: 'ctaLabel', type: 'text' },
        { name: 'href', type: 'text', required: true },
      ]
    },
    {
      name: 'trustSignals',
      type: 'array',
      fields: [
        { name: 'type', type: 'select', options: ['text', 'logo'] },
        { name: 'content', type: 'text' },
        { name: 'imageUrl', type: 'upload', relationTo: 'media' },
      ]
    },
    {
      name: 'partnerTypes',
      type: 'array',
      fields: [
        { name: 'icon', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'benefit', type: 'text', required: true, maxLength: 120 },
        { name: 'href', type: 'text', required: true },
      ]
    },
    {
      name: 'faqs',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true, maxLength: 300 },
        { name: 'order', type: 'number', required: true },
      ]
    },
  ]
}
```

#### 2. CMS API Configuration

Configure the CMS API client:

```typescript
// client/src/services/cms/cmsClient.ts
import { CMSClient } from './cmsClient';

const cmsClient = new CMSClient({
  apiUrl: import.meta.env.VITE_CMS_API_URL,
  apiKey: import.meta.env.VITE_CMS_API_KEY,
  enabled: import.meta.env.VITE_CMS_ENABLED === 'true',
});

export default cmsClient;
```

#### 3. Content Validation

All CMS content is validated before rendering:

```typescript
// client/src/services/cms/contentValidator.ts
import { validateContent } from './contentValidator';

// Validates:
// - Headline length (50-70 characters)
// - Subheadline length (100-150 characters)
// - Feature descriptions (80-120 characters)
// - FAQ answers (150-300 characters)
// - Required fields present
// - Valid URLs
```

#### 4. Fallback Content

If CMS is unavailable, the page uses default content:

```typescript
// client/src/services/cms/defaultContent.ts
export const defaultContent = {
  hero: {
    headline: "Reach High-Intent Property Buyers Across South Africa",
    subheadline: "Advertise your properties...",
    // ... full default content
  }
};
```

#### 5. CMS Admin Access

**Admin URL**: `https://cms.platform.com/admin`

**Default Credentials** (change immediately):
- Username: `admin@platform.com`
- Password: `[Set during CMS setup]`

**User Roles**:
- **Super Admin**: Full access to all collections
- **Content Editor**: Edit advertise page content only
- **Viewer**: Read-only access

#### 6. Content Publishing Workflow

1. **Draft**: Content is saved but not published
2. **Review**: Content is submitted for review
3. **Published**: Content is live on the site
4. **Scheduled**: Content is scheduled for future publication

**Cache Invalidation**: When content is published, the CDN cache is automatically invalidated.

### CMS Documentation

Full CMS documentation available at:
- **Setup Guide**: `.kiro/specs/advertise-with-us-landing/PAYLOAD_CMS_SETUP.md`
- **Quick Start**: `.kiro/specs/advertise-with-us-landing/CMS_QUICK_START.md`
- **Integration Guide**: `.kiro/specs/advertise-with-us-landing/CMS_INTEGRATION_COMPLETE.md`

---

## Analytics Setup

### Google Analytics 4 (GA4)

#### 1. Create GA4 Property

1. Go to [Google Analytics](https://analytics.google.com)
2. Create new GA4 property
3. Set up data stream for website
4. Copy Measurement ID (format: `G-XXXXXXXXXX`)
5. Add to `VITE_ANALYTICS_ID` environment variable

#### 2. Configure Events

The following custom events are tracked:

**Page Events**:
- `page_view` - Automatic on page load
- `scroll_depth` - At 25%, 50%, 75%, 100%

**CTA Events**:
- `cta_click` - All CTA button clicks
  - Parameters: `label`, `location`, `partner_type`

**Partner Selection**:
- `partner_type_click` - Partner type card clicks
  - Parameters: `partner_type`, `location`

**Pricing**:
- `pricing_card_click` - Pricing card clicks
  - Parameters: `category`

**FAQ**:
- `faq_expand` - FAQ accordion interactions
  - Parameters: `question`, `index`

**Mobile CTA**:
- `mobile_sticky_cta_view` - Sticky CTA becomes visible
- `mobile_sticky_cta_click` - Sticky CTA clicked

#### 3. Event Parameters

All events include:
- `device_type`: 'mobile' | 'tablet' | 'desktop'
- `session_id`: Unique session identifier
- `timestamp`: Event timestamp
- `user_id`: User ID (if authenticated)
- `referrer`: Referrer URL (if available)

#### 4. GA4 Dashboard Setup

Create custom reports for:
1. **CTA Performance**: Click-through rates by location
2. **Partner Type Interest**: Most clicked partner types
3. **Scroll Depth**: User engagement metrics
4. **FAQ Engagement**: Most viewed questions
5. **Mobile CTA Performance**: Sticky CTA effectiveness

### Google Tag Manager (GTM)

#### 1. Create GTM Container

1. Go to [Google Tag Manager](https://tagmanager.google.com)
2. Create new container
3. Copy Container ID (format: `GTM-XXXXXXX`)
4. Add to `VITE_GTM_ID` environment variable

#### 2. Install GTM Code

GTM is automatically installed via `PerformanceOptimizer` component.

#### 3. Configure Tags

**GA4 Configuration Tag**:
- Tag Type: Google Analytics: GA4 Configuration
- Measurement ID: `{{ GA4 Measurement ID }}`
- Trigger: All Pages

**Event Tags**:
- Create tags for each custom event
- Use Data Layer variables for parameters

#### 4. Data Layer

Events are pushed to the data layer:

```javascript
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'cta_click',
  label: 'Get Started',
  location: 'hero',
  device_type: 'desktop',
  // ... other parameters
});
```

### Analytics Testing

#### 1. Development Testing

Use GA4 Debug Mode:

```bash
# Enable debug mode
VITE_ANALYTICS_DEBUG=true npm run dev
```

View events in real-time:
- GA4 Admin → DebugView
- Chrome DevTools → Network → Filter: `google-analytics`

#### 2. Staging Testing

Test on staging environment:
1. Deploy to staging
2. Verify events in GA4 DebugView
3. Check event parameters
4. Validate custom dimensions

#### 3. Production Verification

After deployment:
1. Check GA4 Real-time reports
2. Verify event counts
3. Monitor for errors
4. Review custom reports

### Analytics Documentation

Full analytics documentation:
- **Implementation**: `client/src/lib/analytics/advertiseTracking.ts`
- **Quick Reference**: `.kiro/specs/advertise-with-us-landing/ANALYTICS_QUICK_REFERENCE.md`
- **Test File**: `client/src/lib/analytics/__tests__/advertiseTracking.test.ts`

---

## Deployment Checklist

### Pre-Deployment

#### Code Quality
- [ ] All tests passing (`npm run test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Bundle size acceptable (< 500KB gzipped)

#### Content
- [ ] Replace placeholder images with production assets
- [ ] Update partner logos with actual logos
- [ ] Finalize all copy and content
- [ ] Review FAQ content
- [ ] Verify all links work

#### Configuration
- [ ] Environment variables set
- [ ] CMS configured and tested
- [ ] Analytics tracking verified
- [ ] Error monitoring configured
- [ ] CDN configured for images

#### Testing
- [ ] Manual testing on staging
- [ ] Cross-browser testing complete
- [ ] Mobile device testing complete
- [ ] Accessibility audit passed
- [ ] Performance audit passed (Lighthouse 90+)
- [ ] SEO audit passed

#### Documentation
- [ ] README updated
- [ ] API documentation current
- [ ] Deployment guide reviewed
- [ ] Runbook created

### Deployment Steps

#### 1. Build Production Bundle

```bash
# Install dependencies
npm ci

# Run tests
npm run test

# Build for production
npm run build

# Verify build
ls -lh dist/
```

#### 2. Deploy to Staging

```bash
# Deploy to staging environment
npm run deploy:staging

# Verify deployment
curl https://staging.platform.com/advertise
```

#### 3. Staging Verification

- [ ] Page loads successfully
- [ ] All sections render correctly
- [ ] CTAs navigate properly
- [ ] Analytics events fire
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Performance acceptable

#### 4. Deploy to Production

```bash
# Deploy to production
npm run deploy:production

# Or use CI/CD pipeline
git tag v1.0.0
git push origin v1.0.0
```

#### 5. Production Verification

- [ ] Page loads successfully
- [ ] All sections render correctly
- [ ] CTAs navigate properly
- [ ] Analytics events fire
- [ ] No console errors
- [ ] CDN serving assets
- [ ] SSL certificate valid

### Post-Deployment

#### Immediate Checks (0-15 minutes)
- [ ] Page accessible at production URL
- [ ] No 404 or 500 errors
- [ ] Analytics tracking working
- [ ] Error monitoring receiving data
- [ ] CDN cache warming complete

#### Short-term Monitoring (15 minutes - 2 hours)
- [ ] Monitor error rates
- [ ] Check analytics real-time reports
- [ ] Review performance metrics
- [ ] Monitor server resources
- [ ] Check user feedback channels

#### Long-term Monitoring (2+ hours)
- [ ] Review conversion rates
- [ ] Analyze user behavior
- [ ] Monitor performance trends
- [ ] Check SEO rankings
- [ ] Review error logs

---

## Post-Deployment Verification

### Automated Verification Script

```bash
#!/bin/bash
# verify-deployment.sh

echo "🔍 Verifying deployment..."

# Check page loads
echo "✓ Checking page accessibility..."
curl -f https://platform.com/advertise || exit 1

# Check critical assets
echo "✓ Checking critical assets..."
curl -f https://platform.com/assets/main.js || exit 1
curl -f https://platform.com/assets/main.css || exit 1

# Check analytics
echo "✓ Checking analytics..."
curl -f https://www.google-analytics.com/analytics.js || exit 1

# Check SEO meta tags
echo "✓ Checking SEO meta tags..."
curl -s https://platform.com/advertise | grep -q "Advertise With Us" || exit 1

# Check structured data
echo "✓ Checking structured data..."
curl -s https://platform.com/advertise | grep -q "application/ld+json" || exit 1

echo "✅ Deployment verified successfully!"
```

Run verification:

```bash
chmod +x verify-deployment.sh
./verify-deployment.sh
```

### Manual Verification Checklist

#### Page Load
- [ ] Page loads in < 2 seconds
- [ ] No console errors
- [ ] No 404 errors for assets
- [ ] Images load correctly
- [ ] Fonts load correctly

#### Functionality
- [ ] All CTAs clickable
- [ ] Partner type cards navigate
- [ ] FAQ accordion works
- [ ] Mobile sticky CTA appears
- [ ] Forms submit correctly

#### Analytics
- [ ] Page view tracked
- [ ] CTA clicks tracked
- [ ] Scroll depth tracked
- [ ] FAQ interactions tracked
- [ ] Events appear in GA4 real-time

#### SEO
- [ ] Meta tags present
- [ ] Structured data valid
- [ ] Canonical URL correct
- [ ] Open Graph tags present
- [ ] Twitter Card tags present

#### Performance
- [ ] Lighthouse score 90+
- [ ] Core Web Vitals pass
- [ ] Images optimized
- [ ] Code splitting working
- [ ] Lazy loading working

#### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus indicators visible
- [ ] Color contrast passes
- [ ] ARIA labels present

---

## Rollback Procedures

### Quick Rollback

If critical issues are discovered:

```bash
# Rollback to previous version
npm run rollback:production

# Or manually
git revert HEAD
git push origin main
npm run deploy:production
```

### Rollback Scenarios

#### Scenario 1: Page Not Loading

**Symptoms**: 500 errors, blank page, infinite loading

**Actions**:
1. Check error monitoring dashboard
2. Review server logs
3. Verify environment variables
4. Rollback to previous version
5. Investigate root cause

#### Scenario 2: Analytics Not Tracking

**Symptoms**: No events in GA4, missing data

**Actions**:
1. Verify analytics ID in environment
2. Check GTM container status
3. Review browser console for errors
4. Test in incognito mode
5. If critical, rollback; otherwise, hotfix

#### Scenario 3: Performance Degradation

**Symptoms**: Slow page load, high bounce rate

**Actions**:
1. Check CDN status
2. Review server resources
3. Analyze bundle size
4. Check for memory leaks
5. If severe, rollback; otherwise, optimize

#### Scenario 4: Broken CTAs

**Symptoms**: CTAs not navigating, 404 errors

**Actions**:
1. Verify routing configuration
2. Check link URLs
3. Test in multiple browsers
4. If widespread, rollback; otherwise, hotfix

### Rollback Communication

**Internal Communication**:
1. Notify engineering team
2. Update status page
3. Document incident
4. Schedule post-mortem

**External Communication** (if needed):
1. Update social media
2. Send email to partners
3. Update help center
4. Provide ETA for resolution

---

## Monitoring & Alerts

### Error Monitoring (Sentry)

#### Setup

```typescript
// client/src/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  enabled: import.meta.env.VITE_SENTRY_ENABLED === 'true',
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter out non-critical errors
    if (event.level === 'warning') return null;
    return event;
  },
});
```

#### Alerts

Configure alerts for:
- **Error Rate**: > 1% of requests
- **Performance**: LCP > 2.5s
- **Availability**: Uptime < 99.9%

### Performance Monitoring

#### Core Web Vitals

Monitor:
- **LCP (Largest Contentful Paint)**: Target < 2.5s
- **FID (First Input Delay)**: Target < 100ms
- **CLS (Cumulative Layout Shift)**: Target < 0.1

#### Custom Metrics

Track:
- Page load time
- Time to interactive
- Bundle size
- API response times

### Analytics Monitoring

#### Key Metrics

Monitor:
- **Page views**: Daily trend
- **Bounce rate**: Target < 40%
- **CTA click-through rate**: Target > 5%
- **Scroll depth**: Average depth
- **Session duration**: Average time on page

#### Alerts

Set up alerts for:
- **Traffic drop**: > 20% decrease
- **Bounce rate spike**: > 50% increase
- **CTA performance**: < 3% CTR
- **Error rate**: > 1% of sessions

### Uptime Monitoring

#### Tools

Use:
- **Pingdom**: HTTP monitoring
- **UptimeRobot**: Uptime checks
- **StatusCake**: Performance monitoring

#### Checks

Monitor:
- **HTTP status**: Every 1 minute
- **Response time**: Every 5 minutes
- **SSL certificate**: Daily
- **DNS resolution**: Every 15 minutes

#### Alerts

Alert on:
- **Downtime**: > 1 minute
- **Slow response**: > 3 seconds
- **SSL expiry**: < 30 days
- **DNS issues**: Immediate

---

## Support & Troubleshooting

### Common Issues

#### Issue: Page Not Loading

**Symptoms**: Blank page, 404 error

**Solutions**:
1. Check browser console for errors
2. Verify URL is correct
3. Clear browser cache
4. Try incognito mode
5. Check server status

#### Issue: Analytics Not Tracking

**Symptoms**: No data in GA4

**Solutions**:
1. Verify analytics ID
2. Check ad blockers disabled
3. Test in incognito mode
4. Review browser console
5. Check GTM container

#### Issue: Images Not Loading

**Symptoms**: Broken image icons

**Solutions**:
1. Check CDN status
2. Verify image URLs
3. Check CORS headers
4. Review network tab
5. Test image URLs directly

#### Issue: Slow Performance

**Symptoms**: Long load times

**Solutions**:
1. Check network speed
2. Review bundle size
3. Verify CDN caching
4. Check server resources
5. Run Lighthouse audit

### Support Contacts

**Engineering Team**:
- Email: engineering@platform.com
- Slack: #engineering-support
- On-call: +27 XX XXX XXXX

**DevOps Team**:
- Email: devops@platform.com
- Slack: #devops-alerts
- On-call: +27 XX XXX XXXX

**Product Team**:
- Email: product@platform.com
- Slack: #product-support

---

## Appendix

### Useful Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm run preview            # Preview production build
npm run test               # Run tests
npm run lint               # Lint code
npm run type-check         # Check TypeScript

# Deployment
npm run deploy:staging     # Deploy to staging
npm run deploy:production  # Deploy to production
npm run rollback           # Rollback deployment

# Monitoring
npm run lighthouse         # Run Lighthouse audit
npm run analyze            # Analyze bundle size
npm run validate:env       # Validate environment variables
```

### File Locations

```
client/src/
├── pages/
│   └── AdvertiseWithUs.tsx          # Main page
├── components/advertise/
│   ├── HeroSection.tsx              # Hero component
│   ├── PartnerSelectionSection.tsx  # Partner selection
│   ├── SEOHead.tsx                  # SEO meta tags
│   └── ...                          # Other components
├── lib/
│   ├── analytics/
│   │   └── advertiseTracking.ts     # Analytics implementation
│   └── monitoring/
│       └── sentry.ts                # Error monitoring
└── services/cms/
    ├── cmsClient.ts                 # CMS API client
    └── defaultContent.ts            # Fallback content
```

### External Resources

- **Design System**: [Figma Link]
- **API Documentation**: [API Docs URL]
- **CMS Admin**: https://cms.platform.com/admin
- **Analytics Dashboard**: [GA4 Dashboard URL]
- **Error Monitoring**: [Sentry Dashboard URL]
- **Status Page**: https://status.platform.com

---

**Document Version**: 1.0.0  
**Last Updated**: December 10, 2025  
**Next Review**: Before next major deployment
