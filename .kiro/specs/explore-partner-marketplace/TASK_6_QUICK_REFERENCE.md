# Topics Navigation Service - Quick Reference

## Import
```typescript
import { topicsService } from './server/services/topicsService';
```

## Common Operations

### Get All Topics
```typescript
const topics = await topicsService.getAllTopics();
// Returns: Topic[] ordered by displayOrder
```

### Get Topic by Slug (URL Routing)
```typescript
const topic = await topicsService.getTopicBySlug('find-your-home');
// Returns: Topic | null
```

### Get Content for Topic
```typescript
const result = await topicsService.getContentForTopic(
  topicId,
  { page: 1, limit: 20 },
  {
    contentTypes: ['property_tour', 'neighbourhood_tour'],
    priceMin: 500000,
    priceMax: 2000000
  }
);
// Returns: explore_content items matching topic
```

### Get Topic Feed with Fallback
```typescript
const feed = await topicsService.getTopicFeedWithFallback(
  topicId,
  { page: 1, limit: 20 }
);

if (!feed.hasSufficientContent) {
  // Show "Coming Soon" message
  console.log(feed.message);
  // Display related topics
  console.log(feed.relatedTopics);
} else {
  // Display content and shorts
  console.log(feed.content, feed.shorts);
}
```

### Tag Content with Topics
```typescript
await topicsService.tagContentWithTopics(
  contentId,
  ['topic-id-1', 'topic-id-2'],
  {
    tags: ['property', 'listing', 'for_sale'],
    propertyFeatures: ['security_estate', '24hr_security'],
    partnerCategory: 'Property Professional'
  }
);
// Creates content_topics mappings with relevance scores
```

### Auto-Suggest Topics for Content
```typescript
const suggestions = await topicsService.suggestTopicsForContent({
  tags: ['security', 'safety', 'alarm'],
  propertyFeatures: ['security_estate', 'cctv'],
  partnerCategory: 'Home Service Provider'
});
// Returns: [{ topicId, relevanceScore }] sorted by score
```

### Check Topic Readiness
```typescript
const hasSufficient = await topicsService.hasSufficientContent(topicId);
// Returns: boolean (true if >= 20 items)

const stats = await topicsService.getTopicStatistics(topicId);
// Returns: { contentCount, hasSufficientContent, minimumRequired, percentageComplete }
```

### Get Related Topics
```typescript
const related = await topicsService.getRelatedTopics(topicId, 3);
// Returns: Topic[] (up to 3 related topics)
```

## Relevance Score Calculation

The service calculates relevance scores based on:
- **Content Tags**: 3 points per match
- **Property Features**: 2 points per match  
- **Partner Category**: 5 points for exact match

Scores are normalized to 0-10 scale.

## Minimum Content Threshold

Topics require **minimum 20 items** to be considered ready:
- Below 20: Show "Coming Soon" + suggest related topics
- At or above 20: Display normal feed

## Filtering Logic

### Explicit Filtering (Priority)
Uses `content_topics` mapping table for manually tagged content.

### Implicit Filtering (Fallback)
Matches JSON fields when no explicit mapping exists:
- `explore_content.tags` → topic.contentTags
- `explore_content.metadata.propertyFeatures` → topic.propertyFeatures
- `explore_content.metadata.partnerCategory` → topic.partnerCategories

## API Integration Example

```typescript
// Topics API Router
app.get('/api/topics', async (req, res) => {
  const topics = await topicsService.getAllTopics();
  res.json(topics);
});

app.get('/api/topics/:slug/feed', async (req, res) => {
  const { slug } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  const topic = await topicsService.getTopicBySlug(slug);
  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }
  
  const feed = await topicsService.getTopicFeedWithFallback(
    topic.id,
    { page: Number(page), limit: Number(limit) }
  );
  
  res.json(feed);
});
```

## Frontend Integration Example

```typescript
// Topics Navigation Component
const TopicsNav = () => {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  useEffect(() => {
    fetch('/api/topics')
      .then(res => res.json())
      .then(setTopics);
  }, []);
  
  return (
    <div className="topics-nav">
      {topics.map(topic => (
        <button
          key={topic.id}
          onClick={() => setSelectedTopic(topic.slug)}
          className={selectedTopic === topic.slug ? 'active' : ''}
        >
          {topic.icon} {topic.name}
        </button>
      ))}
    </div>
  );
};
```

## Performance Tips

1. **Use Pagination**: Always paginate large result sets
2. **Cache Topics List**: Topics change infrequently, cache for 1 hour
3. **Parallel Queries**: Service already parallelizes content + shorts queries
4. **Index Usage**: Queries use indexed fields (topic_id, engagement_score)

## Error Handling

```typescript
try {
  const feed = await topicsService.getTopicFeedWithFallback(topicId, pagination);
  
  if (!feed.topic) {
    // Topic not found
    return { error: 'Topic not found' };
  }
  
  if (!feed.hasSufficientContent) {
    // Show coming soon state
    return {
      status: 'coming_soon',
      message: feed.message,
      relatedTopics: feed.relatedTopics
    };
  }
  
  // Normal feed
  return feed;
} catch (error) {
  console.error('Topic feed error:', error);
  return { error: 'Failed to load topic feed' };
}
```

## Database Schema Reference

### topics table
- `id` - UUID primary key
- `slug` - URL-friendly identifier (unique)
- `name` - Display name
- `contentTags` - JSON array of matching tags
- `propertyFeatures` - JSON array of property features
- `partnerCategories` - JSON array of partner categories
- `displayOrder` - Sort order for navigation
- `isActive` - Visibility flag

### content_topics table
- `contentId` - Reference to content
- `topicId` - Reference to topic
- `relevanceScore` - Calculated relevance (0-10)
- `createdAt` - Timestamp

## Requirements Validated

✅ 3.1 - Topics Navigation System  
✅ 3.2 - Topic-Based Content Filtering  
✅ 3.3 - Topic Feed Reconfiguration  
✅ 3.4 - Multi-Content Type Filtering  
✅ 3.6 - Insufficient Content Handling  
✅ 16.36 - Topic Content Minimum
