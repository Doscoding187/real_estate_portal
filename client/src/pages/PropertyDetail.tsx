import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useGuestActivity } from '@/contexts/GuestActivityContext';
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
  Square,
  Calculator,
} from 'lucide-react';
import { MOCK_LISTINGS } from '@/lib/mockListings';
import { Loader2 } from 'lucide-react';
import { PropertyImageGallery } from '@/components/property/PropertyImageGallery';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';
import { generateBreadcrumbs } from '@/lib/urlUtils';
import { PropertyContactModal } from '@/components/property/PropertyContactModal';
import { PropertyShareModal } from '@/components/property/PropertyShareModal';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { GoogleAmenitiesMap } from '@/components/maps/GoogleAmenitiesMap';
import { BondCalculator } from '@/components/BondCalculator';
import PropertyCard from '@/components/PropertyCard';
import { SidebarContactForm } from '@/components/property/SidebarContactForm';
import { ResponsiveHighlights } from '@/components/ResponsiveHighlights';
import { NearbyLandmarks } from '@/components/property/NearbyLandmarks';
import { SuburbInsights } from '@/components/property/SuburbInsights';
import { LocalityGuide } from '@/components/property/LocalityGuide';
import { PropertyMobileFooter } from '@/components/property/PropertyMobileFooter';
import { DeveloperBrandSection, DeveloperBrandData } from '@/components/property/DeveloperBrandSection';

const amenityIcons: Record<string, any> = {
  parking: Car,
  wifi: Wifi,
  gym: Dumbbell,
  garden: Trees,
  security: Shield,
  pool: Droplets,
  electricity: Zap,
};

