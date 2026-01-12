import { useParams } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { MediaLightbox } from '@/components/MediaLightbox';
import { DevelopmentHeader } from '@/components/DevelopmentHeader';
import { DevelopmentGallery } from '@/components/DevelopmentGallery';
import { DeveloperOverview } from '@/components/development/DeveloperOverview';
import { StatCard } from '@/components/development/StatCard';
import { DevelopmentOverviewCard } from '@/components/DevelopmentOverviewCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
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
  ArrowUpRight,
  Layers,
  Zap,
  Shield,
  Droplets,
  Wifi,
  Car,
  CheckCircle2,
  Trees,
  ChevronRight,
} from 'lucide-react';
import { NearbyLandmarks } from '@/components/property/NearbyLandmarks';
import { SuburbInsights } from '@/components/property/SuburbInsights';
import { LocalityGuide } from '@/components/property/LocalityGuide';
import { Input } from '@/components/ui/input';
import { MetaControl } from '@/components/seo/MetaControl';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';
import { Footer } from '@/components/Footer';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';



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

  // Fetch other developments from same developer
  const { data: allDevelopments } = trpc.developer.listPublicDevelopments.useQuery(
      { limit: 50 },
      { enabled: !!dev?.developer?.id }
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
  
  // Use actual images from development - split them across categories
  // First 60% = general, next 20% = amenities, last 20% = outdoors
  const totalImages = images.length;
  const generalCount = Math.ceil(totalImages * 0.6);
  const amenityCount = Math.floor(totalImages * 0.2);
  
  const outdoorsPhotos: any[] = images.slice(generalCount + amenityCount); 
  const amenitiesPhotos: any[] = images.slice(generalCount, generalCount + amenityCount);
  
  // --- Unified Media Construction ---
  const generalMedia = images.slice(0, generalCount).map((url: string) => ({ url, type: 'image' as const }));
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
        // Try to get floor plan first, then gallery image
        const media = parseJSON(u.baseMedia);
        unitImage = media?.floorPlans?.[0]?.url || media?.gallery?.[0]?.url || '';
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
        floors: u.floorNumber || null,
        erfSize: u.yardSize || u.erfSize || u.plotSize || null,
        virtualTour: '',
        yardSize: u.yardSize
      };
    })
    .sort((a, b) => a.price - b.price); // Sort by price ascending

  const development = {
    id: dev.id,
    name: dev.name,
    developer: dev.developer?.name || 'Unknown Developer',
    developerLogo: dev.developer?.logo || null,
    developerDescription: dev.developer?.description || 'Professional property developer committed to quality and excellence.',
    developerWebsite: dev.developer?.website || null,
    developerSlug: dev.developer?.slug || null,
    location: `${dev.suburb ? dev.suburb + ', ' : ''}${dev.city}`,
    address: dev.address || '',
    description: dev.description || '',
    completionDate: dev.completionDate ? new Date(dev.completionDate).toLocaleDateString() : null,
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
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            
            {/* Main Content Column */}
            <main className="space-y-12">
              {/* Quick Stats - Reduced density */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard 
                  icon={Home} 
                  label="Type" 
                  value="Residential" 
                  color="blue" 
                />
                <StatCard 
                  icon={Check} 
                  label="Status" 
                  value="Selling" 
                  color="green" 
                />
                <StatCard 
                  icon={Building2} 
                  label="Units" 
                  value={`${development.availableUnits} Available`} 
                  color="purple" 
                />
                {development.completionDate && (
                  <StatCard 
                    icon={Calendar} 
                    label="Completion" 
                    value={development.completionDate} 
                    color="orange" 
                  />
                )}
              </div>

              <DevelopmentOverviewCard 
                priceFrom={development.startingPrice}
                completionDate="December 2025"
                progressPercentage={5}
                constructionStatus="Under Construction"
              />

              <Separator className="bg-slate-100" />

              {/* About Section */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="font-bold text-slate-900">About {development.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {development.description || "Experience luxury living in this exclusive new development. Providing state-of-the-art amenities and modern architectural design, this is the perfect place to call home."}
                  </p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-blue-600 font-medium mt-4"
                  >
                    Read Full Description
                  </Button>
                </CardContent>
              </Card>

              <Separator className="bg-slate-100" />

              {/* Available Units - Tabs & Carousel */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Floor Plans & Pricing</h3>
                </div>

                {(() => {
                  // Group units by bedrooms
                  const bedroomCounts = Array.from(new Set(development.units.map((u: any) => u.bedrooms))).sort((a: any, b: any) => a - b);
                  
                  // Initialize state (this needs to be at component level, but for this refactor we'll use a controlled Tabs component)
                  // using default value of the first bedroom count
                  const defaultTab = bedroomCounts[0]?.toString() || "0";

                  return (
                    <Tabs defaultValue={defaultTab} className="w-full">
                       <TabsList className="bg-transparent p-0 flex flex-wrap gap-2 h-auto mb-6 justify-start">
                        {bedroomCounts.map((count: any) => {
                          const unitsInGroup = development.units.filter((u: any) => u.bedrooms === count);
                          // Determine structural type label
                          const types = Array.from(new Set(unitsInGroup.map((u: any) => u.structuralType)));
                          let label = "Apartments";
                          if (types.length === 1 && types[0] === "House") label = "Houses";
                          else if (types.length === 1) label = `${types[0]}s`; // Pluralize single type
                          else if (types.every((t: any) => ["House", "Simplex", "Duplex"].includes(t))) label = "Houses"; 
                          
                          return (
                          <TabsTrigger 
                            key={count} 
                            value={count.toString()}
                            className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:border-slate-900 shadow-sm transition-all"
                          >
                            {count} Bedroom <span className="ml-1 opacity-70 font-normal">{label}</span>
                          </TabsTrigger>
                        )})}
                      </TabsList>

                      {bedroomCounts.map((count: any) => (
                        <TabsContent key={count} value={count.toString()} className="mt-0 focus-visible:outline-none">
                          <Carousel
                            opts={{
                              align: "start",
                              loop: true,
                            }}
                            className="w-full"
                          >
                            <CarouselContent className="-ml-4 pb-4">
                              {development.units
                                .filter((u: any) => u.bedrooms === count)
                                .map((unit: any) => (
                                <CarouselItem key={unit.id} className="pl-4 md:basis-1/2 lg:basis-1/2">
                                  <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-slate-200 grouped-card h-full flex flex-col">
                                    {/* Reduced Image Height */}
                                    <div className="h-48 bg-slate-200 relative group shrink-0">
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
                                    </div>
                                    
                                    <CardContent className="p-4 space-y-4 flex-1 flex flex-col">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h4 className="font-bold text-slate-900 text-lg">R {unit.price.toLocaleString()}</h4>
                                          <p className="text-xs text-slate-500 mt-1">{unit.type}</p>
                                          {unit.priceTo && (
                                            <p className="text-xs text-slate-400 mt-0.5">
                                              - R {unit.priceTo.toLocaleString()}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Specs Grid - Compact */}
                                      <div className="grid grid-cols-4 gap-2 py-2 border-t border-b border-slate-100 mt-auto">
                                        <div className="flex flex-col items-center justify-center text-center">
                                          <Bed className="h-3.5 w-3.5 text-slate-400 mb-1" />
                                          <span className="text-xs font-semibold text-slate-700">{unit.bedrooms} Bed</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center text-center border-l border-slate-100">
                                          <Bath className="h-3.5 w-3.5 text-slate-400 mb-1" />
                                          <span className="text-xs font-semibold text-slate-700">{unit.bathrooms} Bath</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center text-center border-l border-slate-100">
                                          <HouseMeasureIcon className="h-3.5 w-3.5 text-slate-400 mb-1" />
                                          <span className="text-xs font-semibold text-slate-700">{unit.size} m²</span>
                                        </div>
                                        {/* Dynamic 4th Spec */}
                                        {["House", "Simplex", "Duplex", "Cluster Common", "Townhouse"].includes(unit.structuralType) ? (
                                           unit.erfSize ? (
                                            <div className="flex flex-col items-center justify-center text-center border-l border-slate-100">
                                              <Maximize className="h-3.5 w-3.5 text-slate-400 mb-1" />
                                              <span className="text-xs font-semibold text-slate-700">{unit.erfSize} m²</span>
                                            </div>
                                           ) : null
                                        ) : (
                                          unit.floors ? (
                                            <div className="flex flex-col items-center justify-center text-center border-l border-slate-100">
                                              <Layers className="h-3.5 w-3.5 text-slate-400 mb-1" />
                                              <span className="text-xs font-semibold text-slate-700">{unit.floors} flr</span>
                                            </div>
                                          ) : null
                                        )}
                                      </div>

                                      <div className="pt-1">
                                         <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 h-9 text-xs font-bold rounded-md shadow-none uppercase tracking-wide">
                                           Request callback
                                         </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <div className="hidden md:block">
                               <CarouselPrevious className="-left-4 bg-white shadow-md border-slate-200" />
                               <CarouselNext className="-right-4 bg-white shadow-md border-slate-200" />
                            </div>
                          </Carousel>
                        </TabsContent>
                      ))}
                    </Tabs>
                  );
                })()}
              </div>

              <Separator className="bg-slate-100" />

              {/* Development Specifications - From estateSpecs or derived from amenities */}
              {(() => {
                // Check for explicit estateSpecs first
                const estateSpecs = (dev as any).estateSpecs || {};
                const hasEstateSpecs = estateSpecs.ownershipType || estateSpecs.powerBackup || estateSpecs.waterSupply;
                
                // Helper to format value labels
                const formatLabel = (value: string) => {
                  if (!value) return '';
                  return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                };
                
                // Build specs array from estateSpecs
                const specs: Array<{icon: any, label: string, value: string}> = [];
                
                if (hasEstateSpecs) {
                  // Use explicit estateSpecs
                  if (estateSpecs.ownershipType) {
                    specs.push({ icon: Home, label: 'Ownership Type', value: formatLabel(estateSpecs.ownershipType) });
                  }
                  if (estateSpecs.powerBackup && estateSpecs.powerBackup !== 'none') {
                    specs.push({ icon: Zap, label: 'Power Backup', value: formatLabel(estateSpecs.powerBackup) });
                  }
                  if (estateSpecs.securityFeatures?.length > 0) {
                    const secCount = estateSpecs.securityFeatures.length;
                    specs.push({ 
                      icon: Shield, 
                      label: 'Security', 
                      value: secCount > 2 ? `${secCount} Features` : estateSpecs.securityFeatures.map(formatLabel).join(', ')
                    });
                  }
                  if (estateSpecs.waterSupply) {
                    specs.push({ icon: Droplets, label: 'Water Supply', value: formatLabel(estateSpecs.waterSupply) });
                  }
                  if (estateSpecs.internetAccess && estateSpecs.internetAccess !== 'none') {
                    specs.push({ icon: Wifi, label: 'Internet', value: formatLabel(estateSpecs.internetAccess) });
                  }
                  if (estateSpecs.flooring) {
                    specs.push({ icon: Layers, label: 'Flooring', value: formatLabel(estateSpecs.flooring) });
                  }
                  if (estateSpecs.parkingType && estateSpecs.parkingType !== 'none') {
                    specs.push({ icon: Car, label: 'Parking', value: formatLabel(estateSpecs.parkingType) });
                  }
                  if (estateSpecs.petFriendly) {
                    specs.push({ icon: CheckCircle2, label: 'Pet Friendly', value: formatLabel(estateSpecs.petFriendly) });
                  }
                  if (estateSpecs.electricitySupply) {
                    specs.push({ icon: Zap, label: 'Electricity', value: formatLabel(estateSpecs.electricitySupply) });
                  }
                } else {
                  // Fallback: Parse amenities to extract specifications
                  const allAmenities = development.amenities || [];
                  const allFeatures = Array.isArray(dev.features) ? dev.features : [];
                  const allHighlights = Array.isArray(dev.highlights) ? dev.highlights : [];
                  const combined = [...allAmenities, ...allFeatures, ...allHighlights].map(s => String(s).toLowerCase());
                  
                  const hasAny = (keywords: string[]) => keywords.some(k => combined.some(a => a.includes(k.toLowerCase())));
                  
                  // Security
                  const securityItems = combined.filter(a => 
                    ['security', 'cctv', 'access control', 'biometric', 'guard', 'surveillance'].some(k => a.includes(k))
                  );
                  if (securityItems.length > 0) {
                    specs.push({ 
                      icon: Shield, 
                      label: 'Security', 
                      value: securityItems.length > 2 ? `${securityItems.length} Features` : securityItems.slice(0, 2).join(', ')
                    });
                  }
                  
                  if (hasAny(['solar', 'generator', 'backup power', 'inverter'])) {
                    specs.push({ icon: Zap, label: 'Power Backup', value: 'Available' });
                  }
                  if (hasAny(['fiber', 'fibre', 'internet', 'wifi', 'smart home'])) {
                    specs.push({ icon: Wifi, label: 'Internet', value: 'Fibre Ready' });
                  }
                  const parkingItems = combined.filter(a => ['parking', 'garage', 'carport'].some(k => a.includes(k)));
                  if (parkingItems.length > 0) {
                    specs.push({ icon: Car, label: 'Parking', value: 'Available' });
                  }
                  if (hasAny(['pet friendly', 'pets allowed', 'pet-friendly'])) {
                    specs.push({ icon: CheckCircle2, label: 'Pet Friendly', value: 'Yes' });
                  }
                  if (hasAny(['pool', 'swimming'])) {
                    specs.push({ icon: Droplets, label: 'Swimming Pool', value: 'Available' });
                  }
                }
                
                // If no specs found, don't render the card
                if (specs.length === 0) return null;
                
                return (
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                      <CardTitle className="font-bold text-slate-900">Development Specifications</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {specs.map((spec, index) => {
                          const IconComponent = spec.icon;
                          return (
                            <div key={index} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                              <IconComponent className="h-5 w-5 text-orange-500 mt-0.5" />
                              <div>
                                <p className="text-sm text-slate-500">{spec.label}</p>
                                <p className="font-semibold text-slate-900 capitalize">{spec.value}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              <Separator className="bg-slate-100" />

              {/* Development Features & Specifications */}
              {(development.amenities.length > 0) && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold text-slate-900">Development Features & Amenities</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {development.amenities.map((amenity: string, index: number) => {
                        // Map amenities to icons
                        const iconMap: Record<string, any> = {
                          'pool': Droplets,
                          'swimming pool': Droplets,
                          'security': Shield,
                          '24hr security': Shield,
                          'cctv': Shield,
                          'wifi': Wifi,
                          'fibre': Wifi,
                          'internet': Wifi,
                          'parking': Car,
                          'garage': Car,
                          'garden': Trees,
                          'playground': Trees,
                          'gym': CheckCircle2,
                          'clubhouse': Building2,
                          'generator': Zap,
                          'solar': Zap,
                          'borehole': Droplets,
                        };
                        const IconComponent = iconMap[amenity.toLowerCase()] || CheckCircle2;
                        return (
                          <div key={index} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                            <IconComponent className="h-5 w-5 text-orange-500 mt-0.5" />
                            <div>
                              <p className="font-semibold text-slate-900 capitalize text-sm">{amenity.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator className="bg-slate-100" />

              {/* Developer Overview Section */}
              {/* Developer Overview Section */}
              <DeveloperOverview 
                developerName={development.developer}
                developerLogo={development.developerLogo}
              />

              {/* Nearby Landmarks */}
              <NearbyLandmarks 
                property={{
                  id: dev.id,
                  title: dev.name,
                  latitude: dev.latitude || '0',
                  longitude: dev.longitude || '0',
                }} 
              />

              {/* Suburb Insights */}
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <SuburbInsights 
                    suburbId={dev.suburbId || 0}
                    suburbName={dev.suburb || dev.city} 
                    isDevelopment={true}
                  />
                </CardContent>
              </Card>

              {/* Locality Guide */}
              <LocalityGuide 
                suburb={dev.suburb || dev.city} 
                city={dev.city}
              />
            </main>

            {/* Sidebar - Right Column */}
            <aside className="lg:sticky lg:top-24 lg:self-start space-y-3">
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
                      {/* Developer logo */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                        {development.developerLogo ? (
                          <img src={development.developerLogo} alt={development.developer} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{development.developer}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                           <Award className="w-3 h-3 text-orange-500" />
                           <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">Verified Developer</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">
                       {development.developerDescription}
                    </p>

                    {/* Website */}
                    {development.developerWebsite && (
                      <a
                        href={development.developerWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline mb-3"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Visit Website</span>
                      </a>
                    )}

                    <Separator className="bg-slate-100 my-3" />

                    {/* Other Projects */}
                    {(() => {
                      // Filter to show other projects from same developer
                      const otherProjects = (allDevelopments || [])
                        .filter((d: any) => d.developerId === dev.developer?.id && d.id !== dev.id)
                        .slice(0, 3);
                      
                      if (otherProjects.length === 0) return null;
                      
                      return (
                        <div>
                          <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            Other Projects
                          </p>
                          <div className="space-y-1 pl-1 border-l-2 border-slate-100">
                            {otherProjects.map((project: any) => (
                              <a 
                                key={project.id}
                                href={`/development/${project.slug}`}
                                className="text-xs text-slate-600 pl-2 hover:text-blue-600 transition-colors block"
                              >
                                {project.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <Button variant="link" className="p-0 h-auto text-blue-600 mt-3 text-xs font-medium">
                      View Developer Profile →
                    </Button>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
      </div>

      {/* Footer */}
      <Footer />

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
