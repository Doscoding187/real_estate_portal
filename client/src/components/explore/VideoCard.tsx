import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Heart, Share2, MessageCircle, Play, Pause, TrendingUp, MapPin, Bed, Bath, Square, TreePine } from 'lucide-react';
import { ContactAgentModal } from './ContactAgentModal';

interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  userId: number;
  createdAt: Date;
  type?: string;
  propertyTitle?: string;
  propertyLocation?: string;
  propertyPrice?: number;
  caption?: string;
  duration?: number;
  isLiked?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  yardSize?: number;
  propertyType?: string;
  highlights?: string[];
}

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  onView?: () => void;
}

export default function VideoCard({ video, isActive, onView }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [liked, setLiked] = useState(video.isLiked || false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);

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

  // Double tap to like (TikTok-style)
  const handleDoubleTap = () => {
    if (!liked) {
      toggleLike.mutate({ videoId: video.id });
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
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
      {/* Video Container with Overlay */}
      <div className="relative h-full w-auto max-w-full">
        {/* Video or Image Element */}
        {video.videoUrl?.includes('unsplash.com') ? (
          // Placeholder Image
          <img
            src={video.videoUrl}
            alt={video.title}
            className="h-full w-auto max-w-full object-contain"
            loading="lazy"
            onDoubleClick={handleDoubleTap}
            onClick={() => setShowPropertyDetails(!showPropertyDetails)}
          />
        ) : (
          // Actual Video
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="h-full w-auto max-w-full object-contain"
            loop
            muted
            playsInline
            preload="metadata"
            poster={video.thumbnailUrl}
            onClick={togglePlayPause}
            onDoubleClick={handleDoubleTap}
            onLoadedMetadata={() => {
              // Video loaded, ready to play
            }}
          />
        )}

        {/* Tap to Play/Pause - TikTok Style (Only for videos) */}
        {!video.videoUrl?.includes('unsplash.com') && !showPropertyDetails && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ transition: 'opacity 0.2s ease-in-out' }}
          >
            {!isPlaying && (
              <div className="animate-in fade-in zoom-in duration-200">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/40 to-indigo-500/40 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/30">
                  <Play className="h-10 w-10 text-white ml-1" />
                </div>
              </div>
            )}
            {showPauseIcon && (
              <div className="animate-in fade-in zoom-in duration-200">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/40 to-indigo-500/40 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/30">
                  <Pause className="h-10 w-10 text-white" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Double Tap Like Animation */}
        {showLikeAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="animate-in zoom-in duration-500 animate-out fade-out duration-1000">
              <Heart className="h-32 w-32 text-red-500 fill-current drop-shadow-2xl" />
            </div>
          </div>
        )}

        {/* Property Details Overlay */}
        {showPropertyDetails && video.type === 'listing' && (
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col p-6 pointer-events-auto cursor-pointer"
            onClick={() => setShowPropertyDetails(false)}
          >
            <div className="flex-1 overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-white text-2xl font-bold mb-2">{video.propertyTitle}</h2>
                <div className="flex items-center gap-2 text-gray-200 mb-4">
                  <MapPin className="h-5 w-5 text-blue-400" />
                  <span>{video.propertyLocation}</span>
                </div>
                {video.propertyPrice && (
                  <p className="text-3xl font-bold text-white mb-6">{formatPrice(video.propertyPrice)}</p>
                )}
              </div>
              
              {/* Property Specs */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {video.bedrooms && (
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <Bed className="h-6 w-6 text-blue-400" />
                    <div>
                      <p className="text-white font-semibold">{video.bedrooms}</p>
                      <p className="text-gray-300 text-sm">Bedrooms</p>
                    </div>
                  </div>
                )}
                
                {video.bathrooms && (
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <Bath className="h-6 w-6 text-blue-400" />
                    <div>
                      <p className="text-white font-semibold">{video.bathrooms}</p>
                      <p className="text-gray-300 text-sm">Bathrooms</p>
                    </div>
                  </div>
                )}
                
                {video.area && (
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <Square className="h-6 w-6 text-blue-400" />
                    <div>
                      <p className="text-white font-semibold">{video.area.toLocaleString()} m²</p>
                      <p className="text-gray-300 text-sm">Building Size</p>
                    </div>
                  </div>
                )}
                
                {video.yardSize && (
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <TreePine className="h-6 w-6 text-blue-400" />
                    <div>
                      <p className="text-white font-semibold">{video.yardSize.toLocaleString()} m²</p>
                      <p className="text-gray-300 text-sm">Yard Size</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Highlights */}
              {video.highlights && video.highlights.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white text-lg font-bold mb-3">Property Highlights</h3>
                  <div className="flex flex-wrap gap-2">
                    {video.highlights.map((highlight, index) => (
                      <span 
                        key={index}
                        className="bg-gradient-to-r from-blue-500/30 to-indigo-500/30 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm border border-white/20"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center text-gray-300 text-sm mt-4">
              Tap anywhere to close
            </div>
          </div>
        )}

        {/* Enhanced Bottom Overlay - Google Style */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pb-20 md:pb-24 bg-gradient-to-t from-black via-black/80 to-transparent text-white pointer-events-none">
          {video.type === 'listing' ? (
            // Listing Video - Enhanced property details
            <div className="space-y-2">
              {/* Trending Badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500/90 to-red-500/90 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 shadow-lg">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-bold">Hot Property</span>
                </div>
              </div>

              {/* Property Title */}
              <h2 className="font-bold text-xl md:text-2xl line-clamp-2 mb-2 drop-shadow-lg">
                {video.propertyTitle}
              </h2>

              {/* Location */}
              <div className="flex items-center gap-2 text-sm md:text-base text-gray-200 mb-2">
                <MapPin className="h-4 w-4 text-blue-400" />
                <p className="line-clamp-1">{video.propertyLocation}</p>
              </div>

              {/* Property Specs Row */}
              <div className="flex items-center gap-3 text-xs md:text-sm text-gray-300 mb-2">
                {video.bedrooms && (
                  <div className="flex items-center gap-1">
                    <Bed className="h-4 w-4 text-blue-400" />
                    <span>{video.bedrooms}</span>
                  </div>
                )}
                {video.bathrooms && (
                  <div className="flex items-center gap-1">
                    <Bath className="h-4 w-4 text-blue-400" />
                    <span>{video.bathrooms}</span>
                  </div>
                )}
                {video.area && (
                  <div className="flex items-center gap-1">
                    <Square className="h-4 w-4 text-blue-400" />
                    <span>{video.area.toLocaleString()} m²</span>
                  </div>
                )}
                {video.yardSize && (
                  <div className="flex items-center gap-1">
                    <TreePine className="h-4 w-4 text-blue-400" />
                    <span>{video.yardSize.toLocaleString()} m²</span>
                  </div>
                )}
              </div>

              {/* Price */}
              {video.propertyPrice && (
                <div className="inline-block bg-gradient-to-r from-blue-600/90 to-indigo-600/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 shadow-lg">
                  <p className="font-bold text-white text-lg md:text-xl">
                    {formatPrice(video.propertyPrice)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Content Video - Show agent info
            <div className="mb-2">
              <p className="font-semibold text-base md:text-lg">@{video.agentName}</p>
            </div>
          )}

          {/* Caption */}
          {video.caption && (
            <p className="text-sm md:text-base text-gray-200 line-clamp-2 mt-2 drop-shadow-lg">
              {video.caption}
            </p>
          )}

          {/* Video duration */}
          {video.duration > 0 && (
            <p className="text-xs md:text-sm text-gray-300 mt-1">{formatDuration(video.duration)}</p>
          )}
        </div>
      </div>

      {/* Enhanced Floating Action Buttons - Google Style */}
      <div className="absolute right-3 md:right-4 bottom-28 md:bottom-32 flex flex-col items-center space-y-5 md:space-y-6 pointer-events-auto">
        {/* Like Button */}
        <button
          onClick={() => {
            toggleLike.mutate({ videoId: video.id });
            if (!liked) {
              setShowLikeAnimation(true);
              setTimeout(() => setShowLikeAnimation(false), 1000);
            }
          }}
          className={`flex flex-col items-center transition-all duration-300 active:scale-90 ${
            liked ? 'scale-110' : 'hover:scale-110'
          }`}
          disabled={toggleLike.isPending}
        >
          <div className={`p-3 md:p-3.5 rounded-full backdrop-blur-md border shadow-xl transition-all duration-300 ${
            liked 
              ? 'bg-gradient-to-br from-red-500/90 to-pink-500/90 border-white/40' 
              : 'bg-white/10 border-white/20 hover:bg-white/20'
          }`}>
            <Heart className={`h-7 w-7 md:h-8 md:w-8 transition-all duration-300 ${
              liked ? 'text-white fill-current' : 'text-white'
            }`} />
          </div>
          <span className="text-xs md:text-sm mt-1.5 font-bold drop-shadow-lg text-white">
            {video.likes + (liked ? 1 : 0) + (video.isLiked && !liked ? -1 : 0)}
          </span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center text-white transition-all duration-300 hover:scale-110 active:scale-90"
        >
          <div className="p-3 md:p-3.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:bg-gradient-to-br hover:from-blue-500/90 hover:to-indigo-500/90 hover:border-white/40 transition-all duration-300">
            <Share2 className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <span className="text-xs md:text-sm mt-1.5 font-bold drop-shadow-lg">
            {video.shares || 0}
          </span>
        </button>

        {/* Contact Button */}
        <button
          onClick={() => setShowContact(true)}
          className="flex flex-col items-center text-white transition-all duration-300 hover:scale-110 active:scale-90"
        >
          <div className="p-3 md:p-3.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:bg-gradient-to-br hover:from-green-500/90 hover:to-emerald-500/90 hover:border-white/40 transition-all duration-300">
            <MessageCircle className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <span className="text-xs md:text-sm mt-1.5 font-bold drop-shadow-lg">Contact</span>
        </button>
      </div>

      {/* Enhanced Views Counter */}
      <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-xl rounded-full px-4 py-2 text-white text-xs md:text-sm font-semibold border border-white/20 shadow-lg">
        <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          {video.views || 0}
        </span>
        <span className="text-white/90 ml-1">views</span>
      </div>

      {/* Contact Modal */}
      {showContact && <ContactAgentModal video={video} onClose={() => setShowContact(false)} />}
    </div>
  );
}
