# 🌐 Domain Configuration Guide
## Adding propertylistifysa.co.za to Your Real Estate Portal

This guide walks you through adding your newly purchased domain **propertylistifysa.co.za** to your production deployment.

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Domain purchased and access to DNS management (propertylistifysa.co.za)
- ✅ Access to your Vercel dashboard (for frontend hosting)
- ✅ Access to your Railway dashboard (for backend API)
- ✅ Project deployed on both platforms

---

## 🎯 Step 1: Configure Vercel (Frontend)

### 1.1 Add Domain to Vercel Project

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your `real_estate_portal` project

2. **Add Custom Domain**
   - Click on **Settings** → **Domains**
   - Click **Add Domain**
   - Enter: `propertylistifysa.co.za`
   - Click **Add**

3. **Add www Subdomain (Recommended)**
   - Add another domain: `www.propertylistifysa.co.za`
   - Vercel will automatically redirect www to the apex domain

### 1.2 Configure DNS Records

Vercel will provide you with DNS configuration instructions. You need to add these records to your domain registrar:

**For Apex Domain (propertylistifysa.co.za):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www Subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 1.3 Update Environment Variables in Vercel

1. Go to **Settings** → **Environment Variables**
2. Add/Update the following variables for **Production**:

```bash
# Update API URL to point to your Railway backend
VITE_API_URL=https://your-railway-app.up.railway.app

# Update app configuration
VITE_APP_TITLE=PropertyListify SA
```

3. **Redeploy** your project after updating environment variables:
   - Go to **Deployments**
   - Click on the latest deployment
   - Click **Redeploy**

---

## 🚂 Step 2: Configure Railway (Backend API)

### 2.1 Add Custom Domain to Railway

1. **Go to Railway Dashboard**
   - Navigate to: https://railway.app/dashboard
   - Select your backend project

2. **Add Custom Domain**
   - Go to **Settings** → **Domains**
   - Click **+ Custom Domain**
   - Enter: `api.propertylistifysa.co.za`
   - Railway will provide CNAME records

### 2.2 Configure DNS for API Subdomain

Add this DNS record to your domain registrar:

```
Type: CNAME
Name: api
Value: <your-railway-provided-cname>
```

**Example:**
```
Type: CNAME
Name: api
Value: realestateportal-production.up.railway.app
```

### 2.3 Update Railway Environment Variables

In your Railway project, update these environment variables:

```bash
# CORS Configuration - Allow requests from your domain
CORS_ORIGIN=https://propertylistifysa.co.za,https://www.propertylistifysa.co.za

# Frontend URL (for email links, redirects, etc.)
FRONTEND_URL=https://propertylistifysa.co.za
```

### 2.4 Update Vercel API URL

After Railway domain is configured, update Vercel environment variables:

1. Go back to **Vercel** → **Settings** → **Environment Variables**
2. Update `VITE_API_URL`:
```
VITE_API_URL=https://api.propertylistifysa.co.za
```
3. **Redeploy** the frontend

---

## 🔐 Step 3: SSL/HTTPS Configuration

Both Vercel and Railway automatically provision SSL certificates for custom domains:

- **Vercel**: Provides Let's Encrypt SSL automatically
- **Railway**: Provides SSL certificates automatically

**Verification:**
- Wait 5-10 minutes after DNS propagation
- Visit `https://propertylistifysa.co.za` - should show secure padlock
- Visit `https://api.propertylistifysa.co.za/health` - should show secure padlock

---

## 📱 Step 4: Update Application Configuration

### 4.1 Update Meta Tags and SEO

Edit `client/index.html`:

```html
<!-- Add Open Graph tags for social sharing -->
<meta property="og:site_name" content="PropertyListify SA">
<meta property="og:url" content="https://propertylistifysa.co.za">
<meta property="og:type" content="website">
<meta property="og:title" content="PropertyListify SA - South Africa's Fastest Growing Real Estate Platform">
<meta property="og:description" content="Discover your dream property in South Africa. Browse residential, commercial, and development properties across all major cities.">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@PropertyListifySA">
<meta name="twitter:title" content="PropertyListify SA">

<!-- Canonical URL -->
<link rel="canonical" href="https://propertylistifysa.co.za">
```

### 4.2 Create robots.txt

Create `client/public/robots.txt`:

```txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /api/
Disallow: /auth/

Sitemap: https://propertylistifysa.co.za/sitemap.xml
```

### 4.3 Create sitemap.xml (Optional but Recommended)

Create `client/public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://propertylistifysa.co.za/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://propertylistifysa.co.za/properties</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://propertylistifysa.co.za/developments</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://propertylistifysa.co.za/explore</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://propertylistifysa.co.za/advertise</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

### 4.4 Update Environment Files

Update `.env.production`:

```bash
NODE_ENV=production
VITE_APP_TITLE=PropertyListify SA
VITE_API_URL=https://api.propertylistifysa.co.za
```

---

## 🧪 Step 5: Testing & Verification

### 5.1 DNS Propagation Check

Use these tools to verify DNS propagation:
- https://dnschecker.org
- https://www.whatsmydns.net

Enter your domain and check that A/CNAME records are resolving correctly globally.

### 5.2 Test Frontend

```bash
# Test main domain
curl -I https://propertylistifysa.co.za

# Expected: 200 OK with SSL certificate
```

### 5.3 Test API Backend

```bash
# Test API subdomain
curl https://api.propertylistifysa.co.za/health

