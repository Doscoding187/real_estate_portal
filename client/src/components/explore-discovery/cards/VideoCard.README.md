# VideoCard Component (Explore Discovery)

## Overview

A modern video card component with glass overlay effects and smooth animations. This component is part of the Explore Discovery feature and displays video content with an engaging, polished UI.

## Features

- ✨ **Modern Design**: Subtle shadows and clean aesthetics following the Hybrid Modern + Soft UI design system
- 🎨 **Glass Overlay**: Frosted glass effects for controls and badges
- 🎬 **Smooth Animations**: Framer Motion-powered hover, press, and transition effects
- 💾 **Save Functionality**: Interactive save button with heart animation
- 📊 **View Counter**: Displays formatted view counts with eye icon
- ⏱️ **Duration Badge**: Shows video duration in MM:SS format
- 👤 **Creator Info**: Displays creator name and avatar
- ♿ **Accessible**: Keyboard navigation and ARIA labels
- 🎯 **Responsive**: Works on all screen sizes

## Requirements

Implements the following requirements:
- **Requirement 1.2**: Unified Soft UI styling with neumorphic effects
- **Requirement 2.1**: Enhanced video experience with smooth interactions

## Usage

### Basic Example

```tsx
import { VideoCard } from '@/components/explore-discovery/cards/VideoCard';

function VideoFeed() {
  const handleVideoClick = (videoId: number) => {
    console.log('Playing video:', videoId);
  };

  const handleSave = (videoId: number) => {
    console.log('Saving video:', videoId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <VideoCard
        video={{
          id: 1,
          title: "Beautiful 3BR Apartment in Sandton",
          thumbnailUrl: "https://example.com/thumbnail.jpg",
          videoUrl: "https://example.com/video.mp4",
          duration: 125, // seconds
          views: 15420,
          creatorName: "John Smith",
          creatorAvatar: "https://example.com/avatar.jpg",
          isSaved: false,
        }}
        onClick={() => handleVideoClick(1)}
        onSave={() => handleSave(1)}
      />
    </div>
  );
}
```

### With Preview on Hover

```tsx
<VideoCard
  video={videoData}
  onClick={handleClick}
  onSave={handleSave}
  enablePreview={true} // Enable video preview on hover (future feature)
/>
```

## Props

### VideoCardProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `video` | `VideoData` | Yes | - | Video data object |
| `onClick` | `() => void` | Yes | - | Callback when card is clicked |
| `onSave` | `() => void` | Yes | - | Callback when save button is clicked |
| `enablePreview` | `boolean` | No | `false` | Enable video preview on hover (future feature) |

### VideoData Interface

```typescript
interface VideoData {
  id: number;
  title: string;
  thumbnailUrl: string;
  videoUrl?: string;
  duration: number; // in seconds
  views: number;
  creatorName: string;
  creatorAvatar?: string;
  isSaved?: boolean;
}
```

## Design Tokens

The component uses the following design tokens from `@/lib/design-tokens`:

- **Colors**: `text.primary`, `text.secondary`, `accent.primary`
- **Shadows**: `md`, `hover`
- **Border Radius**: `lg`
- **Transitions**: `normal`, `fast`

## Animations

The component uses the following animation variants from `@/lib/animations/exploreAnimations`:

- **cardVariants**: Card entrance, hover, and tap animations
- **buttonVariants**: Button hover and tap animations

### Animation Behavior

1. **Card Hover**: Subtle lift (-2px) and scale (1.01x)
2. **Card Press**: Scale down (0.98x) for tactile feedback
3. **Thumbnail Zoom**: 1.05x scale on hover
4. **Save Button**: Heart icon scales and fills with color
5. **Play Button**: Glass overlay scales on hover
6. **Badges**: Fade in with slight upward motion

## Accessibility

- ✅ Keyboard navigation support
- ✅ ARIA labels for interactive elements
- ✅ Focus indicators
- ✅ Semantic HTML structure
- ✅ Alt text for images
- ✅ Respects `prefers-reduced-motion`

### Keyboard Navigation

- `Tab`: Navigate to card
- `Enter` or `Space`: Activate card (play video)
- `Tab` to save button, then `Enter` or `Space`: Toggle save

## Styling

The component uses Tailwind CSS utility classes and custom glass overlay utilities:

