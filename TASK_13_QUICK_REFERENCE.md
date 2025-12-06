# Task 13: Save & Follow Features - Quick Reference

## Components

### SaveButton
```tsx
import { SaveButton } from '@/components/explore-discovery/SaveButton';

<SaveButton
  propertyId={123}
  initialSaved={false}
  variant="default" // "default" | "overlay" | "card"
  size="md"         // "sm" | "md" | "lg"
  showLabel={false}
  onSaveSuccess={() => console.log('Saved!')}
  onUnsaveSuccess={() => console.log('Unsaved!')}
/>
```

### FollowButton
```tsx
import { FollowButton } from '@/components/explore-discovery/FollowButton';

// Follow creator
<FollowButton
  type="creator"
  targetId={456}
  initialFollowing={false}
  variant="default"  // "default" | "outline" | "ghost"
  size="md"          // "sm" | "md" | "lg"
  showIcon={true}
  onFollowSuccess={() => console.log('Followed!')}
  onUnfollowSuccess={() => console.log('Unfollowed!')}
/>

// Follow neighbourhood
<FollowButton
  type="neighbourhood"
  targetId={789}
  initialFollowing={false}
  variant="outline"
  size="lg"
/>
```

## Hooks

### useSaveProperty
```tsx
import { useSaveProperty } from '@/hooks/useSaveProperty';

const { isSaved, isAnimating, isLoading, toggleSave } = useSaveProperty({
  propertyId: 123,
  initialSaved: false,
  onSaveSuccess: () => console.log('Saved!'),
  onUnsaveSuccess: () => console.log('Unsaved!'),
});
```

### useFollowCreator
```tsx
import { useFollowCreator } from '@/hooks/useFollowCreator';

const { isFollowing, isLoading, toggleFollow } = useFollowCreator({
  creatorId: 456,
  initialFollowing: false,
  onFollowSuccess: () => console.log('Followed!'),
  onUnfollowSuccess: () => console.log('Unfollowed!'),
});
```

### useFollowNeighbourhood
```tsx
import { useFollowNeighbourhood } from '@/hooks/useFollowNeighbourhood';

const { isFollowing, isLoading, toggleFollow } = useFollowNeighbourhood({
  neighbourhoodId: 789,
  initialFollowing: false,
  onFollowSuccess: () => console.log('Followed!'),
  onUnfollowSuccess: () => console.log('Unfollowed!'),
});
```

## Pages

### SavedProperties
Route: `/saved-properties`

Features:
- Grid and list view modes
- Property count display
- Unsave functionality
- Empty state with CTA

### FollowedItems
Route: `/following`

Features:
- Tabbed interface (Neighbourhoods / Creators)
- Follower/video counts
- Unfollow functionality
- Empty states for both tabs

## API Endpoints

### Save Property
```typescript
trpc.exploreApi.toggleSaveProperty.useMutation({
  propertyId: number
})

// Response
{
  success: boolean;
  data: {
    saved: boolean;
    propertyId: number;
  }
}
```

### Get Saved Properties
```typescript
trpc.exploreApi.getSavedProperties.useQuery({
  limit: 50,
  offset: 0
})

// Response
{
  success: boolean;
  data: {
    items: Array<{
      id: number;
      property: PropertyData;
      savedAt: string;
    }>;
    total: number;
  }
}
```

### Follow Neighbourhood
```typescript
trpc.exploreApi.toggleNeighbourhoodFollow.useMutation({
  neighbourhoodId: number
})

// Response
{
  success: boolean;
  data: {
    following: boolean;
    neighbourhoodId: number;
  }
}
```

### Follow Creator
```typescript
trpc.exploreApi.toggleCreatorFollow.useMutation({
  creatorId: number
})

// Response
{
  success: boolean;
  data: {
    following: boolean;
    creatorId: number;
  }
}
```

### Get Followed Items
```typescript
trpc.exploreApi.getFollowedItems.useQuery()

// Response
{
  success: boolean;
  data: {
    neighbourhoods: Array<NeighbourhoodFollow>;
    creators: Array<CreatorFollow>;
  }
}
```

## Integration Examples

### Video Overlay
```tsx
import { SaveButton } from './SaveButton';
import { FollowButton } from './FollowButton';

<div className="absolute right-4 bottom-32 z-20 flex flex-col gap-4">
  {/* Save button */}
  {video.propertyId && (
    <SaveButton
      propertyId={video.propertyId}
      variant="overlay"
      size="lg"
    />
  )}
  
  {/* Follow creator */}
  <FollowButton
    type="creator"
    targetId={video.creatorId}
    variant="ghost"
    size="sm"
  />
</div>
```

### Property Card
```tsx
import { SaveButton } from '../SaveButton';

<div className="absolute top-3 right-3 z-10">
  <SaveButton
    propertyId={property.id}
    initialSaved={property.isSaved}
    variant="card"
    size="md"
  />
</div>
```

### Neighbourhood Detail
```tsx
import { FollowButton } from '@/components/explore-discovery/FollowButton';

<FollowButton
  type="neighbourhood"
  targetId={neighbourhoodId}
  initialFollowing={isFollowing}
  variant="default"
  size="lg"
/>
```

## Styling Variants

### SaveButton Variants
- **default**: White background with border
- **overlay**: Semi-transparent with backdrop blur
- **card**: White with shadow

### FollowButton Variants
- **default**: Solid background (blue/gray)
- **outline**: Transparent with border
- **ghost**: Transparent with hover

## Features

### SaveButton
- ✅ Bookmark icon (filled/unfilled)
- ✅ Animation on save (bounce effect)
- ✅ Haptic feedback (mobile)
- ✅ Loading state
- ✅ Success callbacks
- ✅ Accessible (ARIA labels)

### FollowButton
- ✅ Dynamic icon (UserPlus/UserCheck)
- ✅ Dynamic text (Follow/Following)
- ✅ Loading state
- ✅ Success callbacks
- ✅ Accessible (ARIA labels)
- ✅ Supports creators and neighbourhoods

## Requirements Satisfied

### Save Features
- ✅ 14.1: Save action on videos and cards
- ✅ 14.2: Visual confirmation with animation
- ✅ 14.3: Saved properties view
- ✅ 14.4: Save signals improve recommendations
- ✅ 14.5: Save state display and unsave

### Follow Features
- ✅ 5.6: Neighbourhood following
- ✅ 13.1: Follow neighbourhoods
- ✅ 13.2: Follow creators
- ✅ 13.3: Display followed items
- ✅ 13.4: Unfollow functionality
- ✅ 13.5: Follower notifications

## Next Steps

1. Add routes to App.tsx:
   - `/saved-properties` → SavedProperties
   - `/following` → FollowedItems

2. Add navigation links:
   - User menu → "Saved Properties"
   - User menu → "Following"

3. Test all flows:
   - Save/unsave from video overlay
   - Save/unsave from property cards
   - Follow/unfollow creators
   - Follow/unfollow neighbourhoods
   - View saved properties
   - View followed items

4. Add error handling UI

5. Consider enhancements:
   - Collections for saved properties
   - Search/filter in saved properties
   - Sort options
   - Bulk actions
