import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import {
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  Share2,
  Calendar,
  Eye,
  ArrowLeft,
  CheckCircle2,
  Home,
  ChevronRight,
  Phone,
  Mail,
  MessageSquare,
  Building2,
  Car,
  Wifi,
  Dumbbell,
  Trees,
  Shield,
  Zap,
  Droplets,
  User,
  Calculator,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { PropertyImageGallery } from '@/components/property/PropertyImageGallery';
import { PropertyContactModal } from '@/components/property/PropertyContactModal';
import { PropertyShareModal } from '@/components/property/PropertyShareModal';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { GoogleAmenitiesMap } from '@/components/maps/GoogleAmenitiesMap';
import { BondCalculator } from '@/components/BondCalculator';
import PropertyCard from '@/components/PropertyCard';
import { SidebarContactForm } from '@/components/property/SidebarContactForm';
import { ResponsiveHighlights } from '@/components/ResponsiveHighlights';

const amenityIcons: Record<string, any> = {
  parking: Car,
  wifi: Wifi,
  gym: Dumbbell,
  garden: Trees,
  security: Shield,
  pool: Droplets,
  electricity: Zap,
};

export default function PropertyDetail() {
  const [, params] = useRoute('/property/:id');
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const propertyId = params?.id ? parseInt(params.id) : 0;

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const { data, isLoading } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 },
  );

  // Fetch similar properties
  const { data: similarPropertiesData } = trpc.properties.getAll.useQuery(
    {
      limit: 6,
      city: data?.property?.city,
      propertyType: data?.property?.propertyType,
    },
    {
      enabled: !!data?.property,
    },
  );

  const addFavoriteMutation = trpc.favorites.add.useMutation({
    onSuccess: () => {
      toast.success('Added to favorites');
    },
    onError: () => {
      toast.error('Failed to add to favorites');
    },
  });

  const handleFavoriteClick = () => {
    if (!isAuthenticated) {
      toast.error('Please login to save favorites');
      return;
    }
    addFavoriteMutation.mutate({ propertyId });
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ListingNavbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data?.property) {
    return (
      <div className="min-h-screen bg-background">
        <ListingNavbar />
        <div className="container py-20 text-center">
          <h2 className="text-2xl font-semibold mb-4">Property Not Found</h2>
          <Button onClick={() => setLocation('/properties')}>Back to Properties</Button>
        </div>
      </div>
    );
  }

  const { property, images, agent } = data;
  const amenitiesList = property.amenities ? JSON.parse(property.amenities) : [];
  // Use highlights if available (from features/amenities)
  const highlights = property.features ? JSON.parse(property.features) : amenitiesList;
  
  const description = property.description || '';
  const shouldTruncate = description.length > 300;
  const displayDescription = showFullDescription || !shouldTruncate 
    ? description 
    : description.slice(0, 300) + '...';

  const similarProperties = similarPropertiesData?.properties?.filter(
    p => p.id !== propertyId
  ).slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />

      {/* Hero / Header Section */}
      <div className="bg-white border-b border-slate-200 pt-16">
        <div className="container py-6">
          {/* Top Row: Badges */}
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-md px-3 py-1 font-normal">
              FEATURED
            </Badge>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-0 rounded-md px-3 py-1 font-normal">
              Ready to move
            </Badge>
          </div>

          {/* Title Row with Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-1">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{property.title}</h1>
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="h-4 w-4" />
                <span className="text-base text-slate-500">
                  {property.address}, {property.city}, {property.province}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={handleFavoriteClick} className="h-10 w-10 border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-red-500">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare} className="h-10 w-10 border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-blue-600">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-6">
                Shortlist
              </Button>
              <Button 
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 h-10"
                onClick={() => setIsContactModalOpen(true)}
              >
                Contact Agent
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Image Gallery + Property Info Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Left Column - Image Gallery */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
              <PropertyImageGallery images={images} propertyTitle={property.title} />
            </div>
          </div>

          {/* Right Column - Property Info */}
          <div className="lg:col-span-5 space-y-8">
            {/* Price Section */}
            <div>
              <div className="text-4xl font-bold text-orange-500 mb-2">
                {formatCurrency(property.price, { compact: false })}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 font-medium">Estimated Repayment:</span>
                <span className="text-slate-900 font-bold">{formatCurrency(Math.round(property.price * 0.0095), { compact: false })}/Pm</span>
                <button className="text-blue-500 hover:text-blue-600 font-medium hover:underline ml-1">
                  Get Pre-Qualified
                </button>
              </div>
            </div>

            {/* Property Details */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Property Details</h3>
              <div className="grid grid-cols-3 gap-4">
                {property.bedrooms && (
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                      <Bed className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Bedrooms</p>
                      <p className="font-semibold text-slate-900">{property.bedrooms} Bedrooms</p>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                      <Bath className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Bathrooms</p>
                      <p className="font-semibold text-slate-900">{property.bathrooms} Bathrooms</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Parking</p>
                    <p className="font-semibold text-slate-900">Garage</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                    <Maximize className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">House Size</p>
                    <p className="font-semibold text-slate-900">{property.area.toLocaleString()} m²</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                    <Home className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Yard/Stand Size</p>
                    <p className="font-semibold text-slate-900">150 m²</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Property Type</p>
                    <p className="font-semibold text-slate-900 capitalize">{property.propertyType}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Rooms */}
            <div>
              <h3 className="text-lg font-medium text-slate-400 mb-3">Additional rooms & Specifications</h3>
              <div className="flex flex-wrap gap-2">
                {['Study Room', 'Office', 'Cottage'].map((room) => (
                  <Badge key={room} variant="secondary" className="bg-orange-50 text-slate-900 hover:bg-orange-100 border-0 px-4 py-1.5 rounded-full font-medium">
                    {room}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Amenities & Features</h3>
              {highlights.length > 0 ? (
                <div className="grid grid-cols-3 gap-y-3 gap-x-2">
                  {highlights.map((amenity: string, index: number) => {
                    const IconComponent = amenityIcons[amenity.toLowerCase()] || CheckCircle2;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5 text-orange-500" />
                        <span className="capitalize text-slate-700 font-medium">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 italic">No specific amenities listed.</p>
              )}
            </div>
          </div>
        </div>

        {/* Full-width separator */}
        <Separator className="my-8" />

        {/* Main Content Area - Two Column Layout (8/4) */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN (8 columns) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* 2.1 About This Property */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-900">About This Property</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {displayDescription}
                </p>
                {shouldTruncate && (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-blue-600 font-medium mt-4"
                    onClick={() => setShowFullDescription(!showFullDescription)}
                  >
                    {showFullDescription ? 'Show Less' : 'Read Full Description'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* 2.2 Property Features / Specs Table */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-900">Property Features & Specifications</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Home className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Ownership Type</p>
                      <p className="font-semibold text-slate-900">Freehold</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Zap className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Power Backup</p>
                      <p className="font-semibold text-slate-900">Full Backup</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Shield className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Security</p>
                      <p className="font-semibold text-slate-900">24/7 Security</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Droplets className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Water Supply</p>
                      <p className="font-semibold text-slate-900">Municipal</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Wifi className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Internet</p>
                      <p className="font-semibold text-slate-900">Fiber Ready</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Building2 className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Flooring</p>
                      <p className="font-semibold text-slate-900">Tiled</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Car className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Parking Type</p>
                      <p className="font-semibold text-slate-900">Covered Garage</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Pet Friendly</p>
                      <p className="font-semibold text-slate-900">Yes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Zap className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Energy Efficiency</p>
                      <p className="font-semibold text-slate-900">A+ Rated</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2.3 Agent Overview */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-900">Agent Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-20 h-20 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200 shrink-0">
                    {agent?.image ? (
                      <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-bold text-xl">
                        {agent?.name?.charAt(0) || 'A'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{agent?.name || 'Property Agent'}</h3>
                    <p className="text-slate-500 text-sm mb-2">Real Estate Portal Agent</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-slate-500">Experience</p>
                        <p className="font-semibold text-slate-900">5+ Years</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Total Listings</p>
                        <p className="font-semibold text-slate-900">120+</p>
                      </div>
                    </div>
                    
                    {/* Contact Form in Agent Section */}
                    <div className="space-y-3 mt-4 p-4 bg-slate-50 rounded-lg">
                      <input type="text" placeholder="Your Name" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                      <input type="email" placeholder="Your Email" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                      <input type="tel" placeholder="Your Phone" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                      <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                        <span className="mr-2">💬</span> WhatsApp Agent
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2.4 Nearby Landmarks */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-900">Nearby Landmarks</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Map */}
                <div className="rounded-xl overflow-hidden border border-slate-200 h-[300px] mb-4">
                  {property.latitude && property.longitude ? (
                    <GooglePropertyMap
                      center={{ lat: property.latitude, lng: property.longitude }}
                      zoom={14}
                      properties={[
                        {
                          id: property.id,
                          title: property.title,
                          price: property.price,
                          propertyType: property.propertyType,
                          listingType: property.listingType,
                          latitude: property.latitude,
                          longitude: property.longitude,
                          address: property.address,
                          city: property.city,
                          bedrooms: property.bedrooms,
                          bathrooms: property.bathrooms,
                          area: property.area,
                        },
                      ]}
                      showControls={false}
                      showFilters={false}
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400">
                      Map not available
                    </div>
                  )}
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <Badge className="bg-orange-500 text-white cursor-pointer">Education</Badge>
                  <Badge variant="outline" className="cursor-pointer">Health</Badge>
                  <Badge variant="outline" className="cursor-pointer">Transport</Badge>
                  <Badge variant="outline" className="cursor-pointer">Shopping</Badge>
                  <Badge variant="outline" className="cursor-pointer">Entertainment</Badge>
                </div>

                {/* Landmarks List */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-900 font-medium">Reddam House School</span>
                    <span className="text-sm text-slate-500">1.2 km</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-900 font-medium">St Peter's College</span>
                    <span className="text-sm text-slate-500">2.5 km</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-900 font-medium">University of Johannesburg</span>
                    <span className="text-sm text-slate-500">5.1 km</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4">View More</Button>
              </CardContent>
            </Card>

            {/* 2.5 Ratings & Local Reviews Summary */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-900">Location Ratings & Reviews</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">{property.city}, {property.province}</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <div key={star} className="w-5 h-5 bg-amber-400 rounded-sm" />
                      ))}
                    </div>
                    <span className="text-sm text-slate-600">(4.5 out of 5)</span>
                  </div>
                </div>

                {/* Feature Ratings */}
                <div className="space-y-3 mb-6">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Connectivity</span>
                      <span className="font-semibold text-slate-900">4.8/5</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{width: '96%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Safety & Security</span>
                      <span className="font-semibold text-slate-900">4.6/5</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{width: '92%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Infrastructure</span>
                      <span className="font-semibold text-slate-900">4.3/5</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{width: '86%'}}></div>
                    </div>
                  </div>
                </div>

                {/* Good Things & Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h5 className="font-semibold text-green-900 mb-2">Good Things</h5>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Great connectivity to highways</li>
                      <li>• Close to shopping centers</li>
                      <li>• Good schools nearby</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <h5 className="font-semibold text-amber-900 mb-2">Needs Improvement</h5>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• Public transport options</li>
                      <li>• More parks needed</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2.6 Resident Reviews */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-900">Resident Reviews</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Review 1 */}
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="font-semibold text-slate-900">John Smith</h5>
                        <p className="text-sm text-slate-500">Resident for 2 years</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div key={star} className="w-4 h-4 bg-amber-400 rounded-sm" />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-green-600 font-medium mb-1">Positive</p>
                        <p className="text-sm text-slate-600">Great neighborhood, quiet area</p>
                      </div>
                      <div>
                        <p className="text-xs text-amber-600 font-medium mb-1">Negative</p>
                        <p className="text-sm text-slate-600">Could use more street lighting</p>
                      </div>
                    </div>
                    <Button variant="link" className="p-0 h-auto text-blue-600 text-sm">Read more</Button>
                  </div>

                  {/* Review 2 */}
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="font-semibold text-slate-900">Sarah Johnson</h5>
                        <p className="text-sm text-slate-500">Resident for 3 years</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((star) => (
                          <div key={star} className="w-4 h-4 bg-amber-400 rounded-sm" />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-green-600 font-medium mb-1">Positive</p>
                        <p className="text-sm text-slate-600">Excellent schools, safe area</p>
                      </div>
                      <div>
                        <p className="text-xs text-amber-600 font-medium mb-1">Negative</p>
                        <p className="text-sm text-slate-600">Traffic during peak hours</p>
                      </div>
                    </div>
                    <Button variant="link" className="p-0 h-auto text-blue-600 text-sm">Read more</Button>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4">View All Reviews</Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN (4 columns) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            
            {/* 2.7 Why You Should Consider This Property */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-900">Why Consider This Property</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#005ca8] mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-700">Fresh construction with modern amenities</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#005ca8] mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-700">Prime location with excellent connectivity</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#005ca8] mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-700">Top-rated schools and hospitals nearby</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#005ca8] mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-700">High ROI potential in growing area</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#005ca8] mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-700">Gated community with 24/7 security</p>
                  </div>
                </div>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  Request More Info
                </Button>
              </CardContent>
            </Card>

            {/* 2.8 Contact Seller Form */}
            <Card className="border-slate-200 shadow-lg">
              <div className="bg-[#005ca8] p-4 text-white rounded-t-xl">
                <h3 className="font-bold text-lg">Contact Seller</h3>
              </div>
              <CardContent className="p-6">
                <SidebarContactForm />
              </CardContent>
            </Card>

            {/* 2.9 Loan Estimate / Promotional Card */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  Home Loan Estimate
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <BondCalculator defaultPrice={property.price} />
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h5 className="font-semibold text-blue-900 text-sm mb-2">Benefits</h5>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Competitive interest rates</li>
                    <li>• Quick approval process</li>
                    <li>• Flexible repayment options</li>
                  </ul>
                  <Button variant="outline" className="w-full mt-3 border-blue-300 text-blue-700 hover:bg-blue-100 text-sm">
                    Check Eligibility Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 3 - FULL WIDTH FOOTER - Similar Properties */}
        {similarProperties.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Similar Properties in This Area</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarProperties.map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => setLocation(`/property/${prop.id}`)}
                  className="cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                >
                  <PropertyCard
                    id={prop.id.toString()}
                    title={prop.title}
                    price={prop.price}
                    location={`${prop.city}, ${prop.province}`}
                    image={prop.mainImage || '/placeholder-property.jpg'}
                    description={prop.description?.slice(0, 100)}
                    bedrooms={prop.bedrooms}
                    bathrooms={prop.bathrooms}
                    area={prop.area}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PropertyContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        propertyId={propertyId}
        propertyTitle={property.title}
        agentName="Property Agent"
      />

      <PropertyShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        propertyTitle={property.title}
        propertyUrl={window.location.href}
      />

      <footer className="bg-slate-900 text-slate-300 py-12 mt-20">
        <div className="container text-center">
          <p>&copy; 2025 Real Estate Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
