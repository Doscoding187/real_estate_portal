# 🚀 Quick Domain Setup Checklist
## propertylistifysa.co.za

Use this checklist to track your progress when setting up your new domain.

---

## 📋 Pre-Setup
- [ ] Domain registered (propertylistifysa.co.za) ✅
- [ ] Access to domain registrar DNS settings
- [ ] Vercel account with deployed project
- [ ] Railway account with deployed backend

---

## 🎯 Vercel Frontend Setup

### Domain Configuration
- [ ] Add `propertylistifysa.co.za` to Vercel project
- [ ] Add `www.propertylistifysa.co.za` to Vercel project
- [ ] Configure DNS A record: `@ → 76.76.21.21`
- [ ] Configure DNS CNAME: `www → cname.vercel-dns.com`
- [ ] Wait for DNS propagation (use dnschecker.org)
- [ ] Verify SSL certificate is active

### Environment Variables (Vercel → Settings → Environment Variables)
- [ ] Update `VITE_API_URL` to Railway backend URL
- [ ] Set `VITE_APP_TITLE=PropertyListify SA`
- [ ] Redeploy after env variable changes

---

## 🚂 Railway Backend Setup

### Domain Configuration
- [ ] Add custom domain `api.propertylistifysa.co.za` in Railway
- [ ] Get Railway CNAME value
- [ ] Configure DNS CNAME: `api → [railway-provided-value]`
- [ ] Wait for DNS propagation
- [ ] Verify SSL certificate is active

### Environment Variables (Railway)
- [ ] Set `CORS_ORIGIN=https://propertylistifysa.co.za,https://www.propertylistifysa.co.za`
- [ ] Set `FRONTEND_URL=https://propertylistifysa.co.za`
- [ ] Verify other env vars are correct

### Update Vercel After Railway Domain Setup
- [ ] Go back to Vercel → Environment Variables
- [ ] Update `VITE_API_URL=https://api.propertylistifysa.co.za`
- [ ] Redeploy Vercel project

---

## 📱 Application Updates

### SEO Files (Already Created ✅)
- [x] `client/public/robots.txt` created
- [x] `client/public/sitemap.xml` created
- [x] `client/index.html` updated with meta tags

### Deployment
- [ ] Commit changes: `git add .`
- [ ] Commit: `git commit -m "Add domain configuration and SEO"`
- [ ] Push: `git push origin main`
- [ ] Verify auto-deployment on Vercel

---

## 🧪 Testing & Verification

### DNS & SSL
- [ ] Check DNS propagation: https://dnschecker.org
- [ ] Test `https://propertylistifysa.co.za` (should load)
- [ ] Test `https://www.propertylistifysa.co.za` (should redirect)
- [ ] Verify SSL certificate (green padlock in browser)
- [ ] Test `https://api.propertylistifysa.co.za/health`

### Functionality Testing
- [ ] Homepage loads correctly
- [ ] Property listings display
- [ ] Search functionality works
- [ ] User login/authentication works
- [ ] Property details page loads
- [ ] Image uploads work (if applicable)
- [ ] No CORS errors in browser console
- [ ] Mobile responsive design works

### API Testing
Open browser DevTools (F12) → Network tab:
- [ ] API calls going to `api.propertylistifysa.co.za`
- [ ] No 404 errors
- [ ] No CORS errors
- [ ] Authentication tokens working

---

## 🎨 Google Services

### Google Maps API
- [ ] Go to Google Cloud Console → Credentials
- [ ] Edit Maps API key
- [ ] Add HTTP referrer: `propertylistifysa.co.za/*`
- [ ] Add HTTP referrer: `*.propertylistifysa.co.za/*`
- [ ] Save changes

### Google Search Console
- [ ] Add property: `https://propertylistifysa.co.za`
- [ ] Verify ownership (DNS or HTML file method)
- [ ] Submit sitemap: `https://propertylistifysa.co.za/sitemap.xml`
- [ ] Request indexing for homepage

### Google Analytics (If Used)
- [ ] Update property settings with new domain
- [ ] Verify tracking code works on new domain
- [ ] Test event tracking

---

## 📧 Email Configuration

### Resend (If Using)
- [ ] Verify domain in Resend dashboard
- [ ] Add DNS records for email verification
- [ ] Update `FROM_EMAIL=noreply@propertylistifysa.co.za`
- [ ] Test email sending (registration, password reset)

---

## 🔐 Third-Party Services

### Stripe (If Using)
- [ ] Update authorized domains in Stripe dashboard
- [ ] Add: `https://propertylistifysa.co.za`
- [ ] Test payment flow

### AWS S3 (If Using)
- [ ] Update S3 bucket CORS policy
- [ ] Add allowed origin: `https://propertylistifysa.co.za`
- [ ] Test image uploads

---

## 🌐 Social Media & Marketing

### Update Links
- [ ] Facebook business page
- [ ] Twitter/X profile
- [ ] Instagram bio
- [ ] LinkedIn company page
- [ ] Business cards
- [ ] Email signatures

---

## 🎉 Go Live!

### Final Checks
- [ ] All checklist items above completed
- [ ] Test on desktop browser
- [ ] Test on mobile browser
- [ ] Test on different networks (home, mobile data)
- [ ] Share link with team for testing

### Announce
- [ ] Send announcement to stakeholders
- [ ] Update marketing materials
- [ ] Post on social media
- [ ] Update Google My Business (if applicable)

---

## 📊 Post-Launch Monitoring

### Week 1
- [ ] Monitor Vercel analytics
- [ ] Monitor Railway logs for errors
- [ ] Check Google Search Console for crawl errors
- [ ] Monitor uptime (consider UptimeRobot)
- [ ] Review user feedback

### Week 2-4
- [ ] Check SEO rankings
- [ ] Monitor traffic in Analytics
- [ ] Review sitemap coverage in Search Console
- [ ] Build backlinks to new domain

---

## 🆘 Emergency Contacts

**DNS Issues:**
- Domain Registrar Support: [Add contact info]
- DNS Propagation Checker: https://dnschecker.org

**Hosting Issues:**
- Vercel Support: https://vercel.com/support
- Railway Support: https://railway.app/help

**Quick Rollback:**
If critical issue, temporarily update Vercel DNS to point back to old setup while investigating.

---

## 📝 Notes

Record any domain-specific information here:

**Domain Registrar:** _____________________

**Nameservers:** _____________________

**Important Dates:**
- Domain purchased: _____________________
- DNS configured: _____________________
- Go-live date: _____________________

**Railway Backend URL:** _____________________

**Vercel Project:** _____________________

---

**Current Status:** 🟡 In Progress

Update this to:
- 🟡 In Progress
- 🟢 Live
- 🔴 Issues
