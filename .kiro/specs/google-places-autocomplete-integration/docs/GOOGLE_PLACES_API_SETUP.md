# Google Places API Setup and Configuration

## Overview

This guide covers the complete setup and configuration of Google Places API for the Property Listify platform. The integration provides intelligent location autocomplete, geocoding, and location page generation.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Console Setup](#google-cloud-console-setup)
3. [API Key Configuration](#api-key-configuration)
4. [Environment Variables](#environment-variables)
5. [API Restrictions and Security](#api-restrictions-and-security)
6. [Billing and Quotas](#billing-and-quotas)
7. [Testing the Setup](#testing-the-setup)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up Google Places API, ensure you have:

- A Google Cloud Platform (GCP) account
- A GCP project created
- Billing enabled on your GCP project
- Admin access to the Property Listify codebase
- Access to environment variable configuration (`.env` files or deployment platform)

---

## Google Cloud Console Setup

### Step 1: Create or Select a Project

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Either select an existing project or click "New Project"
4. Name your project (e.g., "Property Listify Production")
5. Click "Create"

### Step 2: Enable Required APIs

Enable the following APIs for your project:

1. **Places API** (New)
   - Go to "APIs & Services" > "Library"
   - Search for "Places API (New)"
   - Click "Enable"

2. **Geocoding API**
   - Search for "Geocoding API"
   - Click "Enable"

3. **Maps JavaScript API** (for map previews)
   - Search for "Maps JavaScript API"
   - Click "Enable"

### Step 3: Create API Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key immediately
4. Click "Edit API Key" to configure restrictions

---

## API Key Configuration

### Recommended Restrictions

For **production environments**, apply these restrictions:

#### Application Restrictions

**Option A: HTTP Referrers (for web applications)**
```
https://yourdomain.com/*
https://www.yourdomain.com/*
```

**Option B: IP Addresses (for server-side calls)**
```
YOUR_SERVER_IP_ADDRESS
```

#### API Restrictions

Restrict the key to only these APIs:
- Places API (New)
- Geocoding API
- Maps JavaScript API

### Development vs Production Keys

**Best Practice**: Use separate API keys for development and production

**Development Key:**
- Less restrictive (allow localhost)
- Lower quotas
- Easier debugging

**Production Key:**
- Strict domain/IP restrictions
- Higher quotas
- Monitoring enabled

---

## Environment Variables

### Required Environment Variables

Add these to your `.env` file:

```bash
# Google Places API Configuration
GOOGLE_PLACES_API_KEY=your_api_key_here

# Optional: Country restriction (default: ZA for South Africa)
GOOGLE_PLACES_COUNTRY_RESTRICTION=ZA

# Optional: Autocomplete debounce delay in milliseconds (default: 300)
AUTOCOMPLETE_DEBOUNCE_MS=300

# Optional: Cache TTL in seconds (default: 300 = 5 minutes)
AUTOCOMPLETE_CACHE_TTL_SECONDS=300
```

### Environment-Specific Configuration

#### Development (.env.local)
```bash
GOOGLE_PLACES_API_KEY=AIzaSy...dev_key
GOOGLE_PLACES_COUNTRY_RESTRICTION=ZA
AUTOCOMPLETE_DEBOUNCE_MS=300
AUTOCOMPLETE_CACHE_TTL_SECONDS=300
```

#### Production (.env.production)
```bash
GOOGLE_PLACES_API_KEY=AIzaSy...prod_key
GOOGLE_PLACES_COUNTRY_RESTRICTION=ZA
AUTOCOMPLETE_DEBOUNCE_MS=300
AUTOCOMPLETE_CACHE_TTL_SECONDS=600
```

### Deployment Platform Configuration

#### Vercel
```bash
vercel env add GOOGLE_PLACES_API_KEY
# Enter your API key when prompted
```

#### Railway
```bash
railway variables set GOOGLE_PLACES_API_KEY=your_api_key_here
```

#### Heroku
```bash
heroku config:set GOOGLE_PLACES_API_KEY=your_api_key_here
```

---

## API Restrictions and Security

### Security Best Practices

1. **Never commit API keys to version control**
   - Add `.env` to `.gitignore`
   - Use environment variables
   - Rotate keys regularly

2. **Apply strict restrictions**
   - Limit to specific domains/IPs
   - Restrict to required APIs only
   - Monitor usage regularly

3. **Use separate keys per environment**
   - Development
   - Staging
   - Production

4. **Enable API key restrictions**
   ```
   Application restrictions: HTTP referrers
   Allowed referrers:
   - https://yourdomain.com/*
   - https://www.yourdomain.com/*
   
   API restrictions: Restrict key
   - Places API (New)
   - Geocoding API
   - Maps JavaScript API
   ```

### Rate Limiting

The service implements automatic rate limiting:

- **Debouncing**: 300ms delay between autocomplete requests
- **Caching**: 5-minute cache for duplicate queries
- **Session Tokens**: Groups related requests for billing optimization

---

## Billing and Quotas

### Pricing Overview (as of 2024)

**Places API (New) - Autocomplete:**
- $2.83 per 1,000 requests (session-based)
- First $200/month free (Google Cloud credit)

**Places API (New) - Place Details:**
- $17.00 per 1,000 requests (Basic Data)
- Included in session when following autocomplete

**Geocoding API:**
- $5.00 per 1,000 requests
- First $200/month free

### Cost Optimization Strategies

1. **Session Token Management**
   - Groups autocomplete + place details into single session
   - Reduces cost by ~40%

2. **Response Caching**
   - 5-minute cache for autocomplete results
   - Reduces duplicate API calls
   - Target: 60%+ cache hit rate

3. **Request Debouncing**
   - 300ms delay prevents excessive requests
   - Reduces API calls by ~70% during typing

4. **Field Masking**
   - Only request needed fields in Place Details
   - Reduces cost per request

### Setting Quotas

1. Go to "APIs & Services" > "Quotas"
2. Search for "Places API"
3. Set daily quotas:
   - **Development**: 1,000 requests/day
   - **Production**: 10,000 requests/day (adjust based on traffic)

### Monitoring Usage

1. Go to "APIs & Services" > "Dashboard"
2. View usage graphs for each API
3. Set up budget alerts:
   - Go to "Billing" > "Budgets & alerts"
   - Create budget (e.g., $100/month)
   - Set alert at 80% threshold

---

## Testing the Setup

### 1. Verify API Key

Test your API key with a simple curl request:

```bash
curl "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Sandton&key=YOUR_API_KEY&components=country:za"
```

Expected response:
```json
{
  "predictions": [
    {
      "description": "Sandton, Johannesburg, South Africa",
      "place_id": "ChIJ...",
      ...
    }
  ],
  "status": "OK"
}
```

### 2. Test in Application

Run the development server:

```bash
npm run dev
```

Navigate to a page with location autocomplete and:
1. Type "Sandton" in the location field
2. Verify suggestions appear
3. Select a suggestion
4. Verify address fields populate correctly

### 3. Check API Monitoring

View API usage in the application:

```bash
# Navigate to monitoring dashboard
http://localhost:5000/api/google-places/monitoring/dashboard
```

### 4. Verify Caching

Check Redis cache (if configured):

```bash
redis-cli
> KEYS places:*
> GET places:autocomplete:sandton:ZA
```

---

## Troubleshooting

### Common Issues

#### 1. "API key not valid" Error

**Symptoms:**
- 403 Forbidden responses
- Error: "API key not valid. Please pass a valid API key."

**Solutions:**
- Verify API key is correct in `.env`
- Check API key restrictions (domain/IP)
- Ensure Places API is enabled in GCP Console
- Wait 5 minutes after creating/modifying key

#### 2. "REQUEST_DENIED" Status

**Symptoms:**
- API returns `status: "REQUEST_DENIED"`
- No suggestions appear

**Solutions:**
- Enable billing on GCP project
- Enable required APIs (Places API, Geocoding API)
- Check API key restrictions
- Verify API key has access to Places API

#### 3. No Suggestions Appearing

**Symptoms:**
- Autocomplete dropdown remains empty
- No errors in console

**Solutions:**
- Check minimum input length (3 characters)
- Verify debounce delay (300ms)
- Check network tab for API calls
- Verify session token is being created
- Check browser console for errors

#### 4. Slow Response Times

**Symptoms:**
- Suggestions take >2 seconds to appear
- Poor user experience

**Solutions:**
- Check network latency
- Verify caching is working (Redis or in-memory)
- Reduce debounce delay (not recommended below 200ms)
- Check API response times in monitoring dashboard

#### 5. High API Costs

**Symptoms:**
- Unexpected billing charges
- High request counts

**Solutions:**
- Verify session tokens are being used
- Check cache hit rate (should be >60%)
- Ensure debouncing is working
- Review API usage in monitoring dashboard
- Set up budget alerts

### Debug Mode

Enable debug logging:

```bash
# Add to .env
NODE_ENV=development
DEBUG=google-places:*
```

View detailed logs:
```bash
npm run dev
# Check console for detailed API logs
```

### Support Resources

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Google Cloud Support](https://cloud.google.com/support)
- [Stack Overflow - Google Places API](https://stackoverflow.com/questions/tagged/google-places-api)

---

## Next Steps

After completing the setup:

1. Review the [Developer Guide](./DEVELOPER_GUIDE.md) for component usage
2. Check the [API Documentation](./API_DOCUMENTATION.md) for service methods
3. Review the [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) for common issues
4. Set up [API Monitoring](./API_MONITORING.md) for production

---

## Checklist

- [ ] Google Cloud project created
- [ ] Places API enabled
- [ ] Geocoding API enabled
- [ ] Maps JavaScript API enabled
- [ ] API key created
- [ ] API key restrictions configured
- [ ] Environment variables set
- [ ] Billing enabled
- [ ] Quotas configured
- [ ] Budget alerts set up
- [ ] API key tested with curl
- [ ] Application tested with autocomplete
- [ ] Monitoring dashboard accessible
- [ ] Caching verified (Redis or in-memory)
- [ ] Documentation reviewed