export default function PropertyDetail(props: { propertyId?: number } & any) {
  const { propertyId: propPropertyId } = props;
  const [, params] = useRoute('/property/:id');
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { addViewedProperty, addGuestFavorite, removeGuestFavorite, isGuestFavorite } = useGuestActivity();
  
  // Use prop if provided, otherwise try to get from route
  const rawId = propPropertyId?.toString() || params?.id || '0';
  const numericId = parseInt(rawId);
  const propertyId = isNaN(numericId) ? 0 : numericId; // For TRPC

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
      limit: 10,
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

  // Track view for guest users - MUST be before conditional returns
  React.useEffect(() => {
    if (propertyId > 0) {
      addViewedProperty(propertyId);
    }
  }, [propertyId, addViewedProperty]);

  const handleFavoriteClick = () => {
    if (!isAuthenticated) {
      // For guest users, use localStorage
      if (isGuestFavorite(propertyId)) {
        removeGuestFavorite(propertyId);
        toast.success('Removed from guest favorites');
      } else {
        addGuestFavorite(propertyId);
        toast.success('Added to guest favorites! Login to save permanently.');
      }
      return;
    }
    addFavoriteMutation.mutate({ propertyId });
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  // Mock Data Integration
  const mockListing = MOCK_LISTINGS.find(m => m.id === rawId);
  
  // Normalize Mock Data Structure if found
  const mockData = mockListing ? {
    property: {
      id: rawId, // Keep as string for mock
      title: mockListing.title,
      description: mockListing.description,
      price: mockListing.price,
      address: `${mockListing.location.suburb}, ${mockListing.location.city}`,
      city: mockListing.location.city,
      suburb: mockListing.location.suburb,
      province: mockListing.location.province,
      propertyType: mockListing.propertyType,
      listingType: mockListing.listingType,
      bedrooms: mockListing.propertyDetails.bedrooms || 0,
      bathrooms: mockListing.propertyDetails.bathrooms || 0,
      area: mockListing.propertyDetails.houseAreaM2 || mockListing.propertyDetails.unitSizeM2 || mockListing.propertyDetails.floorAreaM2 || 0,
      features: JSON.stringify(mockListing.features),
      amenities: JSON.stringify(mockListing.features), // Fallback
      latitude: (mockListing.location as any).latitude || '-26.2041',
      longitude: (mockListing.location as any).longitude || '28.0473',
      images: mockListing.images,
      mainImage: mockListing.images[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    images: mockListing.images.map((url, i) => ({
      id: i,
      propertyId: 0, // Mock doesn't really matter
      imageUrl: url,
      isMain: i === 0,
      createdAt: new Date().toISOString()
    })),
    agent: {
      id: 1,
      name: mockListing.agent.name,
      image: mockListing.agent.image,
      email: 'agent@example.com',
      phone: '0123456789',
      totalListings: 12,
      experience: 5
    }
  } : null;

  const usedData = mockData || data;

  if (isLoading && !usedData) {
    return (
      <div className="min-h-screen bg-background">
        <ListingNavbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!usedData?.property) {
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

  const { property, images, agent } = usedData;
  
  // Safely parse amenities with error handling
  let amenitiesList:string[] = [];
  try {
    if (property.amenities) {
      amenitiesList = typeof property.amenities === 'string' 
        ? JSON.parse(property.amenities) 
        : property.amenities;
    }
  } catch (error) {
    console.error('Error parsing amenities:', error);
    amenitiesList = [];
  }
  
  // Use highlights if available (from features/amenities)
  let highlights: string[] = [];
  try {
    if (property.features) {
      highlights = typeof property.features === 'string' 
        ? JSON.parse(property.features) 
        : property.features;
    } else {
      highlights = amenitiesList;
    }
  } catch (error) {
    console.error('Error parsing features:', error);
    highlights = amenitiesList;
  }
  
  const description = property.description || '';
  const shouldTruncate = description.length > 300;
  const displayDescription = showFullDescription || !shouldTruncate 
    ? description 
    : description.slice(0, 300) + '...';

  // Parse Property Specs
  interface PropertySpecs {
    ownershipType?: string;
    powerBackup?: string;
    securityFeatures?: string[];
    waterSupply?: string;
    internetAccess?: string;
    flooring?: string;
    parkingType?: string;
    petFriendly?: string;
    electricitySupply?: string;
    additionalRooms?: string[];
  }
  
  let specs: PropertySpecs = {};
  try {
    if ((property as any).propertySettings) {
      specs = typeof (property as any).propertySettings === 'string'
        ? JSON.parse((property as any).propertySettings)
        : (property as any).propertySettings;
    }
  } catch (e) {
    console.error('Failed to parse property settings', e);
  }

  const similarProperties = similarPropertiesData?.properties?.filter(
    p => p.id !== propertyId
  ) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />

      {/* Hero / Header Section */}
      <div className="bg-white border-b border-slate-200 pt-16">
        <div className="container py-6">
          {/* Breadcrumbs */}
          <div className="mb-4">
            <Breadcrumbs items={generateBreadcrumbs({
              listingType: property.listingType as any,
              province: property.province,
              city: property.city,
              suburb: property.suburb
            })} />
          </div>

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
             {specs.additionalRooms && specs.additionalRooms.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-slate-400 mb-3">Additional rooms & Specifications</h3>
                <div className="flex flex-wrap gap-2">
                  {specs.additionalRooms.map((room) => (
                    <Badge key={room} variant="secondary" className="bg-orange-50 text-slate-900 hover:bg-orange-100 border-0 px-4 py-1.5 rounded-full font-medium">
                      {room}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
              <CardContent className="p-4">
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

            {/* 2.2 Property Features / Specs Table (Dynamic) */}
            {(specs.ownershipType || specs.powerBackup || (specs.securityFeatures && specs.securityFeatures.length > 0) || specs.waterSupply || specs.internetAccess || specs.flooring || specs.parkingType || specs.petFriendly || specs.electricitySupply) && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-xl font-bold text-slate-900">Property Features & Specifications</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {specs.ownershipType && (
                      <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                        <Home className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-500">Ownership Type</p>
                          <p className="font-semibold text-slate-900 capitalize">{specs.ownershipType.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    )}
                    {specs.powerBackup && (
                      <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                        <Zap className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-500">Power Backup</p>
                          <p className="font-semibold text-slate-900 capitalize">{specs.powerBackup.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    )}
                    {specs.securityFeatures && specs.securityFeatures.length > 0 && (
                      <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                        <Shield className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-500">Security</p>
                          <p className="font-semibold text-slate-900 capitalize text-ellipsis overflow-hidden whitespace-nowrap" title={specs.securityFeatures.join(', ').replace(/_/g, ' ')}>
                             {specs.securityFeatures.length > 1 ? `${specs.securityFeatures.length} Features` : specs.securityFeatures[0].replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    )}
                    {specs.waterSupply && (
                      <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                        <Droplets className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-500">Water Supply</p>
                          <p className="font-semibold text-slate-900 capitalize">{specs.waterSupply.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    )}
                    {specs.internetAccess && (
                      <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                        <Wifi className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-500">Internet</p>
                          <p className="font-semibold text-slate-900 capitalize">{specs.internetAccess.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    )}
                    {specs.flooring && (
                      <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                        <Building2 className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-500">Flooring</p>
                          <p className="font-semibold text-slate-900 capitalize">{specs.flooring.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    )}
                    {specs.parkingType && (
                      <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                        <Car className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-500">Parking Type</p>
                          <p className="font-semibold text-slate-900 capitalize">{specs.parkingType.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    )}
                    {specs.petFriendly && (
                      <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-500">Pet Friendly</p>
                          <p className="font-semibold text-slate-900 capitalize">{specs.petFriendly.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    )}
                    {specs.electricitySupply && (
                      <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                        <Zap className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-500">Electricity</p>
                          <p className="font-semibold text-slate-900 capitalize">{specs.electricitySupply.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 2.3 Agent Overview */}
            {/* 2.3 Agent Overview */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900">Agent Overview</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Agent Profile Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  {/* Header Area */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200 shrink-0">
                      {agent?.image ? (
                        <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-bold text-xl">
                          {agent?.name?.charAt(0) || 'A'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{agent?.name || 'Property Agent'}</h4>
                      <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none rounded-full px-3 py-0.5 text-xs font-medium mt-1">
                        PRO AGENT
                      </Badge>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="text-3xl font-bold text-orange-500">
                          {agent?.experience || 9}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">years of Experience</p>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="text-3xl font-bold text-orange-500">
                          {agent?.totalListings || 54}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Total Listings</p>
                    </div>
                  </div>

                  {/* Current Listings Button */}
                  <Button variant="outline" className="w-full justify-between h-12 rounded-lg border-slate-200 hover:bg-slate-50 hover:text-slate-900 group">
                    <span className="font-medium text-slate-700">Current Listings</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full group-hover:bg-white">
                        {agent?.totalListings || 53}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Button>
                </div>

                {/* Right Column: Contact Form */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col h-full">
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1">
                      <Input 
                        placeholder="Name" 
                        className="bg-slate-50 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 h-11" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Input 
                        type="email" 
                        placeholder="Email ID" 
                        className="bg-slate-50 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 h-11" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Input 
                        type="tel" 
                        placeholder="Phone Number" 
                        className="bg-slate-50 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 h-11" 
                      />
                    </div>
                  </div>
                  
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 rounded-lg mt-6 shadow-sm">
                    Whatsapp Agent
                  </Button>
                </div>
              </div>
            </div>

            {/* 2.4 Developer Brand Section (when property is linked to a brand profile) */}
            {(usedData.developerBrand || (property as any).developerBrandProfile) && (
              <DeveloperBrandSection 
                brand={(usedData.developerBrand || (property as any).developerBrandProfile) as DeveloperBrandData} 
              />
            )}

            {/* 2.5 Nearby Landmarks */}
            <NearbyLandmarks property={property} />

            {/* 2.5 Suburb Reviews & Insights */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <SuburbInsights 
                  suburbName={property.suburb || property.city} 
                  isDevelopment={!!property.developmentId}
                />
              </CardContent>
            </Card>

            {/* 2.6 Locality Guide */}
            <LocalityGuide 
              suburb={property.suburb || property.city} 
              city={property.city}
            />
          </div>

          {/* RIGHT COLUMN (4 columns) */}
          <div className="col-span-12 lg:col-span-4">
            {/* Buyability Calculator - Sticky */}
            <div className="sticky top-24 space-y-4">
              <BondCalculator propertyPrice={property.price} showTransferCosts={true} />
              
              {/* Disclaimer */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <strong>Disclaimer:</strong> These calculations are estimates only. Actual bond approval, interest rates, and transfer costs may vary based on individual circumstances and bank policies. Consult with a bond originator or financial advisor for accurate figures.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3 - FULL WIDTH FOOTER - Similar Properties Carousel */}
        {similarProperties.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-900">
                Property Listings in {property.suburb || property.city}
                </h3>
                <div className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">
                    View All
                </div>
            </div>
            
            {/* Horizontal Scroll Carousel */}
            <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex overflow-x-auto gap-4 pb-8 snap-x snap-mandatory scrollbar-hide">
                {similarProperties.map((prop) => (
                    <div
                    key={prop.id}
                    onClick={() => setLocation(`/property/${prop.id}`)}
                    className="group cursor-pointer bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden min-w-[280px] md:min-w-[300px] snap-start"
                    >
                    {/* Image */}
                    <div className="relative h-44 overflow-hidden bg-slate-100">
                        <img
                        src={prop.mainImage || '/placeholder-property.jpg'}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                         <div className="absolute top-2 left-2">
                             <Badge className="bg-white/90 text-slate-700 hover:bg-white backdrop-blur-sm shadow-sm border-0 text-xs py-0 h-5">
                                 {prop.propertyType}
                             </Badge>
                         </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 space-y-2">
                        {/* Price */}
                         <p className="text-lg font-bold text-[#005ca8]">
                            R {prop.price.toLocaleString()}
                        </p>

                        {/* Title */}
                        <h4 className="font-semibold text-slate-800 line-clamp-1 text-sm">
                        {prop.title}
                        </h4>

                        {/* Property Details */}
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                           {prop.bedrooms && (
                            <div className="flex items-center gap-1">
                                <Bed className="h-3.5 w-3.5" />
                                <span>{prop.bedrooms}</span>
                            </div>
                           )}
                           {prop.bathrooms && (
                            <div className="flex items-center gap-1">
                                <Bath className="h-3.5 w-3.5" />
                                <span>{prop.bathrooms}</span>
                            </div>
                           )}
                           {prop.area && (
                            <div className="flex items-center gap-1">
                                <Square className="h-3.5 w-3.5" />
                                <span>{prop.area} m²</span>
                            </div>
                           )}
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Mobile Footer */}
      <PropertyMobileFooter 
        agentName={agent?.name || "Agent"} 
        onCall={() => window.open(`tel:${agent?.phone || ''}`)}
        onEmail={() => setIsContactModalOpen(true)}
        onWhatsApp={() => window.open(`https://wa.me/${agent?.phone?.replace(/\s+/g, '') || ''}`, '_blank')}
      />

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
