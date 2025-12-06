/**
 * Video Overlay Component
 * Property information overlay with action buttons
 * Requirements: 1.3, 1.4, 1.5, 1.7
 */

import { Heart, Share2, User, ExternalLink, MapPin, Bed, Bath, Home } from 'lucide-react';
import { useState } from 'react';

interface VideoOverlayProps {
  video: {
    id: number;
    title: string;
    description?: string;
    priceMin?: number;
    priceMax?: number;
    tags: string[];
    creatorId: number;
    propertyId?: number;
    developmentId?: number;
  };
  isMuted: boolean;
  onSave: () => void;
  onShare: () => void;
  onViewListing: () => void;
  onToggleMute: () => void;
}

export function VideoOverlay({
  video,
  isMuted,
  onSave,
  onShare,
  onViewListing,
  onToggleMute,
}: VideoOverlayProps) {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave();
  };

  // Format price
  const formatPrice = () => {
    if (video.priceMin && video.priceMax) {
      if (video.priceMin === video.priceMax) {
        return `R${video.priceMin.toLocaleString()}`;
      }
      return `R${video.priceMin.toLocaleString()} - R${video.priceMax.toLocaleString()}`;
    }
    if (video.priceMin) {
      return `From R${video.priceMin.toLocaleString()}`;
    }
    return null;
  };

  const price = formatPrice();

  return (
    <>
      {/* Bottom overlay with property info - Requirement 1.3 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-32 pb-6 px-6">
        {/* Property title */}
        <h2 className="text-white text-2xl font-bold mb-2 line-clamp-2">
          {video.title}
        </h2>

        {/* Price - Requirement 1.3 */}
        {price && (
          <div className="text-white text-xl font-semibold mb-3">
            {price}
          </div>
        )}

        {/* Description */}
        {video.description && (
          <p className="text-white/90 text-sm mb-4 line-clamp-2">
            {video.description}
          </p>
        )}

        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {video.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* View Listing button - Requirement 1.7 */}
        <button
          onClick={onViewListing}
          className="w-full py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-5 h-5" />
          View Full Listing
        </button>
      </div>

      {/* Right side action buttons */}
      <div className="absolute right-4 bottom-32 z-20 flex flex-col gap-4">
        {/* Save button - Requirement 1.4 */}
        <button
          onClick={handleSave}
          className="flex flex-col items-center gap-1 group"
          aria-label={isSaved ? 'Unsave property' : 'Save property'}
        >
          <div className="p-3 bg-black/50 rounded-full group-hover:bg-black/70 transition-colors">
            <Heart
              className={`w-6 h-6 ${
                isSaved ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </div>
          <span className="text-white text-xs font-medium">
            {isSaved ? 'Saved' : 'Save'}
          </span>
        </button>

        {/* Share button */}
        <button
          onClick={onShare}
          className="flex flex-col items-center gap-1 group"
          aria-label="Share property"
        >
          <div className="p-3 bg-black/50 rounded-full group-hover:bg-black/70 transition-colors">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </button>

        {/* Profile button - Requirement 1.5 */}
        <button
          onClick={() => {
            // TODO: Navigate to creator profile
            console.log('Navigate to creator:', video.creatorId);
          }}
          className="flex flex-col items-center gap-1 group"
          aria-label="View agent profile"
        >
          <div className="p-3 bg-black/50 rounded-full group-hover:bg-black/70 transition-colors">
            <User className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Agent</span>
        </button>
      </div>

      {/* Top left: Property type indicator */}
      <div className="absolute top-20 left-4 z-20">
        <div className="px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full flex items-center gap-2">
          <Home className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">
            {video.developmentId ? 'Development' : 'Property'}
          </span>
        </div>
      </div>
    </>
  );
}
