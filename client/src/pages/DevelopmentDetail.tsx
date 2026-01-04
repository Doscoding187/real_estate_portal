import { useParams } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { MediaLightbox } from '@/components/MediaLightbox';
import { DevelopmentHeader } from '@/components/DevelopmentHeader';
import { DevelopmentGallery } from '@/components/DevelopmentGallery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  MapPin,
  Home,
  Bed,
  Bath,
  Square,
  Calendar,
  Check,
  Phone,
  Mail,
  Download,
  Maximize,
  ExternalLink,
  Award,
  Globe,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { MetaControl } from '@/components/seo/MetaControl';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';



export default function DevelopmentDetail() {
  const { slug } = useParams();
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fetch real development by slug
  const { data: dev, isLoading } = trpc.developer.getPublicDevelopmentBySlug.useQuery(
      { slug: slug || '' },
      { enabled: !!slug }
  );

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
      );
  }

  if (!dev) {
      return (
          <div className="min-h-screen bg-slate-50">
             <ListingNavbar /> 
             <div className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">
                 <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Development Not Found</h2>
                    <p className="text-gray-600 mt-2">The development you are looking for does not exist or has been removed.</p>
                    <Button className="mt-4" onClick={() => window.history.back()}>Go Back</Button>
                 </div>
             </div>
          </div>
      );
  }

  // Parse helpers
  const parseJSON = (val: any) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
      } catch (e) { return []; }
  };

  const images = parseJSON(dev.images);
  const amenities = parseJSON(dev.amenities);
  const videos = parseJSON(dev.videos).map((v: any) => typeof v === 'string' ? { url: v } : v);
  const floorPlans = parseJSON(dev.floorPlans).map((f: any) => typeof f === 'string' ? { url: f } : f);
  
  const outdoorsPhotos: any[] = []; 
  const amenitiesPhotos: any[] = [];
  
  // --- Unified Media Construction ---
  const generalMedia = images.map((url: string) => ({ url, type: 'image' as const }));
  const videoMedia = videos.map((v: any) => ({ url: v.url, type: 'video' as const }));
  // Placeholder media categories (currently empty)
  const amenityMedia = amenitiesPhotos.map((url: string) => ({ url, type: 'image' as const }));
  const outdoorsMedia = outdoorsPhotos.map((url: string) => ({ url, type: 'image' as const }));
  const floorPlanMedia = floorPlans.map((f: any) => ({ url: f.url, type: 'image' as const }));
  
  // Combine all media for unified lightbox
  const unifiedMedia = [
    ...generalMedia,
    ...amenityMedia,
    ...outdoorsMedia,
    ...videoMedia,
    ...floorPlanMedia
  ];

  // Start indices for jump-to
  const indices = {
    general: 0,
    amenities: generalMedia.length,
    outdoors: generalMedia.length + amenityMedia.length,
    videos: generalMedia.length + amenityMedia.length + outdoorsMedia.length,
    floorPlans: generalMedia.length + amenityMedia.length + outdoorsMedia.length + videoMedia.length
  };

  // Map units and sort by price low-to-high
  const units = (dev.unitTypes || [])
    .map((u: any) => {
      // Try to get image from baseMedia, fallback to development images
      let unitImage = '';
      try {
        const media = parseJSON(u.baseMedia);
        unitImage = media?.gallery?.[0]?.url || '';
      } catch {}
      if (!unitImage) unitImage = images[0] || '';
      
      return {
        id: u.id,
        type: u.name,
        ownershipType: 'Sectional Title', 
        structuralType: 'Apartment',
        bedrooms: u.bedrooms,
        bathrooms: Number(u.bathrooms),
        size: u.unitSize || u.size || 0,
        price: Number(u.basePriceFrom),
        priceTo: u.basePriceTo ? Number(u.basePriceTo) : undefined,
        available: u.totalUnits || u.count || null, // Use actual count if available
        image: unitImage,
        floors: '',
        virtualTour: '',
        yardSize: u.yardSize
      };
    })
    .sort((a, b) => a.price - b.price); // Sort by price ascending

  const development = {
    id: dev.id,
    name: dev.name,
    developer: dev.developerName || 'Unknown Developer',
    location: `${dev.suburb ? dev.suburb + ', ' : ''}${dev.city}`,
    address: dev.address || '',
    description: dev.description || '',
    completionDate: dev.completionDate ? new Date(dev.completionDate).toLocaleDateString() : 'TBA',
    totalUnits: dev.totalUnits || 0,
    availableUnits: dev.availableUnits || 0,
    startingPrice: Number(dev.priceFrom) || 0,
    featuredMedia: videos.length > 0 ? {
      type: 'video',
      url: videos[0].url,
    } : {
      type: 'image',
      url: images[0] || '',
    },
    totalPhotos: images.length,
    images: images,
    amenities: amenities,
    units: units,
    unifiedMedia: unifiedMedia,
    indices: indices,
    videos: videos,
    floorPlans: floorPlans,
  };

  // State for index instead of category


  const openLightbox = (index: number, title: string) => {
    setLightboxIndex(index);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };
   
  // Removed getLightboxMedia - using unifiedMedia directly



  return (
    <>
      <MetaControl />
      <ListingNavbar />
      <div className="min-h-screen bg-slate-50">
        {/* Breadcrumbs */}
        <div className="bg-white border-b border-slate-200">
            <div className="container mx-auto px-4 py-3">
                <Breadcrumbs items={[
                    { label: 'Home', href: '/' },
                    { label: 'New Developments', href: '/new-developments' },
                    { label: dev.name, href: '#' }
                ]} />
            </div>
        </div>
        {/* Property Gallery - Hero + Category Cards */}
        <div className="container max-w-7xl mx-auto px-4 pt-24 pb-6">
          <DevelopmentHeader 
            name={development.name}
            location={development.location}
            isNewLaunch={true} // TODO: Drive from data
            completionDate="Dec, 2027" // TODO: Drive from data
            onContact={() => console.log('Contact Developer')}
            onShare={() => console.log('Share')}
            onFavorite={() => console.log('Favorite')}
          />

          <DevelopmentGallery
            media={development.unifiedMedia}
            totalPhotos={development.totalPhotos}
            featuredMedia={development.featuredMedia}
            indices={development.indices}
            onOpenLightbox={(index, title) => openLightbox(index, title)}
            videos={development.videos}
            floorPlans={development.floorPlans}
            images={development.images}
          />

        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-fluid-h3 font-bold text-slate-900">{development.totalUnits}</p>
                <p className="text-sm text-slate-600">Total Units</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Home className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-fluid-h3 font-bold text-slate-900">{development.availableUnits}</p>
                <p className="text-sm text-slate-600">Available</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-fluid-h3 font-bold text-slate-900">{development.completionDate}</p>
                <p className="text-sm text-slate-600">Completion</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <span className="text-fluid-h3 font-bold text-slate-900">From</span>
                <p className="text-xl font-bold text-blue-600">
                  R {(development.startingPrice / 1000000).toFixed(1)}M
                </p>
                <p className="text-sm text-slate-600">Starting Price</p>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* About Development */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-fluid-h3">About This Development</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 leading-relaxed">{development.description}</p>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">
                      <strong>Developer:</strong> {development.developer}
                    </p>
                    <p className="text-sm text-blue-900 mt-1">
                      <strong>Location:</strong> {development.address}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Available Units */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-fluid-h3">Available Unit Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {development.units.map(unit => (
                      <div
                        key={unit.id}
                        className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <img
                          src={unit.image}
                          alt={unit.type}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                          {/* Ownership & Structural Type Badges */}
                          <div className="flex gap-2 mb-2 flex-wrap">
                            {unit.ownershipType && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                                {unit.ownershipType}
                              </Badge>
                            )}
                            {unit.structuralType && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">
                                {unit.structuralType}
                              </Badge>
                            )}
                            {unit.floors && (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                {unit.floors}
                              </Badge>
                            )}
                          </div>

                          <h3 className="font-bold text-lg mb-2">{unit.type}</h3>
                          <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                            {unit.bedrooms > 0 && (
                              <div className="flex items-center gap-1">
                                <Bed className="h-4 w-4 text-slate-600" />
                                <span>{unit.bedrooms}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Bath className="h-4 w-4 text-slate-600" />
                              <span>{unit.bathrooms}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Square className="h-4 w-4 text-slate-600" />
                              <span>{unit.size}m²</span>
                            </div>
                            {unit.yardSize && (
                              <div className="flex items-center gap-1 col-span-3">
                                <Maximize className="h-4 w-4 text-green-600" />
                                <span className="text-green-700">Garden: {unit.yardSize}m²</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-xs text-slate-600">From</p>
                              <p className="text-xl font-bold text-blue-600">
                                R {(unit.price / 1000000).toFixed(1)}M
                                {unit.priceTo && (
                                  <span className="text-sm text-slate-600">
                                    {' '}
                                    - R{(unit.priceTo / 1000000).toFixed(1)}M
                                  </span>
                                )}
                              </p>
                            </div>
                            {unit.available && unit.available > 0 ? (
                              <Badge className="bg-green-100 text-green-700">Now Selling</Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700">Available</Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                              View Floor Plan
                            </Button>
                            {unit.virtualTour && (
                              <Button
                                variant="outline"
                                className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                                onClick={() => window.open(unit.virtualTour, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Virtual Tour
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Amenities */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-fluid-h3">Development Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {development.amenities.map((amenity: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
                      >
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-sm">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sticky Sidebar - Right Column */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* Contact Form */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <CardTitle className="text-lg">Interested in This Development?</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6">
                      <Download className="mr-2 h-5 w-5" />
                      Download Brochure
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full py-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      <Phone className="mr-2 h-5 w-5" />
                      Schedule a Viewing
                    </Button>
                    <Button variant="outline" className="w-full py-6">
                      <Mail className="mr-2 h-5 w-5" />
                      Contact Sales Team
                    </Button>
                  </CardContent>
                </Card>

                {/* Developer Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Developer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {/* Mock logo */}
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold mb-1">{development.developer}</p>
                        <Badge className="bg-orange-500 text-white text-xs mb-2">
                          <Award className="w-3 h-3 mr-1" />
                          FEATURED DEALER
                        </Badge>
                        <p className="text-sm text-slate-600 mb-2">
                          Award-winning property developer with 20+ years of experience in luxury
                          residential developments.
                        </p>
                      </div>
                    </div>

                    {/* Website */}
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-2 p-2 bg-slate-50 rounded">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <a
                        href="https://www.developer-website.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        www.developer-website.com
                      </a>
                    </div>

                    {/* Past Projects */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        Past Projects (5)
                      </p>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-600">• Waterfall Estate, Midrand (2022)</p>
                        <p className="text-xs text-slate-600">
                          • Hyde Park Residences, Sandton (2021)
                        </p>
                        <p className="text-xs text-slate-600">
                          • Century City Towers, Cape Town (2020)
                        </p>
                      </div>
                    </div>

                    <Button variant="link" className="p-0 h-auto text-blue-600 mt-3">
                      View Developer Profile →
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Lightbox */}
      <MediaLightbox
        media={getLightboxMedia()}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={lightboxTitle}
      />
    </>
  );
}
