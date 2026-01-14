import { useParams } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { MediaLightbox } from '@/components/MediaLightbox';
import { DevelopmentHeader } from '@/components/DevelopmentHeader';
import { DevelopmentGallery } from '@/components/DevelopmentGallery';
import { DeveloperOverview } from '@/components/development/DeveloperOverview';
import { StatCard } from '@/components/development/StatCard';
import { SectionNav } from '@/components/development/SectionNav';
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
  LayoutGrid,
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
import {
  getDevelopmentHeroMedia, buildDevelopmentGalleryImages, getGalleryStartIndex,
  getDevelopmentAmenityTileImage, getDevelopmentOutdoorsTileImage, getDevelopmentViewGalleryTileImage,
  type DevelopmentMedia
} from '@/lib/media-logic';

export default function DevelopmentDetail() {
  const { slug } = useParams();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

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

  // 1. RAW DATA EXTRACTION
  const rawImages = parseJSON(dev.images);
  const rawVideos = parseJSON(dev.videos);
  
  // 2. NORMALIZE TO CANONICAL TYPES
  // Convert DB format to our typed ImageMedia/VideoMedia
  const normalizeImage = (img: any): any => { // Using any temporarily to bridge types, verified below
      if (typeof img === 'string') return { url: img, category: 'featured' };
      return { 
          url: img.url, 
          category: img.category || 'general',
          isPrimary: img.isPrimary 
      };
  };

  const normalizeVideo = (v: any) => typeof v === 'string' ? { url: v } : v;

  const normalizedImages = rawImages.map(normalizeImage);
  const normalizedVideos = rawVideos.map(normalizeVideo);
  
  // Create the Data Object
  const mediaData: DevelopmentMedia = {
      featuredImage: normalizedImages.find((img: any) => img.isPrimary) || normalizedImages[0],
      images: normalizedImages,
      videos: normalizedVideos
  };

  // 3. APPLY CANONICAL LOGIC (Pure Decisions)
  // 3. APPLY CANONICAL LOGIC (Pure Decisions)
  const heroMedia = getDevelopmentHeroMedia(mediaData);
  const galleryImages = buildDevelopmentGalleryImages(mediaData);
  
  // Bento Tiles
  const amenityTile = getDevelopmentAmenityTileImage(mediaData);
  const outdoorTile = getDevelopmentOutdoorsTileImage(mediaData);
  const viewGalleryTile = getDevelopmentViewGalleryTileImage(mediaData);

  // Jump Indices (Calculated once from the single truth gallery)
  const galleryIndices = {
      general: 0, // Always starts at 0
      amenities: getGalleryStartIndex(galleryImages, 'amenities'),
      outdoors: getGalleryStartIndex(galleryImages, 'outdoors'),
      videos: 0, // Videos open separately in this UI pattern usually, or handled via specific index if mixed (but we don't mix)
      floorPlans: 0 // Placeholder, we treat floorplans separate typically
  };

  // Missing declaration restoration
  const floorPlans: any[] = []; // Initialize as empty array for now, or derive from units if available later

  // ... (Update development object)
  const development = {
    // ... existing fields ...
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
    
    // Media Props
    heroMedia: heroMedia,
    galleryImages: galleryImages,
    
    // Tiles
    amenityTile: amenityTile,
    outdoorTile: outdoorTile,
    viewGalleryTile: viewGalleryTile,
    
    // Counts & Lists
    totalPhotos: galleryImages.length,
    totalVideos: normalizedVideos.length,
    videoList: normalizedVideos,
    floorPlans: floorPlans, // Kept separate for now
    
    indices: galleryIndices,
    amenities: amenities,
    units: units,
  };

  return (
    <>
        <MetaControl 
            title={`${development.name} | ${development.developer}`}
            description={development.description}
            image={development.heroMedia.type === 'image' ? development.heroMedia.image?.url : undefined}
        />
        
        <div className="min-h-screen bg-slate-50 pb-20">
            <ListingNavbar />
            
            <div className="pt-24 pb-4 container max-w-7xl mx-auto px-4">
                <Breadcrumbs 
                    items={[
                        { label: 'Home', href: '/' },
                        { label: development.location, href: '#' },
                        { label: development.name, href: `/development/${development.id}`, active: true }
                    ]} 
                />
            </div>

            {/* Gallery Section - CRITICAL: Isolated container with overflow control */}
            <div className="w-full bg-white border-b border-slate-200">
              <div className="container max-w-7xl mx-auto px-4 py-4">
                {/* IMPORTANT: Wrapper to contain gallery overflow */}
                <div className="relative w-full overflow-hidden">
                  <DevelopmentGallery
                    featuredMedia={development.heroMedia}
                    amenityTileImage={development.amenityTile}
                    outdoorsTileImage={development.outdoorTile}
                    viewGalleryTileImage={development.viewGalleryTile}
                    totalPhotos={development.totalPhotos}
                    totalVideos={development.totalVideos}
                    videoList={development.videoList}
                    floorPlans={development.floorPlans}
                    indices={development.indices}
                    onOpenLightbox={(index, title) => openLightbox(index, title)}
                  />
                </div>
              </div>
            </div>
        {/* Quick Info Section - ABOVE SectionNav */}
        <div className="w-full bg-white border-b border-slate-200">
          <div className="container max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
              
              {/* Left Column - Stats + Overview Card */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <section id="overview" className="w-full">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={Home} label="Type" value="Residential" color="blue" />
                    <StatCard icon={Check} label="Status" value="Selling" color="green" />
                    <StatCard icon={Building2} label="Units" value={`${development.availableUnits} Available`} color="purple" />
                    {(() => {
                        // Logic: Check 'structuralType' first (DB column), fallback to 'name' (Wizard)
                        // structuralType enum: 'apartment', 'freestanding-house', 'simplex', 'duplex', 'townhouse', etc.
                        const getCategory = (u: any) => {
                          const type = (u.structuralType || u.name || '').toLowerCase();
                          if (/house|villa|townhouse|simplex|duplex|freestanding/i.test(type)) return 'House';
                          if (/apartment|flat|studio|penthouse/i.test(type)) return 'Apartment';
                          return 'Unit';
                        };

                        const types = new Set(development.units.map(getCategory));
                        let typeLabel = "Various";
                        const hasHouses = types.has('House');
                        const hasApartments = types.has('Apartment');

                        if (hasHouses && hasApartments) typeLabel = "Houses & Apts";
                        else if (hasHouses) typeLabel = "Houses";
                        else if (hasApartments) typeLabel = "Apartments";
                        else if (development.units.length > 0) {
                           // Fallback: If all are 'Unit' (no match), try to show the first one's actual name type
                           const firstType = (development.units[0].structuralType || development.units[0].category || '').replace(/-/g, ' ');
                           if (firstType) typeLabel = firstType.charAt(0).toUpperCase() + firstType.slice(1);
                        }

                        return <StatCard icon={LayoutGrid} label="Unit Types" value={typeLabel} color="orange" />;
                    })()}
                  </div>
                </section>

                {/* Overview Card */}
                <DevelopmentOverviewCard 
                  priceFrom={development.startingPrice}
                  completionDate="December 2025"
                  progressPercentage={5}
                  constructionStatus="Under Construction"
                />
              </div>

              {/* Right Column - Developer Info Card */}
              <div className="w-full lg:w-[360px]">
                <Card className="shadow-sm border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
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
                          <Award className="w-3 h-3 text-orange-500 flex-shrink-0" />
                          <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">Verified Developer</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">
                      {development.developerDescription}
                    </p>

                    {development.developerWebsite && (
                      <a
                        href={development.developerWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline mb-3"
                      >
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Visit Website</span>
                      </a>
                    )}

                    <Separator className="bg-slate-100 my-3" />

                    {(() => {
                      const otherProjects = (allDevelopments || [])
                        .filter((d: any) => d.developerId === dev.developer?.id && d.id !== dev.id)
                        .slice(0, 3);
                      
                      if (otherProjects.length === 0) return null;
                      
                      return (
                        <div>
                          <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            Other Projects
                          </p>
                          <div className="space-y-1 pl-1 border-l-2 border-slate-100">
                            {otherProjects.map((project: any) => (
                              <a 
                                key={project.id}
                                href={`/development/${project.slug}`}
                                className="text-xs text-slate-600 pl-2 hover:text-blue-600 transition-colors block truncate"
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
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation - Full width sticky - SEPARATES upper from main content */}
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="container max-w-7xl mx-auto">
            <SectionNav />
          </div>
        </div>

        {/* Main Content Area - BELOW SectionNav */}
        <div className="w-full py-8">
          <div className="container max-w-7xl mx-auto px-4">
            
            {/* CRITICAL: Grid with proper gap, no negative margins */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
              
              {/* Main Content Column - No nested containers */}
              <main className="w-full min-w-0 space-y-8">

                {/* About Section */}
                <section className="w-full">
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                      <CardTitle className="font-bold text-slate-900">About {development.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className={`text-slate-600 leading-relaxed whitespace-pre-line overflow-hidden transition-all duration-300 ${isExpanded ? '' : 'line-clamp-6'}`}>
                        {development.description || "Experience luxury living in this exclusive new development. Providing state-of-the-art amenities and modern architectural design, this is the perfect place to call home."}
                      </div>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-blue-600 font-medium mt-4 hover:text-blue-700"
                        onClick={() => setIsExpanded(!isExpanded)}
                      >
                        {isExpanded ? "Show Less" : "Read Full Description"}
                      </Button>
                    </CardContent>
                  </Card>
                </section>

                <Separator className="bg-slate-200" />

                {/* Floor Plans Section - CRITICAL: Carousel overflow contained */}
                <section id="floor-plans" className="w-full">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-900">Floor Plans & Pricing</h3>
                  </div>

                  {(() => {
                    const bedroomCounts = Array.from(new Set(development.units.map((u: any) => u.bedrooms))).sort((a: any, b: any) => a - b);
                    const defaultTab = bedroomCounts[0]?.toString() || "0";

                    return (
                      <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className="bg-transparent p-0 flex flex-wrap gap-2 h-auto mb-6 justify-start">
                          {bedroomCounts.map((count: any) => {
                            const unitsInGroup = development.units.filter((u: any) => u.bedrooms === count);
                            const types = Array.from(new Set(unitsInGroup.map((u: any) => u.structuralType)));
                            let label = "Apartments";
                            if (types.length === 1 && types[0] === "House") label = "Houses";
                            else if (types.length === 1) label = `${types[0]}s`;
                            else if (types.every((t: any) => ["House", "Simplex", "Duplex"].includes(t))) label = "Houses"; 
                            
                            return (
                              <TabsTrigger 
                                key={count} 
                                value={count.toString()}
                                className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:border-slate-900 shadow-sm transition-all"
                              >
                                {count} Bedroom <span className="ml-1 opacity-70 font-normal">{label}</span>
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>

                        {bedroomCounts.map((count: any) => (
                          <TabsContent key={count} value={count.toString()} className="mt-0 focus-visible:outline-none">
                            {/* CRITICAL: Carousel container with proper boundaries */}
                            <div className="relative w-full">
                              <Carousel
                                opts={{
                                  align: "start",
                                  loop: true,
                                }}
                                className="w-full"
                              >
                                <CarouselContent className="-ml-4">
                                  {development.units
                                    .filter((u: any) => u.bedrooms === count)
                                    .map((unit: any) => (
                                      <CarouselItem key={unit.id} className="pl-4 md:basis-1/2 lg:basis-1/2">
                                        <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-slate-200 h-full flex flex-col">
                                          {/* Image with fixed aspect ratio */}
                                          <div className="relative w-full aspect-[16/10] bg-slate-200 overflow-hidden group">
                                            <img 
                                              src={unit.image} 
                                              alt={unit.type}
                                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                                  <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white shadow-md border-slate-200" />
                                  <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white shadow-md border-slate-200" />
                                </div>
                              </Carousel>
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    );
                  })()}
                </section>

                <Separator className="bg-slate-200" />

                {/* Specifications */}
                {(() => {
                  const estateSpecs = (dev as any).estateSpecs || {};
                  const hasEstateSpecs = estateSpecs.ownershipType || estateSpecs.powerBackup || estateSpecs.waterSupply;
                  
                  const formatLabel = (value: string) => {
                    if (!value) return '';
                    return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  };
                  
                  const specs: Array<{icon: any, label: string, value: string}> = [];
                  
                  if (hasEstateSpecs) {
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
                  }
                  
                  if (specs.length === 0) return null;
                  
                  return (
                    <section id="amenities" className="w-full">
                      <Card className="shadow-sm border border-slate-200 bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                          <CardTitle className="font-bold text-slate-900">Development Specifications</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {specs.map((spec, index) => {
                              const IconComponent = spec.icon;
                              return (
                                <div key={index} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                                  <IconComponent className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm text-slate-500">{spec.label}</p>
                                    <p className="font-semibold text-slate-900 capitalize">{spec.value}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </section>
                  );
                })()}

                {/* Amenities */}
                {(development.amenities.length > 0) && (
                  <>
                    <Separator className="bg-slate-200" />
                    <section className="w-full">
                      <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                          <CardTitle className="text-lg font-bold text-slate-900">Development Features & Amenities</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {development.amenities.map((amenity: string, index: number) => {
                              const iconMap: Record<string, any> = {
                                'pool': Droplets, 'swimming pool': Droplets, 'security': Shield,
                                '24hr security': Shield, 'cctv': Shield, 'wifi': Wifi,
                                'fibre': Wifi, 'internet': Wifi, 'parking': Car,
                                'garage': Car, 'garden': Trees, 'playground': Trees,
                                'gym': CheckCircle2, 'clubhouse': Building2, 'generator': Zap,
                                'solar': Zap, 'borehole': Droplets,
                              };
                              const IconComponent = iconMap[amenity.toLowerCase()] || CheckCircle2;
                              return (
                                <div key={index} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                                  <IconComponent className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 capitalize text-sm">{amenity.replace(/_/g, ' ')}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </section>
                  </>
                )}

                <Separator className="bg-slate-200" />

                {/* Developer Overview */}
                <section id="developer" className="w-full">
                  <DeveloperOverview 
                    developerName={development.developer}
                    developerLogo={development.developerLogo}
                  />
                </section>

                <Separator className="bg-slate-200" />

                {/* Location Section */}
                <section id="location" className="w-full space-y-6">
                  <NearbyLandmarks 
                    property={{
                      id: dev.id,
                      title: dev.name,
                      latitude: dev.latitude || '0',
                      longitude: dev.longitude || '0',
                    }} 
                  />

                  <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                      <SuburbInsights 
                        suburbId={dev.suburbId || 0}
                        suburbName={dev.suburb || dev.city} 
                        isDevelopment={true}
                      />
                    </CardContent>
                  </Card>

                  <LocalityGuide 
                    suburb={dev.suburb || dev.city} 
                    city={dev.city}
                  />
                </section>
              </main>

              {/* Sidebar - CRITICAL: Proper sticky positioning */}
              <aside className="w-full lg:w-[360px] space-y-4">
                {/* Sticky wrapper with proper constraints */}
                <div className="lg:sticky lg:top-24 space-y-4">
                  
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
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Outside main container */}
      <Footer />

      {/* Lightbox - Portal */}
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