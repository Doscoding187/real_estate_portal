# Phase 7: TikTok-Style Explore Feed - Complete Implementation Guide

## 🎯 Overview

Phase 7 implements a **TikTok-style Explore Feed** for the multi-tenant real estate platform, allowing agents to upload and share property videos or general real estate content. Users can discover properties through engaging video content and directly contact agents.

## ✅ Features Implemented

### 🧠 Dual-Type Video System
- **Listing Videos**: Showcase specific properties with price, location, and contact information
- **Content Videos**: General promotional/informative content without property linkage
- **Dynamic Rendering**: Contextual UI based on video type

### 🎥 Video Feed Experience
- **Fullscreen Interface**: TikTok-style vertical video scrolling
- **Auto-play/Pause**: Videos play when in view, pause when scrolling
- **Interactive Elements**: Like, share, and contact buttons
- **Filter System**: All videos, listings only, or content only
- **Real-time Updates**: View counts, like toggles

### 📱 Agent Video Upload
- **Multi-step Upload Flow**: Type selection → Details → Upload
- **S3 Integration**: Secure video storage with presigned URLs
- **Property Linking**: Direct property association for listing videos
- **Validation**: File size (100MB), duration (60s max), format checking

### 💬 Agent Contact System
- **Pre-filled Messages**: Context-aware messaging based on video type
- **Lead Creation**: Automatic lead generation from video inquiries
- **Modal Interface**: Clean contact form with validation

## 🗄️ Database Schema

### Videos Table
```sql
CREATE TABLE videos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agentId INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  propertyId INT REFERENCES properties(id) ON DELETE SET NULL,
  developmentId INT REFERENCES developments(id) ON DELETE SET NULL,
  videoUrl TEXT NOT NULL,
  caption TEXT,
  type ENUM('listing', 'content') DEFAULT 'content' NOT NULL,
  duration INT DEFAULT 0,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  shares INT DEFAULT 0,
  isPublished TINYINT(1) DEFAULT 1,
  isFeatured TINYINT(1) DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Video Likes Table
```sql
CREATE TABLE videoLikes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  videoId INT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  userId INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_video (videoId, userId)
);
```

## 🔧 Backend API (tRPC)

### Video Router Endpoints

#### `video.getPresignedUrl`
Generates secure S3 upload URLs for video files.
```typescript
// Input
{
  fileName: string,
  fileType: string
}

// Output
{
  uploadUrl: string,
  videoUrl: string
}
```

#### `video.uploadVideo`
Creates video records after successful S3 upload.
```typescript
// Input
{
  propertyId?: number,
  developmentId?: number,
  videoUrl: string,
  caption?: string,
  type: 'listing' | 'content',
  duration: number
}
```

#### `video.getVideos`
Retrieves all published videos for the explore feed.
```typescript
// Output
{
  id: number,
  videoUrl: string,
  caption?: string,
  type: 'listing' | 'content',
  duration: number,
  views: number,
  likes: number,
  shares: number,
  createdAt: Date,
  propertyId?: number,
  propertyTitle?: string,
  propertyLocation?: string,
  propertyPrice?: number,
  developmentId?: number,
  developmentName?: string,
  agentId: number,
  agentName: string,
  agentEmail: string,
  isLiked: boolean,
  likesCount: number
}
```

#### `video.toggleLike`
Toggles user like/unlike status on videos.
```typescript
// Input
{
  videoId: number
}

// Output
{
  liked: boolean
}
```

#### `video.contactAgent`
Creates lead records from video inquiries.
```typescript
// Input
{
  agentId: number,
  videoId?: number,
  propertyId?: number,
  name: string,
  email: string,
  phone?: string,
  message: string
}
```

## 🎨 Frontend Components

### ExploreFeed Component
**Location**: `client/src/pages/ExploreFeed.tsx`

**Features**:
- Fullscreen vertical scrolling interface
- Filter tabs (All, Listings, Content)
- Auto-play current video, pause others
- View count tracking
- Video progress indicator

**Key Functions**:
```typescript
// Handle scroll-based video activation
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const { scrollTop, clientHeight } = e.currentTarget;
  const index = Math.round(scrollTop / clientHeight);
  setCurrentIndex(index);
};

