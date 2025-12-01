import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Loader2, Upload } from 'lucide-react';
import VideoCard from '@/components/explore/VideoCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';

export default function ExploreFeed() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterType, setFilterType] = useState<'recommended' | 'area' | 'category'>('recommended');

  // Fetch explore shorts feed
  const { data: feedData, isLoading } = trpc.explore.getFeed.useQuery({
    feedType: filterType,
    limit: 20,
    offset: 0,
    userId: user?.id,
  });

  // Mutation for recording interactions
  const recordInteractionMutation = trpc.explore.recordInteraction.useMutation();

  const videos = feedData?.shorts || [];

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
        <Loader2 className="animate-spin h-8 w-8 text-white" />
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-lg mb-2">No videos available</p>
          <p className="text-sm text-gray-400">Check back later for new content!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black">
      {/* Filter Tabs */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center">
        <Tabs value={filterType} onValueChange={value => setFilterType(value as any)}>
          <TabsList className="bg-black/80 backdrop-blur-sm">
            <TabsTrigger value="recommended" className="text-white data-[state=active]:bg-white/20">
              For You
            </TabsTrigger>
            <TabsTrigger value="area" className="text-white data-[state=active]:bg-white/20">
              Area
            </TabsTrigger>
            <TabsTrigger value="category" className="text-white data-[state=active]:bg-white/20">
              Category
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Upload button - only show for authenticated users */}
        {isAuthenticated && (
          <button
            onClick={() => setLocation('/explore/upload')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 backdrop-blur-sm rounded-full text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            aria-label="Upload content"
          >
            <Upload className="w-5 h-5" />
            <span className="font-medium">Upload</span>
          </button>
        )}
      </div>

      {/* Video Feed */}
      <div
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        onScroll={handleScroll}
      >
        {videos?.map((short, idx) => (
          <div key={short.id} className="snap-start h-screen w-full">
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
              }}
              isActive={idx === currentIndex}
              onView={() => {
                // Record view interaction
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

      {/* Video Counter */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-black/80 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm">
          {currentIndex + 1} / {videos.length}
        </div>
      </div>
    </div>
  );
}