- `.glass-overlay`: White frosted glass effect
- `.glass-overlay-dark`: Dark frosted glass effect

### Custom Utilities

These utilities are defined in `tailwind.config.js`:

```css
.glass-overlay {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
}

.glass-overlay-dark {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

## Performance

- **Lazy Loading**: Images use `loading="lazy"` attribute
- **Optimized Animations**: Uses CSS transforms for 60fps performance
- **Skeleton Loading**: Shows animated skeleton while image loads
- **Efficient Re-renders**: Uses React.memo internally where appropriate

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Note: Backdrop filter (glass effect) requires modern browser support.

## Related Components

- `ModernCard`: Base card component with variants
- `PropertyCard`: Similar card for property listings
- `NeighbourhoodCard`: Card for neighbourhood content
- `InsightCard`: Card for market insights

## Migration from Old VideoCard

The refactored VideoCard maintains the same API as the previous version, so no changes are needed in consuming components. The main improvements are:

1. **Modern Design**: Updated to use design tokens and glass overlays
2. **Smooth Animations**: Added Framer Motion animations
3. **Better Accessibility**: Enhanced keyboard navigation and ARIA labels
4. **Improved Performance**: Optimized animations and loading states

## Future Enhancements

- [ ] Video preview on hover (when `enablePreview` is true)
- [ ] Integration with `useVideoPlayback` hook for inline playback
- [ ] Buffering and error states
- [ ] Network speed detection for adaptive loading
- [ ] Captions/subtitles support

## Examples

### In a Grid Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {videos.map((video) => (
    <VideoCard
      key={video.id}
      video={video}
      onClick={() => playVideo(video.id)}
      onSave={() => toggleSave(video.id)}
    />
  ))}
</div>
```

### In a Horizontal Scroll

```tsx
<div className="flex gap-4 overflow-x-auto pb-4">
  {videos.map((video) => (
    <div key={video.id} className="flex-shrink-0 w-64">
      <VideoCard
        video={video}
        onClick={() => playVideo(video.id)}
        onSave={() => toggleSave(video.id)}
      />
    </div>
  ))}
</div>
```

### With State Management

```tsx
function VideoFeedWithState() {
  const [savedVideos, setSavedVideos] = useState<Set<number>>(new Set());

  const toggleSave = (videoId: number) => {
    setSavedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={{
            ...video,
            isSaved: savedVideos.has(video.id),
          }}
          onClick={() => playVideo(video.id)}
          onSave={() => toggleSave(video.id)}
        />
      ))}
    </div>
  );
}
```

## Testing

The component can be tested using React Testing Library:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoCard } from './VideoCard';

describe('VideoCard', () => {
  const mockVideo = {
    id: 1,
    title: 'Test Video',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    duration: 125,
    views: 1500,
    creatorName: 'Test Creator',
  };

  it('renders video information', () => {
    render(
      <VideoCard
        video={mockVideo}
        onClick={jest.fn()}
        onSave={jest.fn()}
      />
    );

    expect(screen.getByText('Test Video')).toBeInTheDocument();
    expect(screen.getByText('Test Creator')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const handleClick = jest.fn();
    render(
      <VideoCard
        video={mockVideo}
        onClick={handleClick}
        onSave={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onSave when save button is clicked', () => {
    const handleSave = jest.fn();
    render(
      <VideoCard
        video={mockVideo}
        onClick={jest.fn()}
        onSave={handleSave}
      />
    );

    const saveButton = screen.getByLabelText(/save video/i);
    fireEvent.click(saveButton);
    expect(handleSave).toHaveBeenCalledTimes(1);
  });
});
```

## Troubleshooting

### Glass overlay not showing

Make sure your `tailwind.config.js` includes the glass overlay utilities. See the Styling section above.

### Animations not working

Ensure Framer Motion is installed:

```bash
npm install framer-motion
```

### Images not loading

Check that the `thumbnailUrl` is a valid URL and the image is accessible.

### Save state not persisting

The component manages local save state. For persistence, integrate with your backend API in the `onSave` callback.

## Support

For issues or questions, please refer to:
- Design document: `.kiro/specs/explore-frontend-refinement/design.md`
- Requirements: `.kiro/specs/explore-frontend-refinement/requirements.md`
- Task list: `.kiro/specs/explore-frontend-refinement/tasks.md`
