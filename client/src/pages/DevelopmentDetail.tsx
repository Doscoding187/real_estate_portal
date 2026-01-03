import { useParams } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { MediaLightbox } from '@/components/MediaLightbox';
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

type MediaCategory = 'all' | 'amenities' | 'outdoors' | 'videos';

export default function DevelopmentDetail() {
  const { slug } = useParams();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxCategory, setLightboxCategory] = useState<MediaCategory>('all');
  const [lightboxTitle, setLightboxTitle] = useState('');

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
      try { return JSON.parse(val); } catch (e) { return []; }
  };

  const images = parseJSON(dev.images);
  const amenities = parseJSON(dev.amenities);
  const outdoorsPhotos: any[] = []; 
  const amenitiesPhotos: any[] = [];
  
  // Create unified media array for lightbox
  const allPhotos = images.map((url: string) => ({ url, type: 'image' as const }));

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
    featuredMedia: {
      type: 'image',
      url: images[0] || '',
    },
    totalPhotos: images.length,
    images: images,
    amenities: amenities,
    units: units,
    allPhotos: allPhotos,
    amenitiesPhotos: amenitiesPhotos.length > 0 ? amenitiesPhotos : allPhotos,
    outdoorsPhotos: outdoorsPhotos.length > 0 ? outdoorsPhotos : allPhotos,
    videos: [],
  };

  const openLightbox = (category: MediaCategory, title: string) => {
    setLightboxCategory(category);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  const getLightboxMedia = () => {
    switch (lightboxCategory) {
      case 'amenities':
        return development.amenitiesPhotos;
      case 'outdoors':
        return development.outdoorsPhotos;
      case 'videos':
        return development.videos;
      case 'all':
      default:
        return development.allPhotos;
    }
  };

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
        <div className="max-w-7xl mx-auto px-4 pt-24 pb-6">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-2 bg-orange-500 hover:bg-orange-600">New Development</Badge>
                <h1 className="text-3xl font-bold text-slate-900">{development.name}</h1>
                <div className="flex items-center gap-2 text-slate-600 mt-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{development.location}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Favorite Button */}
                <button
                  className="p-3 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                  aria-label="Add to favorites"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                </button>

                {/* Share Button */}
                <button
                  className="p-3 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                  aria-label="Share development"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" x2="12" y1="2" y2="15" />
                  </svg>
                </button>

                {/* Contact Developer Button */}
                <Button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 font-semibold">
                  Contact Developer
                </Button>
              </div>
            </div>
          </div>

          {/* Bento Gallery Grid - 60% left, 40% right */}
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-8">
            {/* LEFT: Featured Media (60% - 3 columns) */}
            <div className="lg:col-span-3 relative rounded-xl overflow-hidden shadow-md h-[480px] group bg-slate-900">
              {development.featuredMedia.type === 'video' ? (
                <video
                  src={development.featuredMedia.url}
                  className="w-full h-full object-cover"
                  controls
                  poster="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200"
                />
              ) : (
                <img
                  src={development.featuredMedia.url}
                  alt={development.name}
                  className="w-full h-full object-cover"
                />
              )}

              {/* View all photos/video button - bottom right */}
              <button
                onClick={() =>
                  openLightbox(
                    development.featuredMedia.type === 'video' ? 'videos' : 'all',
                    development.featuredMedia.type === 'video' ? 'Watch Video' : 'All Photos',
                  )
                }
                className="absolute bottom-3 right-3 bg-white/95 hover:bg-white backdrop-blur-sm px-4 py-2.5 rounded-full font-semibold text-sm shadow-lg border border-slate-200/50 transition-all hover:shadow-xl"
              >
                {development.featuredMedia.type === 'video'
                  ? 'Watch video'
                  : `View all ${development.totalPhotos} photos`}
              </button>
            </div>

            {/* RIGHT: Category Cards (40% - 2 columns) */}
            <div className="lg:col-span-2 grid grid-rows-2 gap-3 h-[480px]">
              {/* Top Row: 2 cards side by side (50/50) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Amenities Card */}
                <button
                  onClick={() => openLightbox('amenities', 'Amenities')}
                  className="relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400"
                    alt="Amenities"
                    className="w-full h-full object-cover"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {/* Label */}
                  <span className="absolute right-2 bottom-2 bg-white/96 backdrop-blur-sm px-2.5 py-1.5 rounded-full font-semibold text-xs shadow-md border border-slate-200/50">
                    Amenities
                  </span>
                </button>

                {/* Outdoors Card */}
                <button
                  onClick={() => openLightbox('outdoors', 'Outdoor Spaces')}
                  className="relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=400"
                    alt="Outdoors"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute right-2 bottom-2 bg-white/96 backdrop-blur-sm px-2.5 py-1.5 rounded-full font-semibold text-xs shadow-md border border-slate-200/50">
                    Outdoors
                  </span>
                </button>
              </div>

              {/* Bottom Row: Single large card - Shows opposite media type */}
              <button
                onClick={() =>
                  openLightbox(
                    development.featuredMedia.type === 'video' ? 'all' : 'videos',
                    development.featuredMedia.type === 'video' ? 'All Photos' : 'Videos',
                  )
                }
                className="relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all group"
              >
                <img
                  src="https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=400"
                  alt={development.featuredMedia.type === 'video' ? 'All Photos' : 'Videos'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute right-2 bottom-2 bg-white/96 backdrop-blur-sm px-2.5 py-1.5 rounded-full font-semibold text-xs shadow-md border border-slate-200/50">
                  {development.featuredMedia.type === 'video'
                    ? `Photos (${development.totalPhotos})`
                    : 'Videos'}
                </span>
              </button>
            </div>
          </section>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{development.totalUnits}</p>
                <p className="text-sm text-slate-600">Total Units</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Home className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{development.availableUnits}</p>
                <p className="text-sm text-slate-600">Available</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{development.completionDate}</p>
                <p className="text-sm text-slate-600">Completion</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <span className="text-2xl font-bold text-slate-900">From</span>
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
                  <CardTitle className="text-2xl">About This Development</CardTitle>
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
                  <CardTitle className="text-2xl">Available Unit Types</CardTitle>
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
                  <CardTitle className="text-2xl">Development Amenities</CardTitle>
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
