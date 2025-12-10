# Quick Deployment Checklist

**Use this checklist for rapid deployment verification**

---

## Pre-Deployment (5 minutes)

### Code Quality
- [ ] `npm run test` - All tests pass
- [ ] `npm run lint` - No linting errors
- [ ] `npm run build` - Build succeeds
- [ ] Bundle size < 500KB gzipped

### Environment
- [ ] `.env.production` file created
- [ ] All required env vars set
- [ ] API keys valid and not expired
- [ ] CMS connection tested

### Content
- [ ] Production images uploaded
- [ ] Partner logos finalized
- [ ] All copy reviewed
- [ ] Links verified

---

## Deployment (2 minutes)

```bash
# 1. Build
npm run build

# 2. Deploy
npm run deploy:production

# 3. Verify
curl https://platform.com/advertise
```

---

## Post-Deployment (3 minutes)

### Immediate Checks
- [ ] Page loads (< 2 seconds)
- [ ] No console errors
- [ ] All CTAs clickable
- [ ] Analytics firing
- [ ] Mobile responsive

### Quick Tests
- [ ] Click "Get Started" CTA → Goes to `/role-selection`
- [ ] Click partner type card → Goes to sub-landing
- [ ] Scroll to bottom → Sticky CTA appears (mobile)
- [ ] Open FAQ → Accordion expands
- [ ] Check GA4 real-time → Events appearing

---

## Rollback (if needed)

```bash
npm run rollback:production
```

---

## Monitoring URLs

- **Live Page**: https://platform.com/advertise
- **Analytics**: [GA4 Dashboard]
- **Errors**: [Sentry Dashboard]
- **Status**: https://status.platform.com

---

## Emergency Contacts

- **Engineering**: #engineering-support
- **DevOps**: #devops-alerts
- **On-call**: +27 XX XXX XXXX

---

**Total Time**: ~10 minutes  
**Last Updated**: December 10, 2025
