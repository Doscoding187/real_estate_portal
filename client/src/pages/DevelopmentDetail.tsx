import { useParams } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { MediaLightbox } from '@/components/MediaLightbox';
import { DevelopmentHeader } from '@/components/DevelopmentHeader';
import { DevelopmentGallery } from '@/components/DevelopmentGallery';
import { DevelopmentOverviewCard } from '@/components/DevelopmentOverviewCard';
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
        <div className="container max-w-7xl mx-auto px-4 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Stats - Reduced density */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="shadow-none border border-slate-200/60 bg-slate-50/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                      <Home className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Type</p>
                      <p className="font-semibold text-sm text-slate-900">Residential</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-none border border-slate-200/60 bg-slate-50/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-1.5 bg-green-50 rounded-md text-green-600">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Status</p>
                      <p className="font-semibold text-sm text-slate-900">Selling</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-none border border-slate-200/60 bg-slate-50/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-1.5 bg-purple-50 rounded-md text-purple-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Units</p>
                      <p className="font-semibold text-sm text-slate-900">{development.availableUnits} Available</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-none border border-slate-200/60 bg-slate-50/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-1.5 bg-orange-50 rounded-md text-orange-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Completion</p>
                      <p className="font-semibold text-sm text-slate-900">{development.completionDate}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DevelopmentOverviewCard 
                priceFrom={development.startingPrice}
                completionDate="December 2025"
                progressPercentage={5}
                constructionStatus="Under Construction"
              />

              <Separator className="bg-slate-100" />

              {/* About Section */}
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">About {development.name}</h3>
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-sm">
                  <p>{development.description || "Experience luxury living in this exclusive new development. Providing state-of-the-art amenities and modern architectural design, this is the perfect place to call home."}</p>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* Available Units - Compact Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Available Units ({development.units.length})</h3>
                  <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-medium h-8 text-xs">
                    View All Units <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {development.units.map((unit: any) => (
                    <Card key={unit.id} className="overflow-hidden hover:shadow-md transition-all duration-300 border-slate-200 grouped-card">
                      {/* Reduced Image Height */}
                      <div className="h-40 bg-slate-200 relative group">
                        <img 
                          src={unit.image} 
                          alt={unit.type}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-2 right-2">
                           <Badge className="bg-white/90 text-slate-900 backdrop-blur-sm shadow-sm border-none font-semibold px-2 py-0.5 text-[10px] rounded-sm">
                             {unit.ownershipType}
                           </Badge>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                           <p className="text-white font-bold text-lg leading-none">
                             R {unit.price.toLocaleString()}
                           </p>
                           {unit.priceTo && (
                             <p className="text-white/80 text-xs font-medium">
                               - R {unit.priceTo.toLocaleString()}
                             </p>
                           )}
                        </div>
                      </div>
                      
                      <CardContent className="p-3.5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{unit.type}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{unit.structuralType}</p>
                          </div>
                        </div>

                        {/* Specs Grid - Compact */}
                        <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-slate-100">
                          <div className="flex flex-col items-center justify-center text-center">
                            <Bed className="h-3.5 w-3.5 text-slate-400 mb-1" />
                            <span className="text-xs font-semibold text-slate-700">{unit.bedrooms} Bed</span>
                          </div>
                          <div className="flex flex-col items-center justify-center text-center border-l border-slate-100">
                            <Bath className="h-3.5 w-3.5 text-slate-400 mb-1" />
                            <span className="text-xs font-semibold text-slate-700">{unit.bathrooms} Bath</span>
                          </div>
                          <div className="flex flex-col items-center justify-center text-center border-l border-slate-100">
                            <Maximize className="h-3.5 w-3.5 text-slate-400 mb-1" />
                            <span className="text-xs font-semibold text-slate-700">{unit.size} m²</span>
                          </div>
                        </div>

                        <div className="pt-1">
                           <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs font-medium rounded-md shadow-none">
                             View Floor Plan
                           </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Sidebar - Right Column - Compact */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-3">
                {/* Contact Form */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-4">
                    <CardTitle className="text-sm font-bold text-slate-800">Interested in This Development?</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5">
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white h-10 text-sm font-semibold shadow-sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download Brochure
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-10 border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-medium"
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Schedule a Viewing
                    </Button>
                    <Button variant="ghost" className="w-full h-9 text-slate-600 hover:text-slate-900 text-xs">
                      <Mail className="mr-2 h-3.5 w-3.5" />
                      Contact Sales Team
                    </Button>
                  </CardContent>
                </Card>

                {/* Developer Info - Compact */}
                <Card className="shadow-sm border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {/* Mock logo */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{development.developer}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                           <Award className="w-3 h-3 text-orange-500" />
                           <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">Featured Developer</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">
                       Award-winning property developer with 20+ years of experience in luxury residential developments.
                    </p>

                    {/* Website */}
                    <a
                      href="#"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline mb-3"
                    >
                      <Globe className="w-3 h-3" />
                      <span>Visit Website</span>
                    </a>

                    <Separator className="bg-slate-100 my-3" />

                    {/* Past Projects */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        Past Projects
                      </p>
                    <div className="space-y-1 pl-1 border-l-2 border-slate-100">
                        <p className="text-xs text-slate-600 pl-2">Waterfall Estate, Midrand</p>
                        <p className="text-xs text-slate-600 pl-2">Hyde Park Residences</p>
                        <p className="text-xs text-slate-600 pl-2">Century City Towers</p>
                      </div>
                    </div>

                    <Button variant="link" className="p-0 h-auto text-blue-600 mt-3 text-xs font-medium">
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
        media={development.unifiedMedia}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={lightboxTitle}
      />
    </>
  );
}
