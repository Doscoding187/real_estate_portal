# 🚀 Explore Feature - Quick Reference

## Setup (One-Time)

```powershell
# Run this once to set up everything
.\scripts\setup-explore-feed.ps1
```

This creates:
- ✅ Database tables (explore_shorts, explore_interactions, etc.)
- ✅ 22 highlight tags (Pool, Secure Estate, Modern Finishes, etc.)
- ✅ 5 sample property shorts with images

## URLs

| Page | URL | Description |
|------|-----|-------------|
| **Feed** | `/explore` | View all explore shorts (TikTok-style) |
| **Upload** | `/explore/upload` | Upload new content |

## Upload Buttons Location

Users can upload from:

1. **Explore Feed** → "Upload" button (top-right corner)
2. **Agent Dashboard** → Sidebar → "Upload to Explore"
3. **Developer Dashboard** → Quick Actions → "Upload to Explore"
4. **Agency Dashboard** → Header → "Upload to Explore"

## Feed Types

Switch between feed types using tabs:

- **For You** (recommended) - Personalized based on performance
- **Area** - Filter by location
- **Category** - Filter by property type/features

## Upload Form Fields

| Field | Required | Max | Description |
|-------|----------|-----|-------------|
| **Title** | ✅ Yes | 255 chars | Property headline |
| **Caption** | ❌ No | 500 chars | Description text |
| **Media** | ✅ Yes | 10 files | Images or videos |
| **Highlights** | ❌ No | 4 tags | Key features |

## Sample Data

After setup, you'll have these 5 shorts:

1. **Stunning 3BR Apartment in Sandton**
2. **Luxury Penthouse with Ocean Views**
3. **Family Home in Secure Estate**
4. **Modern Townhouse - Ready to Move**
5. **Investment Opportunity - New Development**

## Testing Checklist

- [ ] Run setup script
- [ ] Visit `/explore` - see 5 sample shorts
- [ ] Swipe through feed
- [ ] Login as agent/developer
- [ ] Click "Upload" button
- [ ] Upload test property
- [ ] Verify success modal
- [ ] View your upload in feed

## Key Files

### Frontend
- `client/src/pages/ExploreFeed.tsx` - Feed display
- `client/src/pages/ExploreUpload.tsx` - Upload form
- `client/src/components/explore/VideoCard.tsx` - Short card

### Backend
- `server/exploreRouter.ts` - API endpoints
- `server/services/exploreFeedService.ts` - Feed logic
- `server/services/exploreInteractionService.ts` - Tracking

### Scripts
- `scripts/setup-explore-feed.ps1` - One-command setup
- `scripts/seed-explore-shorts-sample.ts` - Sample data
- `scripts/seed-explore-highlight-tags.ts` - Highlight tags

## API Endpoints (tRPC)

```typescript
// Get feed
trpc.explore.getFeed.useQuery({
  feedType: 'recommended',
  limit: 20,
  offset: 0,
})

// Upload short
trpc.explore.uploadShort.useMutation()

// Record interaction
trpc.explore.recordInteraction.mutate({
  shortId: 123,
  interactionType: 'view',
  feedType: 'recommended',
})

// Get highlight tags
trpc.explore.getHighlightTags.useQuery()
```

## Database Tables

- `explore_shorts` - Main content table
- `explore_interactions` - User interactions (views, saves, etc.)
- `explore_highlight_tags` - Available highlight tags
- `explore_user_preferences` - User preferences for recommendations

## Troubleshooting

**"No videos available"**
- Run setup script: `.\scripts\setup-explore-feed.ps1`
- Check database has data: `SELECT * FROM explore_shorts;`

**Upload not working**
- Ensure you're logged in
- Check user has agent or developer profile
- Check browser console for errors

**Feed not loading**
- Check backend is running
- Verify migrations ran successfully
- Check network tab for API errors

## Next Steps

Optional enhancements:

1. **AWS S3** - Store media in cloud storage
2. **Video Player** - Add video controls
3. **Analytics** - Track performance metrics
4. **Listing Link** - Connect to existing listings
5. **Image Optimization** - Compress before upload

---

**Status**: ✅ Ready to Use
**Last Updated**: December 1, 2025

Need help? Check `EXPLORE_UPLOAD_READY.md` for detailed guide.
