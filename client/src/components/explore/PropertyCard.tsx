import { PropertyShort } from '@/../../shared/types';
import { Heart, Share2, MoreVertical, MapPin, Bed, Bath, Car } from 'lucide-react';
import { useState } from 'react';
import { PropertyOverlay } from './PropertyOverlay';

interface PropertyCardProps {
  property: PropertyShort;
  isActive: boolean;
  currentMediaIndex?: number;
  onSave?: () => void;
  onShare?: () => void;
  onMore?: () => void;
  onContactAgent?: () => void;
  onBookViewing?: () => void;
  onWhatsApp?: () => void;
}

export function PropertyCard({
  property,
  isActive,
  currentMediaIndex = 0,
  onSave,
  onShare,
  onMore,
  onContactAgent,
  onBookViewing,
  onWhatsApp,
}: PropertyCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isOverlayExpanded, setIsOverlayExpanded] = useState(false);

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave?.();
  };

  const handleShare = () => {
    onShare?.();
  };

  const handleMore = () => {
    onMore?.();
  };

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `R${(price / 1000000).toFixed(2)}M`;
    }
    return `R${price.toLocaleString()}`;
  };

  // Get current media based on index
  const currentMedia = property.media?.[currentMediaIndex] || property.media?.[0];

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Media Background */}
      <div className="absolute inset-0">
        {currentMedia ? (
          currentMedia.type === 'video' ? (
            <video
              key={currentMedia.id}
              src={currentMedia.url}
              poster={currentMedia.thumbnailUrl}
              className="w-full h-full object-cover"
              loop
              muted
              playsInline
              autoPlay={isActive}
            />
          ) : (
            <img
              key={currentMedia.id}
              src={currentMedia.url}
              alt={property.title}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-gray-500 text-6xl">🏠</div>
          </div>
        )}
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </div>

      {/* Top Action Icons */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
        <button
          onClick={handleSave}
          className="p-3 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-all"
          aria-label={isSaved ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Heart className={`w-6 h-6 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
        <button
          onClick={handleShare}
          className="p-3 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-all"
          aria-label="Share property"
        >
          <Share2 className="w-6 h-6" />
        </button>
        <button
          onClick={handleMore}
          className="p-3 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-all"
          aria-label="More options"
        >
          <MoreVertical className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Property Info */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pb-8">
        {/* Highlight Tags */}
        {property.highlightTags && property.highlightTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {property.highlightTags.slice(0, 4).map(tag => (
              <span
                key={tag.id}
                className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium"
                style={tag.color ? { backgroundColor: `${tag.color}40` } : undefined}
              >
                {tag.icon && <span className="mr-1">{tag.icon}</span>}
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        {property.property?.price && (
          <div className="text-white text-4xl font-bold mb-2">
            {formatPrice(property.property.price)}
          </div>
        )}

        {/* Location */}
        {property.property?.location && (
          <div className="flex items-center gap-2 text-white/90 text-lg mb-3">
            <MapPin className="w-5 h-5" />
            <span>
              {property.property.location.suburb && `${property.property.location.suburb}, `}
              {property.property.location.city}
            </span>
          </div>
        )}

        {/* Specs */}
        {property.property?.specs && (
          <div className="flex items-center gap-6 text-white/80">
            {property.property.specs.bedrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bed className="w-5 h-5" />
                <span className="text-lg">{property.property.specs.bedrooms}</span>
              </div>
            )}
            {property.property.specs.bathrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bath className="w-5 h-5" />
                <span className="text-lg">{property.property.specs.bathrooms}</span>
              </div>
            )}
            {property.property.specs.parking !== undefined && (
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                <span className="text-lg">{property.property.specs.parking}</span>
              </div>
            )}
          </div>
        )}

        {/* Agent Info */}
        {property.agent && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/20">
            {property.agent.logo ? (
              <img
                src={property.agent.logo}
                alt={property.agent.name}
                className="w-10 h-10 rounded-full object-cover bg-white"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                {property.agent.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="text-white text-sm font-medium">{property.agent.name}</div>
              <div className="text-white/60 text-xs">Property Agent</div>
            </div>
          </div>
        )}
      </div>

      {/* Media Counter (if multiple media items) */}
      {property.media && property.media.length > 1 && (
        <div className="absolute top-4 left-4 z-20">
          <div className="px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-medium">
            {currentMediaIndex + 1} / {property.media.length}
          </div>
        </div>
      )}

      {/* Tap zones indicator (subtle) */}
      {property.media && property.media.length > 1 && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-[30%] z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-[30%] z-10 pointer-events-none" />
        </>
      )}

      {/* Property Overlay */}
      <PropertyOverlay
        property={property}
        isExpanded={isOverlayExpanded}
        onToggleExpand={() => setIsOverlayExpanded(!isOverlayExpanded)}
        onContactAgent={() => {
          onContactAgent?.();
          setIsOverlayExpanded(false);
        }}
        onBookViewing={() => {
          onBookViewing?.();
          setIsOverlayExpanded(false);
        }}
        onWhatsApp={() => {
          onWhatsApp?.();
          setIsOverlayExpanded(false);
        }}
      />
    </div>
  );
}
