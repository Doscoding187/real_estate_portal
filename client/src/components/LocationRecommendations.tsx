import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  TrendingUp,
  Building2,
  Home,
  School,
  ShoppingBag,
  Star,
  ArrowRight,
  Users,
  Train,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface LocationData {
  id: string;
  name: string;
  province: string;
  type: 'city' | 'suburb' | 'region';
  propertyCount: number;
  medianPrice: number;
  priceChange: number;
  amenities: {
    schools?: number;
    shops?: number;
    transport?: number;
    restaurants?: number;
  };
  description: string;
  featured?: boolean;
  image?: string;
  popularProperties?: number;
  averageRating?: number;
}

export function LocationRecommendations() {
  const [, setLocation] = useLocation();
  const [selectedProvince, setSelectedProvince] = useState('all');

  const provinces = [
    { value: 'all', label: 'All Provinces' },
    { value: 'gauteng', label: 'Gauteng' },
    { value: 'western-cape', label: 'Western Cape' },
    { value: 'kwazulu-natal', label: 'KwaZulu-Natal' },
    { value: 'eastern-cape', label: 'Eastern Cape' },
    { value: 'mpumalanga', label: 'Mpumalanga' },
  ];

  const locations: LocationData[] = [
    {
      id: 'sandton',
      name: 'Sandton',
      province: 'Gauteng',
      type: 'suburb',
      propertyCount: 1247,
      medianPrice: 2850000,
      priceChange: 8.5,
      amenities: {
        schools: 45,
        shops: 120,
        transport: 8,
        restaurants: 85,
      },
      description: 'Premier business district with luxury homes and excellent amenities',
      featured: true,
      image: '/api/placeholder/400/250',
      popularProperties: 89,
      averageRating: 4.6,
    },
    {
      id: 'sea-point',
      name: 'Sea Point',
      province: 'Western Cape',
      type: 'suburb',
      propertyCount: 892,
      medianPrice: 1850000,
      priceChange: 12.3,
      amenities: {
        schools: 12,
        shops: 78,
        transport: 15,
        restaurants: 120,
      },
      description: 'Coastal living with stunning ocean views and vibrant nightlife',
      featured: true,
      image: '/api/placeholder/400/250',
      popularProperties: 67,
      averageRating: 4.8,
    },
    {
      id: 'umhlanga',
      name: 'Umhlanga',
      province: 'KwaZulu-Natal',
      type: 'suburb',
      propertyCount: 643,
      medianPrice: 2250000,
      priceChange: 6.7,
      amenities: {
        schools: 18,
        shops: 65,
        transport: 6,
        restaurants: 45,
      },
      description: 'Upscale coastal suburb with beautiful beaches and modern amenities',
      featured: true,
      image: '/api/placeholder/400/250',
      popularProperties: 54,
      averageRating: 4.5,
    },
    {
      id: 'centurion',
      name: 'Centurion',
      province: 'Gauteng',
      type: 'suburb',
      propertyCount: 1089,
      medianPrice: 1650000,
      priceChange: 4.2,
      amenities: {
        schools: 32,
        shops: 89,
        transport: 12,
        restaurants: 67,
      },
      description: 'Family-friendly area with great schools and modern infrastructure',
      image: '/api/placeholder/400/250',
      popularProperties: 76,
      averageRating: 4.3,
    },
    {
      id: 'constantia',
      name: 'Constantia',
      province: 'Western Cape',
      type: 'suburb',
      propertyCount: 412,
      medianPrice: 5200000,
      priceChange: 15.8,
      amenities: {
        schools: 8,
        shops: 35,
        transport: 4,
        restaurants: 28,
      },
      description: 'Prestigious wine valley with luxury estates and rural charm',
      featured: true,
      image: '/api/placeholder/400/250',
      popularProperties: 34,
      averageRating: 4.9,
    },
    {
      id: 'melville',
      name: 'Melville',
      province: 'Gauteng',
      type: 'suburb',
      propertyCount: 523,
      medianPrice: 950000,
      priceChange: -2.1,
      amenities: {
        schools: 15,
        shops: 56,
        transport: 8,
        restaurants: 92,
      },
      description: 'Trendy bohemian suburb popular with young professionals',
      image: '/api/placeholder/400/250',
      popularProperties: 41,
      averageRating: 4.4,
    },
  ];

  const filteredLocations =
    selectedProvince === 'all'
      ? locations
      : locations.filter(
          loc => loc.province.toLowerCase().replace(/\s+/g, '-') === selectedProvince,
        );

  const handleLocationClick = (location: LocationData) => {
    const provinceSlug = location.province.toLowerCase().replace(/\s+/g, '-');
    const suburbSlug = location.name.toLowerCase().replace(/\s+/g, '-');
    setLocation(`/property-for-sale/${provinceSlug}/${suburbSlug}`);
  };

  const formatPrice = (price: number) => {
    return `R ${(price / 1000000).toFixed(1)}M`;
  };

  const formatPriceChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change}%`;
  };

  const AmenityIcon = ({ type, count }: { type: string; count: number }) => {
    switch (type) {
      case 'schools':
        return <School className="w-4 h-4" />;
      case 'shops':
        return <ShoppingBag className="w-4 h-4" />;
      case 'transport':
        return <Train className="w-4 h-4" />;
      case 'restaurants':
        return <ShoppingBag className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  return (
    <section className="py-12 lg:py-16 bg-slate-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-4">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">Popular Locations</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Discover Your Perfect Location
          </h2>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Explore South Africa's most desirable neighborhoods with detailed insights on property
            prices, amenities, and lifestyle offerings.
          </p>

          {/* Province Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {provinces.map(province => (
              <button
                key={province.value}
                onClick={() => setSelectedProvince(province.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedProvince === province.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'
                }`}
              >
                {province.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map((location, index) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => handleLocationClick(location)}
              className="cursor-pointer"
            >
              <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                {/* Image Section */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={location.image || '/api/placeholder/400/250'}
                    alt={location.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Featured Badge */}
                  {location.featured && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-yellow-500 text-white text-xs font-semibold">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    </div>
                  )}

                  {/* Rating */}
                  {location.averageRating && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium text-slate-700">
                          {location.averageRating}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Location Name */}
                  <div className="absolute bottom-3 left-3 text-white">
                    <h3 className="text-xl font-bold">{location.name}</h3>
                    <p className="text-sm opacity-90">{location.province}</p>
                  </div>
                </div>

                {/* Content Section */}
                <CardContent className="p-5">
                  {/* Price Info */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {formatPrice(location.medianPrice)}
                      </div>
                      <div className="text-sm text-slate-600">Median Price</div>
                    </div>
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                        location.priceChange >= 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs font-medium">
                        {formatPriceChange(location.priceChange)}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{location.description}</p>

                  {/* Amenities */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {Object.entries(location.amenities)
                      .slice(0, 4)
                      .map(([key, count]) => (
                        <div key={key} className="flex items-center gap-2 text-xs text-slate-600">
                          <AmenityIcon type={key} count={count} />
                          <span>
                            {count} {key}
                          </span>
                        </div>
                      ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{location.propertyCount} properties</span>
                      </div>
                      {location.popularProperties && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          <span>{location.popularProperties} popular</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-50 p-1 h-auto"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Button
            size="lg"
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            View All Locations
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
