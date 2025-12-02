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
  const [showPauseIcon, setShowPauseIcon] = useState(false);
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
      setShowPauseIcon(true);
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setShowPauseIcon(false);
        })
        .catch(() => setIsPlaying(false));
    }
  };

  // Auto-hide pause icon after 800ms
  useEffect(() => {
    if (showPauseIcon) {
      const timer = setTimeout(() => {
        setShowPauseIcon(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [showPauseIcon]);

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-black">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="h-full w-full object-cover md:w-auto md:max-w-[450px] md:object-contain"
        loop
        muted
        playsInline
        preload="metadata"
        poster={video.thumbnailUrl}
        onClick={togglePlayPause}
        onLoadedMetadata={() => {
          // Video loaded, ready to play
        }}
      />

      {/* Tap to Play/Pause - TikTok Style */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ transition: 'opacity 0.2s ease-in-out' }}
      >
        {!isPlaying && (
          <div className="animate-in fade-in zoom-in duration-200">
            <div className="h-20 w-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-10 w-10 text-white ml-1" />
            </div>
          </div>
        )}
        {showPauseIcon && (
          <div className="animate-in fade-in zoom-in duration-200">
            <div className="h-20 w-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Pause className="h-10 w-10 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 pb-20 md:pb-24 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white pointer-events-none">
        {video.type === 'listing' ? (
          // Listing Video - Show property details
          <div>
            <div className="flex items-start justify-between mb-2 gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg md:text-xl line-clamp-2 mb-1">{video.propertyTitle}</h2>
                <p className="text-sm md:text-base text-gray-200 line-clamp-1">{video.propertyLocation}</p>
              </div>
              {video.propertyPrice && (
                <p className="font-bold text-blue-400 text-lg md:text-xl flex-shrink-0">{formatPrice(video.propertyPrice)}</p>
              )}
            </div>
          </div>
        ) : (
          // Content Video - Show agent info
          <div className="mb-2">
            <p className="font-semibold text-base md:text-lg">@{video.agentName}</p>
          </div>
        )}

        {/* Caption */}
        {video.caption && (
          <p className="text-sm md:text-base text-gray-200 line-clamp-2 mb-2">{video.caption}</p>
        )}

        {/* Video duration */}
        {video.duration > 0 && (
          <p className="text-xs md:text-sm text-gray-300">{formatDuration(video.duration)}</p>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute right-3 md:right-4 bottom-28 md:bottom-32 flex flex-col items-center space-y-5 md:space-y-6 pointer-events-auto">
        {/* Like Button */}
        <button
          onClick={() => toggleLike.mutate({ videoId: video.id })}
          className={`flex flex-col items-center transition-all duration-200 active:scale-90 ${
            liked ? 'scale-110 text-red-500' : 'text-white hover:text-red-400 hover:scale-110'
          }`}
          disabled={toggleLike.isPending}
        >
          <div className="p-2.5 md:p-3 rounded-full bg-black/30 backdrop-blur-sm">
            <Heart className={`h-7 w-7 md:h-8 md:w-8 ${liked ? 'fill-current' : ''}`} />
          </div>
          <span className="text-xs md:text-sm mt-1 font-semibold drop-shadow-lg">
            {video.likes + (liked ? 1 : 0) + (video.isLiked && !liked ? -1 : 0)}
          </span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center text-white hover:text-blue-400 transition-all duration-200 hover:scale-110 active:scale-90"
        >
          <div className="p-2.5 md:p-3 rounded-full bg-black/30 backdrop-blur-sm">
            <Share2 className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <span className="text-xs md:text-sm mt-1 font-semibold drop-shadow-lg">{video.shares || 0}</span>
        </button>

        {/* Contact Button */}
        <button
          onClick={() => setShowContact(true)}
          className="flex flex-col items-center text-white hover:text-green-400 transition-all duration-200 hover:scale-110 active:scale-90"
        >
          <div className="p-2.5 md:p-3 rounded-full bg-black/30 backdrop-blur-sm">
            <MessageCircle className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <span className="text-xs md:text-sm mt-1 font-semibold drop-shadow-lg">Contact</span>
        </button>
      </div>

      {/* Views Counter */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs md:text-sm font-medium">
        {video.views || 0} views
      </div>

      {/* Contact Modal */}
      {showContact && <ContactAgentModal video={video} onClose={() => setShowContact(false)} />}
    </div>
  );
}
