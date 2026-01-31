import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Square,
  Building2,
  Home,
  Camera,
  Star,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { trpc } from '@/lib/trpc';

interface PropertyCardProps {
  id: string;
  title: string;
  price: number;
  location: string;
  suburb?: string;
  city: string;
  province: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  image: string;
  featured?: boolean;
  isNew?: boolean;
  isHot?: boolean;
  listingType: 'sale' | 'rent';
  agentName?: string;
  agencyName?: string;
  views?: number;
  daysOnMarket?: number;
}

export function PropertyCard({
  id,
  title,
  price,
  location,
  suburb,
  city,
  province,
  propertyType,
  bedrooms,
  bathrooms,
  size,
  image,
  featured = false,
  isNew = false,
  isHot = false,
  listingType,
  agentName,
  agencyName,
  views,
  daysOnMarket,
}: PropertyCardProps) {
  const [, setLocation] = useLocation();
  const [isFavorited, setIsFavorited] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  const formatPrice = (price: number, listingType: 'sale' | 'rent') => {
    if (listingType === 'rent') {
      return `R ${price.toLocaleString()}/mo`;
    }
    return `R ${price.toLocaleString()}`;
  };

  const getPropertyTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'apartment':
      case 'flat':
        return Building2;
      case 'house':
      case 'villa':
        return Home;
      default:
        return Building2;
    }
  };

  const PropertyTypeIcon = getPropertyTypeIcon(propertyType);

  const handleCardClick = () => {
    const baseUrl = listingType === 'sale' ? '/property-for-sale' : '/property-to-rent';
    const provinceSlug = province.toLowerCase().replace(/\s+/g, '-');
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const suburbSlug = suburb?.toLowerCase().replace(/\s+/g, '-');

    let url = `${baseUrl}/${provinceSlug}/${citySlug}`;
    if (suburbSlug) {
      url += `/${suburbSlug}`;
    }
    url += `/${id}`;

    setLocation(url);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer"
      onClick={handleCardClick}
    >
      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group">
        {/* Image Container */}
        <div className="relative h-48 lg:h-56 overflow-hidden">
          <img
            src={image || '/api/placeholder/400/300'}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {featured && (
              <Badge className="bg-yellow-500 text-white text-xs font-semibold px-2 py-1">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
            {isNew && (
              <Badge className="bg-green-500 text-white text-xs font-semibold px-2 py-1">New</Badge>
            )}
            {isHot && (
              <Badge className="bg-red-500 text-white text-xs font-semibold px-2 py-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                Hot Deal
              </Badge>
            )}
          </div>

          {/* Favorite Button */}
          <button
            onClick={handleFavorite}
            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all group/favorite"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorited
                  ? 'fill-red-500 text-red-500'
                  : 'text-slate-600 group-hover/favorite:text-red-500'
              }`}
            />
          </button>

          {/* Image Counter */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
            <Camera className="w-3 h-3 text-slate-600" />
            <span className="text-xs text-slate-600">12</span>
          </div>

          {/* Property Type Icon */}
          <div className="absolute bottom-3 left-3">
            <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center">
              <PropertyTypeIcon className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4 lg:p-5">
          {/* Price and Status */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xl lg:text-2xl font-bold text-slate-900 mb-1">
                {formatPrice(price, listingType)}
              </div>
              {listingType === 'sale' && (
                <div className="text-sm text-slate-600">
                  {size && `${size.toLocaleString()} m²`}
                </div>
              )}
            </div>
            {daysOnMarket && <div className="text-xs text-slate-500">{daysOnMarket} days ago</div>}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>

          {/* Location */}
          <div className="flex items-center text-slate-600 text-sm mb-3">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="line-clamp-1">
              {suburb ? `${suburb}, ${city}` : city}, {province}
            </span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
            {bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="w-4 h-4" />
                <span>{bedrooms}</span>
              </div>
            )}
            {bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="w-4 h-4" />
                <span>{bathrooms}</span>
              </div>
            )}
            {size && (
              <div className="flex items-center gap-1">
                <Square className="w-4 h-4" />
                <span>{size}m²</span>
              </div>
            )}
          </div>

          {/* Agent/Agency Info */}
          {(agentName || agencyName) && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {agentName && <div className="font-medium text-slate-700">{agentName}</div>}
                  {agencyName && <div className="text-slate-500">{agencyName}</div>}
                </div>
                {views && <div className="text-xs text-slate-500">{views} views</div>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface PropertyShowcaseProps {
  title: string;
  subtitle?: string;
  listingType: 'sale' | 'rent';
  propertyType?: string;
  location?: string;
  limit?: number;
  showViewAll?: boolean;
}

export function PropertyShowcase({
  title,
  subtitle,
  listingType,
  propertyType,
  location,
  limit = 6,
  showViewAll = true,
}: PropertyShowcaseProps) {
  const [, setLocation] = useLocation();

  // Mock data for demonstration - replace with actual API call
  const mockProperties: PropertyCardProps[] = [
    {
      id: '1',
      title: 'Modern 3-Bedroom Family Home in Secure Estate',
      price: listingType === 'sale' ? 2850000 : 15000,
      location: 'Sandton',
      suburb: 'Morningside',
      city: 'Johannesburg',
      province: 'Gauteng',
      propertyType: 'house',
      bedrooms: 3,
      bathrooms: 2,
      size: 180,
      image: '/api/placeholder/400/300',
      featured: true,
      isNew: false,
      isHot: true,
      listingType,
      agentName: 'John Smith',
      agencyName: 'Premium Properties',
      views: 245,
      daysOnMarket: 3,
    },
    {
      id: '2',
      title: 'Luxury 2-Bedroom Apartment with City Views',
      price: listingType === 'sale' ? 1850000 : 12000,
      location: 'Cape Town',
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
      propertyType: 'apartment',
      bedrooms: 2,
      bathrooms: 2,
      size: 95,
      image: '/api/placeholder/400/300',
      featured: false,
      isNew: true,
      isHot: false,
      listingType,
      agentName: 'Sarah Johnson',
      agencyName: 'Coastal Realty',
      views: 189,
      daysOnMarket: 7,
    },
    {
      id: '3',
      title: 'Spacious 4-Bedroom House with Garden',
      price: listingType === 'sale' ? 4200000 : 22000,
      location: 'Durban',
      suburb: 'Umhlanga',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      propertyType: 'house',
      bedrooms: 4,
      bathrooms: 3,
      size: 320,
      image: '/api/placeholder/400/300',
      featured: true,
      isNew: false,
      isHot: false,
      listingType,
      agentName: 'Mike Wilson',
      agencyName: 'Coastal Homes',
      views: 156,
      daysOnMarket: 14,
    },
    {
      id: '4',
      title: 'Stylish 1-Bedroom Loft in Trendy Area',
      price: listingType === 'sale' ? 950000 : 7500,
      location: 'Johannesburg',
      suburb: 'Melville',
      city: 'Johannesburg',
      province: 'Gauteng',
      propertyType: 'apartment',
      bedrooms: 1,
      bathrooms: 1,
      size: 65,
      image: '/api/placeholder/400/300',
      featured: false,
      isNew: true,
      isHot: false,
      listingType,
      agentName: 'Lisa Anderson',
      agencyName: 'Urban Living',
      views: 312,
      daysOnMarket: 2,
    },
    {
      id: '5',
      title: 'Beautiful 3-Bedroom Townhouse',
      price: listingType === 'sale' ? 1650000 : 9500,
      location: 'Pretoria',
      suburb: 'Centurion',
      city: 'Pretoria',
      province: 'Gauteng',
      propertyType: 'townhouse',
      bedrooms: 3,
      bathrooms: 2,
      size: 145,
      image: '/api/placeholder/400/300',
      featured: false,
      isNew: false,
      isHot: true,
      listingType,
      agentName: 'David Brown',
      agencyName: 'Township Properties',
      views: 98,
      daysOnMarket: 21,
    },
    {
      id: '6',
      title: 'Elegant 5-Bedroom Villa with Pool',
      price: listingType === 'sale' ? 6800000 : 35000,
      location: 'Cape Town',
      suburb: 'Constantia',
      city: 'Cape Town',
      province: 'Western Cape',
      propertyType: 'villa',
      bedrooms: 5,
      bathrooms: 4,
      size: 450,
      image: '/api/placeholder/400/300',
      featured: true,
      isNew: false,
      isHot: false,
      listingType,
      agentName: 'Emma Taylor',
      agencyName: 'Luxury Estates',
      views: 423,
      daysOnMarket: 5,
    },
  ].slice(0, limit);

  const handleViewAll = () => {
    const baseUrl = listingType === 'sale' ? '/property-for-sale' : '/property-to-rent';
    const params = new URLSearchParams();

    if (propertyType && propertyType !== 'all') {
      params.set('propertyType', propertyType);
    }

    if (location) {
      params.set('location', location);
    }

    const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    setLocation(url);
  };

  return (
    <section className="py-12 lg:py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">{title}</h2>
            {subtitle && <p className="text-slate-600">{subtitle}</p>}
          </div>

          {showViewAll && (
            <Button
              variant="outline"
              onClick={handleViewAll}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              View All Properties
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProperties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <PropertyCard {...property} />
            </motion.div>
          ))}
        </div>

        {/* No Properties Message */}
        {mockProperties.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No properties found</h3>
            <p className="text-slate-500">
              Try adjusting your search criteria or check back later for new listings.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
