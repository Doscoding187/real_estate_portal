import { MapPin, TrendingUp, Home, Users } from 'lucide-react';
import { useState } from 'react';

interface NeighbourhoodCardProps {
  neighbourhood: {
    id: number;
    name: string;
    city: string;
    imageUrl: string;
    propertyCount: number;
    avgPrice: number;
    priceChange?: number;
    followerCount?: number;
    highlights?: string[];
  };
  onClick: () => void;
  onFollow: () => void;
}

export function NeighbourhoodCard({ neighbourhood, onClick, onFollow }: NeighbourhoodCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `R${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `R${(price / 1000).toFixed(0)}K`;
    }
    return `R${price}`;
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowing(!isFollowing);
    onFollow();
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}
        <img
          src={neighbourhood.imageUrl}
          alt={neighbourhood.name}
          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Follow button */}
        <button
          onClick={handleFollow}
          className={`absolute top-3 right-3 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            isFollowing
              ? 'bg-white text-gray-900'
              : 'bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">
            {neighbourhood.name}
          </h3>
          <div className="flex items-center text-white/90 text-sm">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{neighbourhood.city}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        {/* Price info */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-gray-600 mb-1">Avg. Price</div>
            <div className="text-lg font-bold text-gray-900">
              {formatPrice(neighbourhood.avgPrice)}
            </div>
          </div>
          {neighbourhood.priceChange !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              neighbourhood.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`w-4 h-4 ${neighbourhood.priceChange < 0 ? 'rotate-180' : ''}`} />
              <span>{Math.abs(neighbourhood.priceChange)}%</span>
            </div>
          )}
        </div>

        {/* Highlights */}
        {neighbourhood.highlights && neighbourhood.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {neighbourhood.highlights.slice(0, 2).map((highlight, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
              >
                {highlight}
              </span>
            ))}
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Home className="w-4 h-4" />
            <span>{neighbourhood.propertyCount} properties</span>
          </div>
          {neighbourhood.followerCount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{neighbourhood.followerCount} followers</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
