# Payload CMS Setup Guide

This guide explains how to integrate Payload CMS with the Advertise With Us landing page.

## Overview

The CMS integration is designed to work with Payload CMS out of the box. You just need to:
1. Set up your Payload CMS instance
2. Create the content collection
3. Configure the client

## 1. Install Payload CMS

If you don't have Payload CMS set up yet:

```bash
npx create-payload-app
```

Or add to existing project:

```bash
npm install payload
```

## 2. Create the Advertise Page Collection

Create a new collection in your Payload config (`payload.config.ts`):

```typescript
import { buildConfig } from 'payload/config';

export default buildConfig({
  collections: [
    {
      slug: 'advertise-page',
      admin: {
        useAsTitle: 'title',
      },
      access: {
        read: () => true, // Public read access
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          defaultValue: 'Advertise With Us Page',
        },
        // Hero Section
        {
          name: 'hero',
          type: 'group',
          fields: [
            {
              name: 'headline',
              type: 'text',
              required: true,
              maxLength: 70,
              minLength: 50,
            },
            {
              name: 'subheadline',
              type: 'textarea',
              required: true,
              maxLength: 150,
              minLength: 100,
            },
            {
              name: 'primaryCTA',
              type: 'group',
              fields: [
                { name: 'text', type: 'text', required: true },
                { name: 'href', type: 'text', required: true },
              ],
            },
            {
              name: 'secondaryCTA',
              type: 'group',
              fields: [
                { name: 'text', type: 'text', required: true },
                { name: 'href', type: 'text', required: true },
              ],
            },
            {
              name: 'trustSignals',
              type: 'array',
              fields: [
                { name: 'text', type: 'text', required: true },
              ],
            },
          ],
        },
        // Partner Types
        {
          name: 'partnerTypes',
          type: 'array',
          required: true,
          fields: [
            { name: 'id', type: 'text', required: true },
            { name: 'title', type: 'text', required: true },
            { name: 'icon', type: 'text', required: true },
            { name: 'benefit', type: 'textarea', required: true },
            { name: 'ctaText', type: 'text', required: true },
            { name: 'href', type: 'text', required: true },
          ],
        },
        // Features
        {
          name: 'features',
          type: 'array',
          required: true,
          fields: [
            { name: 'id', type: 'text', required: true },
            { name: 'icon', type: 'text', required: true },
            { name: 'headline', type: 'text', required: true },
            {
              name: 'description',
              type: 'textarea',
              required: true,
              maxLength: 120,
              minLength: 80,
            },
          ],
        },
        // How It Works
        {
          name: 'howItWorks',
          type: 'group',
          fields: [
            { name: 'headline', type: 'text', required: true },
            { name: 'subheadline', type: 'textarea' },
            {
              name: 'steps',
              type: 'array',
              required: true,
              fields: [
                { name: 'id', type: 'text', required: true },
                { name: 'number', type: 'number', required: true },
                { name: 'icon', type: 'text', required: true },
                { name: 'title', type: 'text', required: true },
                { name: 'description', type: 'textarea', required: true },
              ],
            },
            {
              name: 'cta',
              type: 'group',
              fields: [
                { name: 'text', type: 'text', required: true },
                { name: 'href', type: 'text', required: true },
              ],
            },
          ],
        },
        // Features Grid
        {
          name: 'featuresGrid',
          type: 'array',
          required: true,
          fields: [
            { name: 'id', type: 'text', required: true },
            { name: 'icon', type: 'text', required: true },
            { name: 'title', type: 'text', required: true },
            { name: 'description', type: 'textarea', required: true },
          ],
        },
        // Metrics
        {
          name: 'metrics',
          type: 'array',
          required: true,
          fields: [
            { name: 'id', type: 'text', required: true },
            { name: 'value', type: 'text', required: true },
            { name: 'label', type: 'text', required: true },
            { name: 'icon', type: 'text' },
          ],
        },
        // Partner Logos
        {
          name: 'partnerLogos',
          type: 'array',
          fields: [
            { name: 'id', type: 'text', required: true },
            { name: 'name', type: 'text', required: true },
            { name: 'logoUrl', type: 'text', required: true },
          ],
        },
        // Pricing Categories
        {
          name: 'pricingCategories',
          type: 'array',
          required: true,
          fields: [
            { name: 'id', type: 'text', required: true },
            { name: 'title', type: 'text', required: true },
            { name: 'description', type: 'textarea', required: true },
            { name: 'startingPrice', type: 'text' },
            { name: 'href', type: 'text', required: true },
          ],
        },
        // Final CTA
        {
          name: 'finalCTA',
          type: 'group',
          fields: [
            { name: 'headline', type: 'text', required: true },
            { name: 'subtext', type: 'textarea' },
            {
              name: 'primaryCTA',
              type: 'group',
              fields: [
                { name: 'text', type: 'text', required: true },
                { name: 'href', type: 'text', required: true },
              ],
            },
            {
              name: 'secondaryCTA',
              type: 'group',
              fields: [
                { name: 'text', type: 'text', required: true },
                { name: 'href', type: 'text', required: true },
              ],
            },
          ],
        },
        // FAQs
        {
          name: 'faqs',
          type: 'array',
          required: true,
          fields: [
            { name: 'id', type: 'text', required: true },
            { name: 'question', type: 'text', required: true },
            {
              name: 'answer',
              type: 'textarea',
              required: true,
              maxLength: 300,
              minLength: 150,
            },
          ],
        },
      ],
    },
  ],
});
```

