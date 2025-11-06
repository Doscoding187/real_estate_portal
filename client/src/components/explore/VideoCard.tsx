import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Heart, Share2, MessageCircle, Play, Pause } from 'lucide-react';
import { ContactAgentModal } from './ContactAgentModal';

interface VideoCardProps {
  video: any;
  isActive: boolean;
  onView?: () => void;
}

export default function VideoCard({ video, isActive, onView }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(video.isLiked || false);

  const toggleLike = trpc.video.toggleLike.useMutation({
    onSuccess: data => {
      setLiked(data.liked);
    },
    onError: error => {
      console.error('Failed to toggle like:', error);
    },
  });

  // Auto-play/pause based on active state
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          onView?.();
        })
        .catch(() => {
          // Autoplay failed, user needs to manually start
          setIsPlaying(false);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, onView]);

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = async () => {
    const shareData = {
      title:
        video.type === 'listing'
          ? `Check out this property: ${video.propertyTitle}`
          : `Video by ${video.agentName}`,
      text: video.caption || '',
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        // You could show a toast notification here
        console.log('Link copied to clipboard');
      } catch (err) {
        console.log('Failed to copy link');
      }
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-black">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="h-full w-auto max-w-[450px] object-contain"
        loop
        muted
        playsInline
        preload="metadata"
        poster={video.thumbnailUrl}
        onLoadedMetadata={() => {
          // Video loaded, ready to play
        }}
      />

      {/* Play/Pause Overlay (for manual control) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-16 w-16 rounded-full bg-black/50 hover:bg-black/70 text-white"
          onClick={togglePlayPause}
        >
          {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
        </Button>
      </div>

      {/* Bottom Overlay */}
      <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
        {video.type === 'listing' ? (
          // Listing Video - Show property details
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-bold text-lg line-clamp-1">{video.propertyTitle}</h2>
                <p className="text-sm text-gray-200 line-clamp-1">{video.propertyLocation}</p>
              </div>
              {video.propertyPrice && (
                <p className="font-bold text-primary text-lg">{formatPrice(video.propertyPrice)}</p>
              )}
            </div>
          </div>
        ) : (
          // Content Video - Show agent info
          <div className="mb-2">
            <p className="font-semibold">@{video.agentName}</p>
          </div>
        )}

        {/* Caption */}
        {video.caption && (
          <p className="text-sm text-gray-200 line-clamp-2 mb-2">{video.caption}</p>
        )}

        {/* Video duration */}
        {video.duration > 0 && (
          <p className="text-xs text-gray-300">{formatDuration(video.duration)}</p>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center space-y-4">
        {/* Like Button */}
        <button
          onClick={() => toggleLike.mutate({ videoId: video.id })}
          className={`flex flex-col items-center transition-all duration-200 ${
            liked ? 'scale-125 text-red-500' : 'text-white hover:text-red-400 hover:scale-110'
          }`}
          disabled={toggleLike.isLoading}
        >
          <Heart className={`h-7 w-7 ${liked ? 'fill-current' : ''}`} />
          <span className="text-xs mt-1 font-medium">
            {video.likes + (liked ? 1 : 0) + (video.isLiked && !liked ? -1 : 0)}
          </span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center text-white hover:text-blue-400 transition-colors hover:scale-110"
        >
          <Share2 className="h-7 w-7" />
          <span className="text-xs mt-1 font-medium">{video.shares || 0}</span>
        </button>

        {/* Contact Button */}
        <button
          onClick={() => setShowContact(true)}
          className="flex flex-col items-center text-white hover:text-green-400 transition-colors hover:scale-110"
        >
          <MessageCircle className="h-7 w-7" />
          <span className="text-xs mt-1 font-medium">Contact</span>
        </button>
      </div>

      {/* Views Counter */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 text-white text-xs">
        {video.views || 0} views
      </div>

      {/* Contact Modal */}
      {showContact && <ContactAgentModal video={video} onClose={() => setShowContact(false)} />}
    </div>
  );
}