# Expected: {"status": "ok"} or similar health check response
```

### 5.4 Browser Testing Checklist

Open your browser and test:

- [ ] `https://propertylistifysa.co.za` loads correctly
- [ ] `https://www.propertylistifysa.co.za` redirects to apex domain
- [ ] SSL certificate shows as valid (green padlock)
- [ ] Login/authentication works
- [ ] Property listings load
- [ ] Image uploads work (if using AWS S3)
- [ ] API calls work (check browser DevTools → Network tab)
- [ ] No CORS errors in console

---

## 🎨 Step 6: Google Services Configuration

### 6.1 Google Search Console

1. **Add Property**
   - Go to: https://search.google.com/search-console
   - Click **Add Property**
   - Enter: `https://propertylistifysa.co.za`
   - Verify ownership (use HTML file or DNS verification)

2. **Submit Sitemap**
   - In Search Console, go to **Sitemaps**
   - Enter: `https://propertylistifysa.co.za/sitemap.xml`
   - Click **Submit**

### 6.2 Google Analytics (If Used)

Update your Google Analytics property to track the new domain:
- Go to **Admin** → **Property Settings**
- Update **Website URL** to `https://propertylistifysa.co.za`

### 6.3 Google Maps API Restrictions

Update your Google Maps API key restrictions:

1. Go to **Google Cloud Console** → **Credentials**
2. Edit your Maps API key
3. Under **Application restrictions** → **HTTP referrers**
4. Add:
   - `propertylistifysa.co.za/*`
   - `*.propertylistifysa.co.za/*`

---

## 📧 Step 7: Email Configuration (If Using Resend)

Update email links in your templates to use the new domain:

In Railway environment variables:
```bash
FROM_EMAIL=noreply@propertylistifysa.co.za
FRONTEND_URL=https://propertylistifysa.co.za
```

**Note:** You'll need to verify your domain with Resend to send emails from `@propertylistifysa.co.za`

---

## 🔄 Step 8: Update Social Media & Other Services

Update your domain across all platforms:

### Social Media Links
- [ ] Facebook Business Page
- [ ] Twitter/X Profile
- [ ] Instagram Bio/Link
- [ ] LinkedIn Company Page

### Third-Party Services
- [ ] Stripe (if using) - Update authorized domains
- [ ] AWS S3 CORS policy (if using)
- [ ] Any payment gateways
- [ ] Any analytics tools

---

## 🚀 Quick Deployment Checklist

### Before Domain Goes Live:

1. **Vercel Configuration**
   - [ ] Domain added to Vercel project
   - [ ] DNS records configured (A & CNAME)
   - [ ] Environment variables updated
   - [ ] SSL certificate provisioned

2. **Railway Configuration**
   - [ ] Custom domain added (api.propertylistifysa.co.za)
   - [ ] DNS CNAME configured
   - [ ] CORS_ORIGIN updated
   - [ ] FRONTEND_URL updated

3. **Application Updates**
   - [ ] Meta tags updated in index.html
   - [ ] robots.txt created
   - [ ] sitemap.xml created
   - [ ] Environment files updated

4. **Testing**
   - [ ] DNS propagation complete
   - [ ] Frontend loads on new domain
   - [ ] API accessible via subdomain
   - [ ] Authentication works
   - [ ] No CORS errors
   - [ ] Images/assets load correctly

5. **SEO & Analytics**
   - [ ] Google Search Console configured
   - [ ] Sitemap submitted
   - [ ] Google Maps API restrictions updated
   - [ ] Analytics tracking working

---

## 🛠️ Troubleshooting

### DNS Not Propagating
- **Wait Time**: DNS can take 24-48 hours to fully propagate globally
- **Local Cache**: Clear your DNS cache (`ipconfig /flushdns` on Windows)
- **Use Mobile Data**: Test on mobile network to bypass local DNS

### SSL Certificate Issues
- **Wait**: SSL provisioning can take 5-10 minutes after DNS propagation
- **Force HTTPS**: Ensure Vercel has "Force HTTPS" enabled in settings

### CORS Errors
- **Check Railway**: Verify `CORS_ORIGIN` includes your domain
- **Protocol**: Ensure you're using `https://` not `http://`
- **Exact Match**: CORS requires exact domain match (no trailing slash)

### API Not Accessible
- **DNS**: Verify CNAME record for api.propertylistifysa.co.za
- **Railway**: Check Railway logs for errors
- **Environment**: Verify `VITE_API_URL` in Vercel points to correct Railway domain

### Images Not Loading
- **AWS S3**: Update bucket CORS policy to allow your domain
- **CloudFront**: Update CloudFront distribution allowed origins

---

## 📚 Additional Resources

- [Vercel Custom Domains Documentation](https://vercel.com/docs/concepts/projects/custom-domains)
- [Railway Custom Domains Guide](https://docs.railway.app/deploy/exposing-your-app#custom-domains)
- [DNS Propagation Checker](https://dnschecker.org)
- [SSL Checker](https://www.ssllabs.com/ssltest/)

---

## 🎉 Next Steps After Domain is Live

1. **Marketing**
   - Update business cards with new domain
   - Update marketing materials
   - Send announcement email to users

2. **SEO**
   - Monitor Google Search Console for indexing
   - Set up Google Analytics goals
   - Create backlinks to new domain

3. **Monitoring**
   - Set up uptime monitoring (e.g., UptimeRobot)
   - Monitor error logs in Railway/Vercel
   - Track performance metrics

---

**🎊 Congratulations!** Your domain **propertylistifysa.co.za** is now live and ready to serve South African property seekers!
