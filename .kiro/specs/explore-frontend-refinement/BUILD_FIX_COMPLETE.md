# Explore Frontend - Build Fix Complete

**Date:** December 7, 2025  
**Status:** ✅ Complete

---

## Issue

Build was failing with the following error:

```
Could not load /app/client/src/lib/api-client (imported by client/src/hooks/usePersonalizedContent.ts): 
ENOENT: no such file or directory
```

---

## Root Cause

Three hooks were importing a non-existent `apiClient` from `@/lib/api-client`:
1. `client/src/hooks/usePersonalizedContent.ts`
2. `client/src/hooks/useDiscoveryFeed.ts`
3. `client/src/hooks/useMapHybridView.ts`

These files were trying to use an `exploreApi` router that doesn't exist in the TRPC setup. The correct approach is to use the `explore` router from `@/lib/trpc`.

---

## Solution

### 1. Fixed Import Statements

**Before:**
```typescript
import { apiClient } from '@/lib/api-client';
```

**After:**
```typescript
import { trpc } from '@/lib/trpc';
```

### 2. Updated API Calls

**Before (usePersonalizedContent.ts):**
```typescript
const { data: forYouData, isLoading: forYouLoading } = useQuery({
  queryKey: ['personalizedContent', 'for-you', options.categoryId],
  queryFn: async () => {
    const response = await apiClient.exploreApi.getFeed.query({
      categoryId: options.categoryId,
      limit: 10,
      offset: 0,
    });
    return response;
  },
});
```

**After:**
```typescript
const forYouQuery = trpc.explore.getFeed.useQuery({
  feedType: 'recommended',
  limit: 10,
  offset: 0,
});

const forYouData = forYouQuery.data;
const forYouLoading = forYouQuery.isLoading;
```

### 3. Updated Data Processing

Updated all three hooks to work with the actual TRPC `explore` router response structure, which returns an array of property shorts directly rather than a nested `{ data: { items: [] } }` structure.

---

## Files Modified

1. **client/src/hooks/usePersonalizedContent.ts**
   - Changed import from `apiClient` to `trpc`
   - Updated all 4 feed queries to use `trpc.explore.getFeed.useQuery()`
   - Updated data processing to handle array response structure
   - Removed unused `useQuery` import from `@tanstack/react-query`

2. **client/src/hooks/useDiscoveryFeed.ts**
   - Changed import from `apiClient` to `trpc`
   - Updated feed query to use `trpc.explore.getFeed.useQuery()`
   - Updated engagement mutation to use `trpc.explore.recordInteraction.useMutation()`
   - Fixed mutation parameters to match actual API schema

3. **client/src/hooks/useMapHybridView.ts**
   - Changed import from `apiClient` to `trpc`
   - Updated properties query to use `trpc.explore.getFeed.useQuery()`
   - Updated data mapping to work with actual response structure
   - Removed unused `useQuery` import from `@tanstack/react-query`

---

## Verification

### Build Status
```bash
pnpm run build
```

**Result:** ✅ Success
- Frontend built successfully in 1m 20s
- Backend built successfully
- No TypeScript errors
- No import errors

### Bundle Size
- Main bundle: 6,358.70 kB (1,024.87 kB gzipped)
- Backend: 756.8 kB

---

## Key Learnings

1. **TRPC Router Structure**: The project uses `trpc.explore.getFeed` not `apiClient.exploreApi.getFeed`
2. **Response Structure**: The explore router returns arrays directly, not nested in `{ data: { items: [] } }`
3. **Feed Types**: The explore router uses `feedType` enum: `'recommended' | 'area' | 'category' | 'agent' | 'developer'`
4. **Mutation Parameters**: Interaction recording uses `shortId`, `interactionType`, and `feedType` parameters

---

## Next Steps

The build is now successful and ready for deployment. All routing issues and build errors have been resolved.

---

**Status:** All build errors resolved ✅  
**Build Time:** 1m 20s ✅  
**Ready for Deployment:** Yes ✅