## 3. Configure the Client

Update your app to use Payload CMS:

```typescript
// In your app initialization or environment config
import { CMSClientFactory } from '@/services/cms/cmsClient';

// Configure Payload CMS client
const cmsClient = CMSClientFactory.getClient('payload', {
  apiUrl: process.env.VITE_PAYLOAD_API_URL || 'http://localhost:3000',
  apiKey: process.env.VITE_PAYLOAD_API_KEY, // Optional, for authenticated requests
});
```

## 4. Environment Variables

Add to your `.env` file:

```bash
# Payload CMS Configuration
VITE_PAYLOAD_API_URL=http://localhost:3000
VITE_PAYLOAD_API_KEY=your-api-key-here  # Optional
```

For production:

```bash
VITE_PAYLOAD_API_URL=https://your-payload-cms.com
VITE_PAYLOAD_API_KEY=your-production-api-key
```

## 5. Using the CMS

The existing hooks and components will work automatically:

```typescript
import { useAdvertiseCMS } from '@/hooks/useAdvertiseCMS';

function MyComponent() {
  const { content, loading, error, updateContent } = useAdvertiseCMS();
  
  // Content is automatically fetched from Payload CMS
  return <div>{content.hero.headline}</div>;
}
```

## 6. Admin Panel Access

Access your Payload CMS admin panel at:
- Local: `http://localhost:3000/admin`
- Production: `https://your-payload-cms.com/admin`

## API Endpoints

The integration uses these Payload API endpoints:

- **GET** `/api/advertise-page` - Fetch content
- **PATCH** `/api/advertise-page` - Update content

## Content Validation

All content is automatically validated before saving:
- Headlines: 50-70 characters
- Subheadlines: 100-150 characters
- Feature descriptions: 80-120 characters
- FAQ answers: 150-300 characters

## Caching

Content is cached for 5 minutes by default. To adjust:

```typescript
const cmsClient = CMSClientFactory.getClient('payload', {
  apiUrl: process.env.VITE_PAYLOAD_API_URL,
  cacheEnabled: true,
  cacheTTL: 10 * 60 * 1000, // 10 minutes
});
```

## Switching Between Providers

To switch back to local storage:

```typescript
const cmsClient = CMSClientFactory.getClient('local');
```

To use Contentful (when implemented):

```typescript
const cmsClient = CMSClientFactory.getClient('contentful', {
  apiUrl: 'https://cdn.contentful.com',
  spaceId: 'your-space-id',
  apiKey: 'your-api-key',
});
```

## Troubleshooting

### CORS Issues

If you encounter CORS errors, configure Payload CMS:

```typescript
// payload.config.ts
export default buildConfig({
  cors: [
    'http://localhost:5173', // Your Vite dev server
    'https://your-production-domain.com',
  ],
  // ... rest of config
});
```

### Authentication

For authenticated requests, ensure your API key has proper permissions in Payload CMS.

### Content Not Updating

Clear the cache manually:

```typescript
import { cmsClient } from '@/services/cms';

cmsClient.clearCache();
```

## Next Steps

1. Set up your Payload CMS instance
2. Create the advertise-page collection
3. Add your environment variables
4. Test the integration locally
5. Deploy to production

For more information, visit:
- [Payload CMS Documentation](https://payloadcms.com/docs)
- [Payload REST API](https://payloadcms.com/docs/rest-api/overview)