// Auto-play management
useEffect(() => {
  const videos = document.querySelectorAll('video');
  videos.forEach((video, index) => {
    if (index === currentIndex) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}, [currentIndex]);
```

### VideoCard Component
**Location**: `client/src/components/explore/VideoCard.tsx`

**Features**:
- Dual-type rendering (listing vs content)
- Interactive overlay controls
- Like/share/contact buttons
- Property information display
- Video duration and view tracking

**Key Rendering Logic**:
```typescript
{video.type === 'listing' ? (
  // Show property details
  <div>
    <h2>{video.propertyTitle}</h2>
    <p>{video.propertyLocation}</p>
    <p>{formatPrice(video.propertyPrice)}</p>
  </div>
) : (
  // Show agent info
  <div>
    <p>@{video.agentName}</p>
  </div>
)}
```

### ContactAgentModal Component
**Location**: `client/src/components/explore/ContactAgentModal.tsx`

**Features**:
- Pre-filled messaging based on video type
- Form validation
- Success/error handling
- Agent information display

**Message Generation**:
```typescript
const generateMessage = () => {
  if (video.type === 'listing') {
    return `Hi ${video.agentName}, I saw your video about ${video.propertyTitle} and would like to know more.`;
  } else {
    return `Hi ${video.agentName}, I saw your video on the Explore feed and would like to connect.`;
  }
};
```

### VideoUploadModal Component
**Location**: `client/src/components/explore/VideoUploadModal.tsx`

**Features**:
- Multi-step upload wizard
- Video type selection
- Property selection for listing videos
- File validation and preview
- Upload progress tracking
- S3 integration

**Upload Flow**:
1. **Type Selection**: Choose listing vs content video
2. **Details**: Add caption, select property (if listing)
3. **Upload**: Select file, validate, upload to S3, create record

## 🎯 Integration Points

### Navigation Integration
**Location**: `client/src/components/Navbar.tsx`

Added Explore link to main navigation:
```typescript
const navLinks = [
  { href: '/explore', label: 'Explore', icon: Play },
  // ... other links
];
```

### Router Integration
**Location**: `client/src/App.tsx`

Added Explore route:
```typescript
<Route path="/explore" component={ExploreFeed} />
```

### Backend Router Integration
**Location**: `server/routers.ts`

Integrated video router:
```typescript
export const appRouter = router({
  // ... other routers
  video: videoRouter,
});
```

## 📱 Mobile Responsiveness

### Responsive Design Features
- **Touch-friendly Controls**: Large tap targets for mobile
- **Gesture Support**: Swipe/scroll navigation
- **Optimized Layouts**: Mobile-first design approach
- **Performance**: Lazy loading and efficient rendering

### CSS Classes Used
```css
/* Fullscreen video container */
.h-screen.w-full.overflow-y-scroll.snap-y.snap-mandatory

/* Mobile-optimized controls */
.h-7.w-7 /* Touch-friendly button sizes */
.mt-1.text-xs /* Compact mobile text */

/* Responsive video sizing */
.h-full.w-auto.max-w-[450px].object-contain
```

## 🔐 Security & Performance

### S3 Integration
- **Presigned URLs**: Secure, time-limited upload access
- **File Validation**: Type and size checking
- **Region Optimization**: `af-south-1` for South African users

### Performance Optimizations
- **Lazy Loading**: Videos load on demand
- **Efficient Queries**: Optimized database joins
- **Caching**: tRPC query caching for repeated requests
- **Image Optimization**: Thumbnail generation (ready for future)

### Security Measures
- **Role-based Access**: Only agents can upload videos
- **File Validation**: Strict file type and size limits
- **Input Sanitization**: All user inputs validated
- **SQL Injection Prevention**: Parameterized queries

## 🚀 Usage Instructions

### For Agents
1. **Navigate to Explore**: Click "Explore" in main navigation
2. **Upload Video**: Use upload button in agent dashboard
3. **Choose Type**: Select listing or content video
4. **Add Details**: Caption, property association (if listing)
5. **Upload**: File selection and S3 upload
6. **Monitor**: Track views and engagement in analytics

### For Users
1. **Browse Videos**: Scroll through explore feed
2. **Filter Content**: Use tabs to view specific video types
3. **Interact**: Like, share, or contact agents
4. **Property Discovery**: Click through to property details from listing videos
5. **Contact**: Send inquiries with pre-filled context

### For Admins
1. **Moderation**: Review uploaded videos
2. **Analytics**: Monitor engagement metrics
3. **Content Management**: Feature or archive videos
4. **User Management**: Handle agent video permissions

## 🛠️ Technical Implementation Details

### State Management
```typescript
// tRPC React Query hooks
const { data: videos, isLoading } = trpc.video.getVideos.useQuery();
const toggleLike = trpc.video.toggleLike.useMutation();
const contactAgent = trpc.video.contactAgent.useMutation();
```

### Error Handling
```typescript
const toggleLike = trpc.video.toggleLike.useMutation({
  onSuccess: (data) => setLiked(data.liked),
  onError: (error) => {
    console.error('Failed to toggle like:', error);
    // Show toast notification
  }
});
```

### Video File Handling
```typescript
// File validation
const validateFile = (file: File) => {
  const validTypes = ['video/mp4', 'video/mov', 'video/avi'];
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  return validTypes.includes(file.type) && file.size <= maxSize;
};

// Duration extraction
const getVideoDuration = (file: File) => {
  return new Promise<number>((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => resolve(video.duration);
    video.src = URL.createObjectURL(file);
  });
};
```

## 🎯 Business Impact

### User Engagement
- **Increased Session Time**: Video content keeps users engaged longer
- **Social Discovery**: TikTok-style interface encourages exploration
- **Direct Agent Contact**: Streamlined lead generation process

### Agent Benefits
- **Showcase Properties**: Dynamic video content for listings
- **Brand Building**: Content videos for agent personal branding
- **Lead Generation**: Direct contact from video interactions
- **Performance Tracking**: Analytics on video engagement

### Platform Growth
- **Viral Potential**: Shareable video content
- **Mobile-First**: Attracts mobile users
- **Competitive Advantage**: Modern, engaging property discovery
- **Data Collection**: User preferences and behavior tracking

## 🔮 Future Enhancements

### Short-term (Phase 8)
- **Comments System**: User comments on videos
- **Video Thumbnails**: Auto-generated preview images
- **Trending Algorithm**: Popular content prioritization
- **Saved Videos**: User bookmarking functionality

### Medium-term (Phase 9)
- **Live Streaming**: Real-time property tours
- **AR Integration**: Virtual property walkthroughs
- **AI Tagging**: Automatic content categorization
- **Advanced Filters**: Location, price, property type filtering

### Long-term (Phase 10+)
- **Monetization**: Paid promotion for agent videos
- **Influencer Program**: Top-performing agent recognition
- **Video Analytics**: Detailed engagement metrics
- **Integration**: CRM and marketing tool connections

## 🧪 Testing Strategy

### Unit Tests
- Component rendering with different video types
- Form validation logic
- API endpoint responses
- File upload validation

### Integration Tests
- End-to-end video upload flow
- Like/unlike functionality
- Contact form submission
- Navigation and routing

### Performance Tests
- Video loading performance
- Scroll performance with many videos
- Memory usage with long sessions
- Mobile device compatibility

## 📊 Monitoring & Analytics

### Key Metrics
- **Video Views**: Total and per-video analytics
- **Engagement Rate**: Likes, shares, comments
- **Conversion Rate**: Video views to agent contacts
- **Agent Performance**: Top-performing content
- **User Behavior**: Session duration, video completion

### Implementation Ready
- tRPC mutations for view tracking
- Database fields for analytics
- Frontend event tracking
- Admin dashboard integration

## 🏁 Conclusion

Phase 7 delivers a comprehensive TikTok-style Explore Feed that transforms property discovery from static listings to engaging video content. The dual-type video system accommodates both property showcases and agent branding content, while the intuitive interface encourages user engagement and lead generation.

**Key Achievements**:
✅ Full-stack video upload and streaming system  
✅ Dual-type video content management  
✅ TikTok-style user interface  
✅ Agent contact and lead generation  
✅ Mobile-responsive design  
✅ S3 integration for scalable storage  
✅ Real-time interaction tracking  
✅ Navigation and routing integration  

The system is production-ready with proper validation, error handling, and performance optimizations. Future phases can build upon this foundation with advanced features like live streaming, AI-powered content curation, and monetization options.

**Next Steps**: Ready for Phase 8 implementation focusing on enhanced social features and performance optimization.