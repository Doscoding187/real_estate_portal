# CMS Integration for Advertise With Us Page

This directory contains the CMS (Content Management System) integration for the Advertise With Us landing page. The implementation provides a flexible, type-safe way to manage all page content with validation and easy provider swapping.

## Overview

The CMS integration allows all text content on the Advertise With Us page to be managed dynamically, including:

- Hero section (headline, subheadline, CTAs, billboard)
- Partner type cards
- Value proposition features
- How It Works steps
- Features grid
- Social proof (logos, metrics)
- Pricing preview cards
- Final CTA section
- FAQ items

## Architecture

```
cms/
├── types.ts              # TypeScript type definitions
├── cmsClient.ts          # CMS client implementation
├── defaultContent.ts     # Default/fallback content
├── contentValidator.ts   # Content validation logic
├── iconMapper.ts         # Icon name to component mapping
├── index.ts              # Public API exports
└── README.md             # This file
```

## Usage

### Basic Usage

```tsx
import { useAdvertiseCMS } from '@/hooks/useAdvertiseCMS';

function MyComponent() {
  const { content, isLoading, error } = useAdvertiseCMS();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!content) return null;

  return (
    <div>
      <h1>{content.hero.headline}</h1>
      <p>{content.hero.subheadline}</p>
    </div>
  );
}
```

### Section-Specific Hook

```tsx
import { useAdvertiseCMSSection } from '@/hooks/useAdvertiseCMS';

function HeroComponent() {
  const { content, isLoading } = useAdvertiseCMSSection('hero');

  if (isLoading || !content) return <div>Loading...</div>;

  return <h1>{content.headline}</h1>;
}
```

### Updating Content

```tsx
import { useAdvertiseCMS } from '@/hooks/useAdvertiseCMS';

function AdminPanel() {
  const { content, updateContent } = useAdvertiseCMS();

  const handleUpdate = async () => {
    await updateContent({
      hero: {
        ...content.hero,
        headline: 'New Headline',
      },
    });
  };

  return <button onClick={handleUpdate}>Update</button>;
}
```

### Content Validation

```tsx
import { validatePageContent, getValidationSummary } from '@/services/cms';

const result = validatePageContent(content);

if (!result.isValid) {
  console.error('Validation failed:', getValidationSummary(result));
}

// Or throw if invalid
import { assertValidContent } from '@/services/cms';
assertValidContent(content); // Throws if invalid
```

## Validation Rules

Content is automatically validated before saving. The following rules apply:

| Field Type | Min Length | Max Length | Requirement |
|------------|-----------|-----------|-------------|
| Headlines | 50 chars | 70 chars | Req 1.1 |
| Subheadlines | 100 chars | 150 chars | Req 1.1 |
| Feature Descriptions | 80 chars | 120 chars | Req 3.3 |
| FAQ Answers | 150 chars | 300 chars | Req 9.3 |

Validation provides both errors (blocking) and warnings (informational).

## Icon Mapping

Icons are specified by name in the CMS and dynamically loaded:

```tsx
import { getIconByName } from '@/services/cms';

const Icon = getIconByName('Home');
return <Icon className="w-6 h-6" />;
```

Available icons:
- Partner Types: `Home`, `Building2`, `Landmark`, `FileText`, `Wrench`
- Value Prop: `Target`, `Sparkles`, `ShieldCheck`, `LayoutDashboard`
- How It Works: `UserPlus`, `Upload`, `TrendingUp`
- Features: `Megaphone`, `Video`, `Rocket`, `Users`, `UsersRound`, `Image`
- Metrics: `CheckCircle`, `Star`

To add new icons:

```tsx
import { registerIcon } from '@/services/cms';
import { Calendar } from 'lucide-react';

registerIcon('Calendar', Calendar);
```

## CMS Providers

### Local Provider (Default)

The local provider stores content in browser `localStorage`. This is useful for:
- Development and testing
- Simple deployments without a backend CMS
- Quick prototyping

