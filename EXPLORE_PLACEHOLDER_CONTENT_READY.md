# Explore Placeholder Content - Ready to View

## What Was Added

I've added comprehensive placeholder content to the Explore feature so you can see how it looks in real-time without needing backend data.

### New File Created
- `client/src/data/explorePlaceholderData.ts` - Centralized placeholder data including:
  - **10 Properties** - Luxury homes across SA (Sandton, Cape Town, Durban, Pretoria)
  - **5 Videos** - Property tour placeholders with view counts
  - **5 Neighbourhoods** - Popular areas with stats (Sandton, Camps Bay, Umhlanga, etc.)
  - **3 Market Insights** - Investment tips and market trends

### Updated Hooks
- `usePersonalizedContent.ts` - Now shows placeholder sections when no backend data
- `useDiscoveryFeed.ts` - Falls back to placeholder content blocks
- `ExploreFeed.tsx` - Uses centralized placeholder videos

## How to View

1. Start your dev server: `npm run dev` (or `pnpm dev`)
2. Navigate to `/explore` in your browser
3. You'll see:
   - **Home View**: Personalized sections with properties, videos, neighbourhoods
   - **Cards View**: Discovery card feed with mixed content
   - **Videos View**: TikTok-style property video feed

## Placeholder Content Includes

| Type | Count | Sample Locations |
|------|-------|------------------|
| Properties | 10 | Sandton, V&A Waterfront, Umhlanga, Waterkloof, Camps Bay |
| Videos | 5 | Property tours with view counts (1K-21K views) |
| Neighbourhoods | 5 | With avg prices, property counts, price trends |
| Insights | 3 | Market updates, investment tips, buyer guides |

## Images
All images are from Unsplash (free, high-quality property photos) - no API key needed.

## To Disable Placeholder Data
If you want to see only real backend data, you can pass `usePlaceholder: false` to the hooks:

```tsx
const { sections } = usePersonalizedContent({ usePlaceholder: false });
```
