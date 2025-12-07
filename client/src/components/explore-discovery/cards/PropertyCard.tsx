/**
 * PropertyCard Component
 * 
 * Modern property card with subtle shadows and smooth animations.
 * Uses ModernCard as base for consistent design system integration.
 * 
 * Features:
 * - Hover lift animation (2px translateY) - Requirements 9.1
 * - Press state animation (scale 0.98) - Requirements 9.2
 * - High contrast for readability - Requirements 1.2
 * - Subtle shadow design - Requirements 1.2
 * - Progressive image loading
 * - Save functionality integration
 */

import { MapPin, Bed, Bath, Square } from 'lucide-react';
import { useState } from 'react';
import { SaveButton } from '../SaveButton';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { designTokens } from '@/lib/design-tokens';

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

  return (
    <ModernCard
      onClick={onClick}
      className="group relative overflow-hidden p-0"
      hoverable={true}
      variant="default"
      as="article"
      aria-label={`Property: ${property.title} at ${property.location}, priced at ${formatPrice()}`}
      role="article"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}
        <img
          src={property.imageUrl}
          alt={property.title}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
        
        {/* Save button - Requirements 14.1, 14.2 */}
        <div className="absolute top-3 right-3 z-10">
          <SaveButton
            propertyId={property.id}
            initialSaved={property.isSaved}
            variant="card"
            size="md"
            onSaveSuccess={onSave}
          />
        </div>

        {/* Property type badge */}
        <div 
          className="absolute top-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs font-medium"
          role="status"
          aria-label={`Property type: ${property.propertyType}`}
        >
          {property.propertyType}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price - High contrast for readability */}
        <div 
          className="text-xl font-bold mb-2"
          style={{ color: designTokens.colors.text.primary }}
        >
          {formatPrice()}
        </div>

        {/* Title - High contrast with hover effect */}
        <h3 
          className="text-base font-semibold mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors duration-200"
          style={{ color: designTokens.colors.text.primary }}
        >
          {property.title}
        </h3>

        {/* Location - Good contrast for secondary text */}
        <div 
          className="flex items-center text-sm mb-3"
          style={{ color: designTokens.colors.text.secondary }}
        >
          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="truncate">{property.location}</span>
        </div>

        {/* Features - Clear, readable icons and text */}
        <div 
          className="flex items-center gap-4 text-sm"
          style={{ color: designTokens.colors.text.primary }}
          role="list"
          aria-label="Property features"
        >
          {property.beds !== undefined && (
            <div className="flex items-center gap-1" role="listitem">
              <Bed className="w-4 h-4" aria-hidden="true" />
              <span className="font-medium">
                <span className="sr-only">Bedrooms: </span>
                {property.beds}
              </span>
            </div>
          )}
          {property.baths !== undefined && (
            <div className="flex items-center gap-1" role="listitem">
              <Bath className="w-4 h-4" aria-hidden="true" />
              <span className="font-medium">
                <span className="sr-only">Bathrooms: </span>
                {property.baths}
              </span>
            </div>
          )}
          {property.size && (
            <div className="flex items-center gap-1" role="listitem">
              <Square className="w-4 h-4" aria-hidden="true" />
              <span className="font-medium">
                <span className="sr-only">Size: </span>
                {property.size}m²
              </span>
            </div>
          )}
        </div>
      </div>
    </ModernCard>
  );
}
