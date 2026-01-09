# TopicsNavigation Component

## Overview

The `TopicsNavigation` component provides a horizontal scrollable list of topics for the Explore Partner Marketplace. It allows users to filter content by selecting topics, with visual feedback for the active topic.

## Requirements

- **3.1**: Display horizontal scrollable list of Topics
- **3.1**: Active topic highlighting
- **3.6**: Handle topics with insufficient content

## Features

- ✅ Horizontal scroll with smooth scrolling
- ✅ Active topic highlighting with primary color
- ✅ Keyboard navigation support (Enter/Space to select)
- ✅ Scroll indicators (left/right arrows)
- ✅ Responsive design (mobile-friendly)
- ✅ Touch-friendly scrolling
- ✅ Auto-scroll active topic into view
- ✅ Loading skeleton state
- ✅ Accessibility (ARIA roles and labels)

## Usage

```tsx
import { TopicsNavigation } from "@/components/explore-discovery/TopicsNavigation";

function ExplorePage() {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  return (
    <div>
      <TopicsNavigation
        activeTopic={activeTopic}
        onTopicSelect={setActiveTopic}
      />
      
      {/* Feed content filtered by activeTopic */}
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `activeTopic` | `string \| null` | No | Currently active topic slug (null = "All") |
| `onTopicSelect` | `(slug: string \| null) => void` | Yes | Callback when topic is selected |
| `className` | `string` | No | Additional CSS classes |

## API Integration

The component fetches topics from `/api/topics` endpoint:

```typescript
GET /api/topics
Response: Topic[]

interface Topic {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  displayOrder: number | null;
  isActive: boolean | null;
}
```

## Styling

The component uses:
- Tailwind CSS for styling
- `cn()` utility for conditional classes
- Primary color for active state
- Gray colors for inactive state
- Smooth transitions for hover/active states

## Accessibility

- Uses `role="tablist"` and `role="tab"` for semantic structure
- Provides `aria-selected` for active topic
- Includes `aria-label` for scroll buttons
- Supports keyboard navigation (Enter/Space)
- Focus ring for keyboard users

## Responsive Behavior

- **Mobile**: Touch-friendly scrolling, smaller padding
- **Desktop**: Scroll arrows visible when needed, larger padding
- **All sizes**: Smooth horizontal scrolling

## Performance

- React Query caching (5 minute stale time)
- Efficient scroll position tracking
- Debounced scroll event handling
- Lazy loading of topics

## Examples

### Basic Usage

```tsx
<TopicsNavigation
  activeTopic={null}
  onTopicSelect={(slug) => console.log("Selected:", slug)}
/>
```

### With URL Sync

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const activeTopic = searchParams.get("topic");

<TopicsNavigation
  activeTopic={activeTopic}
  onTopicSelect={(slug) => {
    if (slug) {
      setSearchParams({ topic: slug });
    } else {
      setSearchParams({});
    }
  }}
/>
```

### With Custom Styling

```tsx
<TopicsNavigation
  activeTopic={activeTopic}
  onTopicSelect={setActiveTopic}
  className="bg-gray-50 border-b"
/>
```

## Integration with Feed

The component is designed to work with the Topics API and feed filtering:

```tsx
function ExploreFeed() {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const { data: feedData } = useQuery({
    queryKey: ["topic-feed", activeTopic],
    queryFn: async () => {
      if (!activeTopic) {
        return fetchDefaultFeed();
      }
      const response = await fetch(`/api/topics/${activeTopic}/feed`);
      return response.json();
    },
  });

  return (
    <div>
      <TopicsNavigation
        activeTopic={activeTopic}
        onTopicSelect={setActiveTopic}
      />
      
      {feedData?.message === "Coming Soon" ? (
        <ComingSoonMessage relatedTopics={feedData.relatedTopics} />
      ) : (
        <FeedContent data={feedData} />
      )}
    </div>
  );
}
```

## Testing

The component should be tested for:
- ✅ Renders all topics from API
- ✅ Highlights active topic correctly
- ✅ Calls onTopicSelect when topic clicked
- ✅ Shows/hides scroll arrows based on scroll position
- ✅ Scrolls when arrow buttons clicked
- ✅ Supports keyboard navigation
- ✅ Shows loading skeleton while fetching
- ✅ Handles empty topics list gracefully

## Related Components

- `FilterPanel` - Additional filtering options
- `DiscoveryCardFeed` - Content feed that uses topic filtering
- `EmptyState` - Shown when topic has no content
