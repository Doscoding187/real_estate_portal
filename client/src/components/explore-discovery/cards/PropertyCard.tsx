import { Heart, MapPin, Bed, Bath, Square } from 'lucide-react';
import { useState } from 'react';

interface PropertyCardProps {
  property: {
    id: number;
    title: string;
    price: number;
    priceMax?: number;
    location: string;
    beds?: number;
    baths?: number;
    size?: number;
    imageUrl: string;
    propertyType: string;
    isSaved?: boolean;
  };
  onClick: () => void;
  onSave: () => void;
}

export function PropertyCard({ property, onClick, onSave }: PropertyCardProps) {
  const [isSaved, setIsSaved] = useState(property.isSaved || false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPrice = () => {
    const formatter = new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    if (property.priceMax && property.priceMax > property.price) {
      return `${formatter.format(property.price)} - ${formatter.format(property.priceMax)}`;
    }
    return formatter.format(property.price);
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
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}
        <img
          src={property.imageUrl}
          alt={property.title}
          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
        
        {/* Save button */}
        <button
          onClick={handleSave}
          className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
          aria-label={isSaved ? 'Unsave property' : 'Save property'}
        >
          <Heart
            className={`w-5 h-5 transition-all ${
              isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'
            }`}
          />
        </button>

        {/* Property type badge */}
        <div className="absolute top-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs font-medium">
          {property.propertyType}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <div className="text-xl font-bold text-gray-900 mb-2">
          {formatPrice()}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="truncate">{property.location}</span>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-sm text-gray-700">
          {property.beds !== undefined && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              <span>{property.beds}</span>
            </div>
          )}
          {property.baths !== undefined && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              <span>{property.baths}</span>
            </div>
          )}
          {property.size && (
            <div className="flex items-center gap-1">
              <Square className="w-4 h-4" />
              <span>{property.size}m²</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
