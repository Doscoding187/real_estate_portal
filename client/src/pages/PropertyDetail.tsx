import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Navbar } from '@/components/Navbar';
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
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data?.property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <h2 className="text-2xl font-semibold mb-4">Property Not Found</h2>
          <Button onClick={() => setLocation('/properties')}>Back to Properties</Button>
        </div>
      </div>
    );
  }

  const { property, images } = data;
  const amenitiesList = property.amenities ? JSON.parse(property.amenities) : [];
  const description = property.description || '';
  const shouldTruncate = description.length > 300;
  const displayDescription = showFullDescription || !shouldTruncate 
    ? description 
    : description.slice(0, 300) + '...';

  const similarProperties = similarPropertiesData?.properties?.filter(
    p => p.id !== propertyId
  ).slice(0, 4) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero / Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
            <button onClick={() => setLocation('/')} className="hover:text-blue-600 transition-colors">
              <Home className="h-4 w-4" />
            </button>
            <ChevronRight className="h-4 w-4" />
            <button onClick={() => setLocation('/properties')} className="hover:text-blue-600 transition-colors">
              Properties
            </button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-800 font-medium truncate max-w-[200px]">
              {property.title}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100 px-3 py-1">
                  {property.propertyType}
                </Badge>
                <Badge variant="outline" className="border-slate-200 text-slate-600">
                  For {property.listingType}
                </Badge>
                {property.featured === 1 && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">Featured</Badge>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">{property.title}</h1>
              
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span className="text-lg">
                  {property.address}, {property.city}, {property.province}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-4">
              <div className="text-4xl font-bold text-blue-900">
                {formatCurrency(property.price, { compact: false })}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={handleShare} className="border-slate-200 text-slate-600 hover:bg-slate-50">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm" onClick={handleFavoriteClick} className="border-slate-200 text-slate-600 hover:bg-slate-50">
                  <Heart className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
              <PropertyImageGallery images={images} propertyTitle={property.title} />
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {property.bedrooms && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:border-blue-200 transition-colors">
                  <div className="bg-blue-50 p-3 rounded-full mb-2">
                    <Bed className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-xl font-bold text-slate-900">{property.bedrooms}</span>
                  <span className="text-sm text-slate-500">Bedrooms</span>
                </div>
              )}
              {property.bathrooms && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:border-blue-200 transition-colors">
                  <div className="bg-blue-50 p-3 rounded-full mb-2">
                    <Bath className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-xl font-bold text-slate-900">{property.bathrooms}</span>
                  <span className="text-sm text-slate-500">Bathrooms</span>
                </div>
              )}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:border-blue-200 transition-colors">
                <div className="bg-blue-50 p-3 rounded-full mb-2">
                  <Maximize className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-xl font-bold text-slate-900">{property.area.toLocaleString()}</span>
                <span className="text-sm text-slate-500">m²</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:border-blue-200 transition-colors">
                <div className="bg-blue-50 p-3 rounded-full mb-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-xl font-bold text-slate-900 capitalize">{property.propertyType}</span>
                <span className="text-sm text-slate-500">Type</span>
              </div>
            </div>

            {/* Description */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl text-slate-800">About this property</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {displayDescription}
                </p>
                {shouldTruncate && (
                  <Button
                    variant="link"
                    className="mt-4 p-0 h-auto text-blue-600 font-medium"
                    onClick={() => setShowFullDescription(!showFullDescription)}
                  >
                    {showFullDescription ? 'Show Less' : 'Read Full Description'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl text-slate-800">Property Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-500">Property Type</span>
                    <span className="font-medium text-slate-900 capitalize">{property.propertyType}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-500">Status</span>
                    <span className="font-medium text-slate-900 capitalize">{property.status}</span>
                  </div>
                  {property.yearBuilt && (
                    <div className="flex justify-between py-3 border-b border-slate-100">
                      <span className="text-slate-500">Year Built</span>
                      <span className="font-medium text-slate-900">{property.yearBuilt}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-500">Listing Type</span>
                    <span className="font-medium text-slate-900 capitalize">{property.listingType}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-500">Views</span>
                    <span className="font-medium text-slate-900">{property.views} views</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-500">Listed On</span>
                    <span className="font-medium text-slate-900">
                      {new Date(property.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            {amenitiesList.length > 0 && (
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-xl text-slate-800">Amenities & Features</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {amenitiesList.map((amenity: string, index: number) => {
                      const IconComponent = amenityIcons[amenity.toLowerCase()] || CheckCircle2;
                      return (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="bg-white p-1.5 rounded-md shadow-sm">
                            <IconComponent className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="capitalize text-slate-700 font-medium text-sm">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location & Map */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl text-slate-800">Location</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {property.latitude && property.longitude && (
                  <div className="relative">
                    <GooglePropertyMap
                      center={{ lat: property.latitude, lng: property.longitude }}
                      zoom={15}
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
                      className="h-[400px] w-full"
                    />
                    <div className="p-4 bg-white border-t border-slate-200">
                      <h4 className="font-medium text-slate-900 mb-2">Explore the Area</h4>
                      <GoogleAmenitiesMap
                        center={{ lat: property.latitude, lng: property.longitude }}
                        radius={2000}
                        showControls={true}
                        enabledTypes={['school', 'hospital', 'shopping_mall', 'restaurant']}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Similar Properties */}
            {similarProperties.length > 0 && (
              <div className="pt-8 border-t border-slate-200">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Similar Properties</h3>
                <div className="flex flex-col gap-6">
                  {similarProperties.map((prop) => (
                    <div
                      key={prop.id}
                      onClick={() => setLocation(`/property/${prop.id}`)}
                      className="cursor-pointer hover:scale-[1.01] transition-transform duration-300"
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agent Contact Card - Sticky */}
            <div className="sticky top-24 space-y-6">
              <Card className="border-blue-100 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                  <h3 className="font-bold text-lg">Interested in this property?</h3>
                  <p className="text-blue-100 text-sm">Contact the agent today</p>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-slate-900">Property Agent</p>
                      <p className="text-sm text-slate-500">Real Estate Portal</p>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div key={star} className="w-3 h-3 bg-amber-400 rounded-full" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all hover:shadow-lg"
                      size="lg"
                      onClick={() => setIsContactModalOpen(true)}
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Send Message
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-slate-200 hover:bg-slate-50 hover:text-blue-600"
                      size="lg"
                      onClick={() => setIsContactModalOpen(true)}
                    >
                      <Calendar className="h-5 w-5 mr-2" />
                      Schedule Viewing
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-slate-200 hover:bg-slate-50 hover:text-blue-600"
                      size="lg"
                      asChild
                    >
                      <a href="tel:+27123456789">
                        <Phone className="h-5 w-5 mr-2" />
                        Call Agent
                      </a>
                    </Button>
                  </div>

                  <div className="text-center pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400">Typically replies within 2 hours</p>
                  </div>
                </CardContent>
              </Card>

              {/* Mortgage Calculator */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    Monthly Repayment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <BondCalculator defaultPrice={property.price} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
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
