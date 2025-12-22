import { Home as HomeIcon, Building2, Building, Castle, Warehouse, MapPin, Tractor, LucideIcon } from 'lucide-react';
import { useLocation } from 'wouter';

export interface PropertyTypeStats {
  type: string;
  count: number;
  avgPrice: number;
  icon?: string;
}

interface PropertyTypeExplorerProps {
  propertyTypes: PropertyTypeStats[];
  locationName: string;
  locationSlug?: string;
  placeId?: string;
}

interface CategoryConfig {
  icon: LucideIcon;
  title: string;
  gradient: string;
}

const CATEGORIES_CONFIG: Record<string, CategoryConfig> = {
  house: { icon: HomeIcon, title: 'Houses', gradient: 'from-indigo-500 to-purple-500' },
  apartment: { icon: Building2, title: 'Apartments', gradient: 'from-blue-500 to-indigo-500' },
  townhouse: { icon: Building, title: 'Townhouses', gradient: 'from-purple-500 to-pink-500' },
  commercial: { icon: Warehouse, title: 'Commercial', gradient: 'from-pink-500 to-rose-500' },
  land: { icon: MapPin, title: 'Land & Plots', gradient: 'from-rose-500 to-orange-500' },
  plot: { icon: MapPin, title: 'Land & Plots', gradient: 'from-rose-500 to-orange-500' },
  vacant_land: { icon: MapPin, title: 'Land & Plots', gradient: 'from-rose-500 to-orange-500' },
  farm: { icon: Tractor, title: 'Farms', gradient: 'from-orange-500 to-amber-500' },
  villa: { icon: Castle, title: 'Villas', gradient: 'from-cyan-500 to-blue-500' },
};

export function LocationPropertyTypeExplorer({ 
  propertyTypes, 
  locationName, 
  locationSlug,
  placeId 
}: PropertyTypeExplorerProps) {
  const [, navigate] = useLocation();

  /* Updated Routing Logic for 2025 Architecture */
  const handleTypeClick = (type: string) => {
    // Determine base path via prop or default to '/property-for-sale'
    // If locationSlug exists, use it. Otherwise fall back to generic search?
    // Assumption: locationSlug is passed as 'province/city/suburb' or similar canonical path
    
    // Construct new URL: /property-for-sale/{locationSlug}?propertyType={type}
    if (locationSlug) {
       navigate(`/property-for-sale/${locationSlug}?propertyType=${type}`);
    } else {
       // Fallback for location-less usage (rare in this component)
       navigate(`/property-for-sale/search?propertyType=${type}`);
    }
  };

  // Filter out types with zero listings and map to config
  const displayableTypes = propertyTypes
    .filter(pt => pt.count > 0 && CATEGORIES_CONFIG[pt.type.toLowerCase()])
    .map(pt => ({
      ...pt,
      config: CATEGORIES_CONFIG[pt.type.toLowerCase()]
    }));

  if (displayableTypes.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-b from-white to-muted/20">
      <div className="container">
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-left">
            Explore Property Categories in {locationName}
          </h2>
          <p className="text-muted-foreground text-base text-left max-w-2xl">
            Find the perfect property type that suits your needs in this location
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {displayableTypes.map((item) => {
            const { config } = item;
            const Icon = config.icon;

            return (
              <div
                key={item.type}
                onClick={() => handleTypeClick(item.type)}
                className="group relative flex flex-col items-start text-left p-6 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-white hover:to-primary/5 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary/20 overflow-hidden cursor-pointer"
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                {/* Icon with gradient background */}
                <div className={`relative mb-4 p-4 rounded-xl bg-gradient-to-br ${config.gradient} shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                
                {/* Text content */}
                <h3 className="relative text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {config.title}
                </h3>
                <p className="relative text-xs text-muted-foreground font-medium">
                  {item.count.toLocaleString()}+ Properties
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

