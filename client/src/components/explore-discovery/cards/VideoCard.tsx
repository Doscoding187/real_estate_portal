import { Play, Eye, Heart } from 'lucide-react';
import { useState } from 'react';

interface VideoCardProps {
  video: {
    id: number;
    title: string;
    thumbnailUrl: string;
    duration: number;
    views: number;
    creatorName: string;
    creatorAvatar?: string;
    isSaved?: boolean;
  };
  onClick: () => void;
  onSave: () => void;
}

export function VideoCard({ video, onClick, onSave }: VideoCardProps) {
  const [isSaved, setIsSaved] = useState(video.isSaved || false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onSave();
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] overflow-hidden bg-gray-100">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-white text-xs font-medium">
          {formatDuration(video.duration)}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
          aria-label={isSaved ? 'Unsave video' : 'Save video'}
        >
          <Heart
            className={`w-5 h-5 transition-all ${
              isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'
            }`}
          />
        </button>

        {/* Views badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-white text-xs font-medium">
          <Eye className="w-3 h-3" />
          <span>{formatViews(video.views)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {video.title}
        </h3>

        {/* Creator */}
        <div className="flex items-center gap-2">
          {video.creatorAvatar ? (
            <img
              src={video.creatorAvatar}
              alt={video.creatorName}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              {video.creatorName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-gray-600 truncate">{video.creatorName}</span>
        </div>
      </div>
    </div>
  );
}
