import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Loader2, Upload, Sparkles, MapPin, Grid3x3 } from 'lucide-react';
import VideoCard from '@/components/explore/VideoCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { EnhancedSearchBar } from '@/components/explore/EnhancedSearchBar';

// Placeholder videos for design purposes
const PLACEHOLDER_VIDEOS = [
  {
    id: 'placeholder-1',
    title: 'Luxury Villa in Sandton',
    caption: '5 Bed | 4 Bath | Pool | Garden',
    primaryMediaUrl:
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1080&h=1920&fit=crop',
    viewCount: 1234,
    likeCount: 89,
    agentId: 1,
    publishedAt: new Date(),
    type: 'listing',
    propertyTitle: 'Luxury Villa in Sandton',
    propertyLocation: 'Sandton, Johannesburg',
    propertyPrice: 8500000,
    bedrooms: 5,
    bathrooms: 4,
    area: 450,
    yardSize: 800,
    propertyType: 'house',
    highlights: ['Swimming Pool', 'Garden', 'Garage', 'Security'],
  },
  {
    id: 'placeholder-2',
    title: 'Modern Apartment in Cape Town',
    caption: '2 Bed | 2 Bath | Sea View | Gym',
    primaryMediaUrl:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1080&h=1920&fit=crop',
    viewCount: 2456,
    likeCount: 156,
    agentId: 2,
    publishedAt: new Date(),
    type: 'listing',
    propertyTitle: 'Modern Apartment',
    propertyLocation: 'V&A Waterfront, Cape Town',
    propertyPrice: 4200000,
    bedrooms: 2,
    bathrooms: 2,
    area: 120,
    propertyType: 'apartment',
    highlights: ['Sea View', 'Gym', 'Concierge', 'Parking'],
  },
  {
    id: 'placeholder-3',
    title: 'Penthouse with Panoramic Views',
    caption: '3 Bed | 3 Bath | Rooftop Terrace',
    primaryMediaUrl:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&h=1920&fit=crop',
    viewCount: 3421,
    likeCount: 234,
    agentId: 3,
    publishedAt: new Date(),
    type: 'listing',
    propertyTitle: 'Penthouse with Views',
    propertyLocation: 'Umhlanga, Durban',
    propertyPrice: 6750000,
    bedrooms: 3,
    bathrooms: 3,
    area: 280,
    propertyType: 'apartment',
    highlights: ['Panoramic Views', 'Rooftop Terrace', 'Concierge', 'Gym'],
  },
  {
    id: 'placeholder-4',
    title: 'Family Home in Pretoria',
    caption: '4 Bed | 3 Bath | Large Yard | Double Garage',
    primaryMediaUrl:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1080&h=1920&fit=crop',
    viewCount: 987,
    likeCount: 67,
    agentId: 4,
    publishedAt: new Date(),
    type: 'listing',
    propertyTitle: 'Family Home',
    propertyLocation: 'Waterkloof, Pretoria',
    propertyPrice: 5200000,
    bedrooms: 4,
    bathrooms: 3,
    area: 320,
    yardSize: 650,
    propertyType: 'house',
    highlights: ['Large Yard', 'Double Garage', 'Security', 'Pool'],
  },
  {
    id: 'placeholder-5',
    title: 'Beachfront Apartment',
    caption: '1 Bed | 1 Bath | Ocean View | Pool',
    primaryMediaUrl:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1080&h=1920&fit=crop',
    viewCount: 5632,
    likeCount: 412,
    agentId: 5,
    publishedAt: new Date(),
    type: 'listing',
    propertyTitle: 'Beachfront Apartment',
    propertyLocation: 'Camps Bay, Cape Town',
    propertyPrice: 3850000,
    bedrooms: 1,
    bathrooms: 1,
    area: 85,
    propertyType: 'apartment',
    highlights: ['Ocean View', 'Pool', 'Gym', 'Concierge'],
  },
];