Content is cached in memory with a 5-minute TTL.

### Contentful Provider (Placeholder)

A Contentful integration is stubbed out for future implementation:

```tsx
import { CMSClientFactory } from '@/services/cms';

const client = CMSClientFactory.getClient('contentful', {
  apiUrl: 'https://cdn.contentful.com',
  apiKey: process.env.CONTENTFUL_API_KEY,
  spaceId: process.env.CONTENTFUL_SPACE_ID,
  environment: 'master',
});
```

### Custom Provider

Implement the `ICMSClient` interface to add your own provider:

```tsx
import { ICMSClient, CMSResponse, AdvertisePageContent } from '@/services/cms';

class CustomCMSClient implements ICMSClient {
  async getPageContent(): Promise<CMSResponse<AdvertisePageContent>> {
    // Your implementation
  }

  async updatePageContent(updates: Partial<AdvertisePageContent>): Promise<CMSResponse<AdvertisePageContent>> {
    // Your implementation
  }

  clearCache(): void {
    // Your implementation
  }
}
```

## Admin Interface

A simple admin panel is available at `/advertise-cms-admin`:

Features:
- JSON editor for content
- Real-time validation
- Save/refresh functionality
- Validation rule reference
- Last modified timestamp

## Type Safety

All content is fully typed with TypeScript:

```tsx
import type {
  AdvertisePageContent,
  HeroContent,
  PartnerType,
  FAQ,
  // ... etc
} from '@/services/cms';
```

## Error Handling

The CMS client provides comprehensive error handling:

```tsx
const { content, error } = useAdvertiseCMS();

if (error) {
  console.error('CMS Error:', error.code, error.message);
  // Fallback to default content or show error UI
}
```

Error codes:
- `FETCH_ERROR`: Failed to fetch content
- `UPDATE_ERROR`: Failed to update content
- `VALIDATION_ERROR`: Content validation failed

## Performance

- Content is cached in memory with configurable TTL (default 5 minutes)
- Only fetches from storage/API when cache expires
- Validation runs only on updates, not reads
- Icon components are lazy-loaded

## Testing

```tsx
import { CMSClientFactory } from '@/services/cms';

// Reset client between tests
beforeEach(() => {
  CMSClientFactory.reset();
});

// Use local provider for tests
const client = CMSClientFactory.getClient('local', {
  cacheEnabled: false, // Disable cache for tests
});
```

## Migration Guide

### From Hardcoded Content

1. Replace hardcoded content with CMS hook:

```tsx
// Before
const headline = 'Reach Thousands of Verified Home Seekers';

// After
const { content } = useAdvertiseCMS();
const headline = content?.hero.headline;
```

2. Update component props to accept CMS types:

```tsx
// Before
interface Props {
  headline: string;
}

// After
import type { HeroContent } from '@/services/cms';

interface Props {
  hero: HeroContent;
}
```

3. Handle loading and error states:

```tsx
const { content, isLoading, error } = useAdvertiseCMS();

if (isLoading) return <Skeleton />;
if (error) return <ErrorState error={error} />;
if (!content) return null;
```

## Requirements Mapping

This implementation satisfies the following requirements:

- **Requirement 1.1**: Hero content management (headline, subheadline)
- **Requirement 2.1**: Partner type card management
- **Requirement 6.2**: Metric updates
- **Requirement 9.1**: FAQ management

## Future Enhancements

- [ ] Contentful integration
- [ ] Strapi integration
- [ ] Content versioning
- [ ] Draft/publish workflow
- [ ] Multi-language support
- [ ] Content scheduling
- [ ] Rich text editor
- [ ] Image upload/management
- [ ] Content preview
- [ ] Audit logging

## Support

For questions or issues with the CMS integration, refer to:
- Type definitions in `types.ts`
- Default content examples in `defaultContent.ts`
- Validation rules in `contentValidator.ts`
- Admin panel at `/advertise-cms-admin`