export default function ExploreFeed() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterType, setFilterType] = useState<'recommended' | 'area' | 'category'>('recommended');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch explore shorts feed
  const { data: feedData, isLoading } = trpc.explore.getFeed.useQuery({
    feedType: filterType,
    limit: 20,
    offset: 0,
    userId: user?.id,
  });

  // Mutation for recording interactions
  const recordInteractionMutation = trpc.explore.recordInteraction.useMutation();

  // Use placeholder videos if no data available
  const videos =
    feedData?.shorts && feedData.shorts.length > 0 ? feedData.shorts : PLACEHOLDER_VIDEOS;

  // Filter videos based on search query
  const filteredVideos = searchQuery
    ? videos.filter(
        (video: any) =>
          video.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.propertyLocation?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : videos;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight } = e.currentTarget;
    const index = Math.round(scrollTop / clientHeight);
    setCurrentIndex(index);
  };

  // Auto-play current video
  useEffect(() => {
    const videos = document.querySelectorAll('video');
    videos.forEach((video, index) => {
      if (index === currentIndex) {
        video.play().catch(() => {}); // Ignore autoplay errors
      } else {
        video.pause();
      }
    });
  }, [currentIndex]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-white" />
          <p className="text-white text-sm">Loading amazing properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 relative overflow-hidden">
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-full">
        {/* Left Sidebar - Filters (Desktop only) */}
        <div className="w-80 bg-white/5 backdrop-blur-xl border-r border-white/10 p-6 overflow-y-auto">
          <h2 className="text-white text-xl font-bold mb-6">Filters</h2>

          {/* Enhanced Search */}
          <div className="mb-6">
            <EnhancedSearchBar
              onSearch={query => setSearchQuery(query)}
              placeholder="Search properties..."
            />
          </div>

          {/* Filter Tabs */}
          <div className="mb-6">
            <label className="text-white/70 text-sm font-medium mb-3 block">Feed Type</label>
            <Tabs value={filterType} onValueChange={value => setFilterType(value as any)}>
              <TabsList className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg w-full flex-col h-auto space-y-2 p-2">
                <TabsTrigger
                  value="recommended"
                  className="w-full text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  For You
                </TabsTrigger>
                <TabsTrigger
                  value="area"
                  className="w-full text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  By Area
                </TabsTrigger>
                <TabsTrigger
                  value="category"
                  className="w-full text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Grid3x3 className="h-4 w-4" />
                  By Type
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Quick Stats */}
          <div className="space-y-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-white/70 text-xs mb-1">Total Properties</p>
              <p className="text-white text-2xl font-bold">{filteredVideos.length}</p>
            </div>
          </div>
        </div>

        {/* Main Content Area (Desktop) */}
        <div className="flex-1 relative">
          {/* Upload button - Desktop */}
          {isAuthenticated && (
            <button
              onClick={() => setLocation('/explore/upload')}
              className="absolute top-6 right-6 z-50 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 backdrop-blur-sm rounded-full text-white hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-lg border border-white/20"
              aria-label="Upload content"
            >
              <Upload className="w-5 h-5" />
              <span className="font-semibold">Upload Property</span>
            </button>
          )}

          {/* Video Feed */}
          <div
            className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            style={{
              scrollSnapType: 'y mandatory',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
            onScroll={handleScroll}
          >
            {filteredVideos?.map((short: any, idx: number) => (
              <div key={short.id} className="snap-start snap-always h-screen w-full">
                <VideoCard
                  video={{
                    id: short.id,
                    title: short.title,
                    description: short.caption || '',
                    videoUrl: short.primaryMediaUrl || '',
                    thumbnailUrl: short.primaryMediaUrl || '',
                    views: short.viewCount || 0,
                    likes: short.likeCount || 0,
                    userId: short.agentId || short.developerId || 0,
                    createdAt: short.publishedAt || new Date(),
                    type: short.type || 'listing',
                    propertyTitle: short.propertyTitle || short.title,
                    propertyLocation: short.propertyLocation,
                    propertyPrice: short.propertyPrice,
                    caption: short.caption,
                    bedrooms: short.bedrooms,
                    bathrooms: short.bathrooms,
                    area: short.area,
                    yardSize: short.yardSize,
                    propertyType: short.propertyType,
                    highlights: short.highlights || [],
                  }}
                  isActive={idx === currentIndex}
                  onView={() => {
                    recordInteractionMutation.mutate({
                      shortId: short.id,
                      interactionType: 'view',
                      feedType: filterType,
                    });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden h-full relative">
        {/* Mobile Header */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 via-black/70 to-transparent pb-6">
          <div className="p-4 flex justify-between items-center">
            <Tabs value={filterType} onValueChange={value => setFilterType(value as any)}>
              <TabsList className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-lg">
                <TabsTrigger
                  value="recommended"
                  className="text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-full transition-all duration-300 flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  For You
                </TabsTrigger>
                <TabsTrigger
                  value="area"
                  className="text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-full transition-all duration-300 flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Area
                </TabsTrigger>
                <TabsTrigger
                  value="category"
                  className="text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-full transition-all duration-300 flex items-center gap-2"
                >
                  <Grid3x3 className="h-4 w-4" />
                  Type
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Mobile Upload button */}
            {isAuthenticated && (
              <button
                onClick={() => setLocation('/explore/upload')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 backdrop-blur-sm rounded-full text-white hover:shadow-2xl transition-all duration-300 shadow-lg border border-white/20"
                aria-label="Upload content"
              >
                <Upload className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Video Feed */}
        <div
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{
            scrollSnapType: 'y mandatory',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
          onScroll={handleScroll}
        >
          {filteredVideos?.map((short: any, idx: number) => (
            <div key={short.id} className="snap-start snap-always h-screen w-full">
              <VideoCard
                video={{
                  id: short.id,
                  title: short.title,
                  description: short.caption || '',
                  videoUrl: short.primaryMediaUrl || '',
                  thumbnailUrl: short.primaryMediaUrl || '',
                  views: short.viewCount || 0,
                  likes: short.likeCount || 0,
                  userId: short.agentId || short.developerId || 0,
                  createdAt: short.publishedAt || new Date(),
                  type: short.type || 'listing',
                  propertyTitle: short.propertyTitle || short.title,
                  propertyLocation: short.propertyLocation,
                  propertyPrice: short.propertyPrice,
                  caption: short.caption,
                  bedrooms: short.bedrooms,
                  bathrooms: short.bathrooms,
                  area: short.area,
                  yardSize: short.yardSize,
                  propertyType: short.propertyType,
                  highlights: short.highlights || [],
                }}
                isActive={idx === currentIndex}
                onView={() => {
                  recordInteractionMutation.mutate({
                    shortId: short.id,
                    interactionType: 'view',
                    feedType: filterType,
                  });
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
