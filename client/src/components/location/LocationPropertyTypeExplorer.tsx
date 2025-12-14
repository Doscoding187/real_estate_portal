import { Home, Building2, Building, Castle, Warehouse, MapPin } from 'lucide-react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

const PROPERTY_TYPE_ICONS: Record<string, React.ReactNode> = {
  house: <Home className="h-8 w-8" />,
  apartment: <Building2 className="h-8 w-8" />,
  townhouse: <Building className="h-8 w-8" />,
  villa: <Castle className="h-8 w-8" />,
  commercial: <Warehouse className="h-8 w-8" />,
  plot: <MapPin className="h-8 w-8" />,
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: 'Houses',
  apartment: 'Apartments',
  townhouse: 'Townhouses',
  villa: 'Villas',
  commercial: 'Commercial',
  plot: 'Plots & Land',
};

export function LocationPropertyTypeExplorer({ 
  propertyTypes, 
  locationName, 
  locationSlug,
  placeId 
}: PropertyTypeExplorerProps) {
  const [, navigate] = useLocation();

  const handleTypeClick = (type: string) => {
    const params = new URLSearchParams();
    params.append('propertyType', type);
    if (locationSlug) params.append('location', locationSlug);
    if (placeId) params.append('placeId', placeId);
    
    navigate(`/properties?${params.toString()}`);
  };

  // Filter out types with zero listings
  const availableTypes = propertyTypes.filter(pt => pt.count > 0);

  if (availableTypes.length === 0) {
    return null;
  }

  return (
    <section className="container py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Browse by Property Type</h2>
        <p className="text-muted-foreground">
          Explore different types of properties available in {locationName}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {availableTypes.map((propertyType) => (
          <PropertyTypeCard
            key={propertyType.type}
            type={propertyType.type}
            count={propertyType.count}
            avgPrice={propertyType.avgPrice}
            onClick={() => handleTypeClick(propertyType.type)}
          />
        ))}
      </div>
    </section>
  );
}

interface PropertyTypeCardProps {
  type: string;
  count: number;
  avgPrice: number;
  onClick: () => void;
}

function PropertyTypeCard({ type, count, avgPrice, onClick }: PropertyTypeCardProps) {
  const icon = PROPERTY_TYPE_ICONS[type] || <Home className="h-8 w-8" />;
  const label = PROPERTY_TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-slate-200"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icon */}
          <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
            {icon}
          </div>

          {/* Type Name */}
          <div>
            <h3 className="text-lg font-semibold mb-1">{label}</h3>
            <Badge variant="secondary" className="text-xs">
              {count} {count === 1 ? 'listing' : 'listings'}
            </Badge>
          </div>

          {/* Average Price */}
          {avgPrice > 0 && (
            <div className="pt-2 border-t w-full">
              <p className="text-sm text-muted-foreground">Avg. Price</p>
              <p className="text-lg font-bold text-primary">
                R{avgPrice.toLocaleString()}
              </p>
            </div>
          )}

          {/* Hover CTA */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-sm text-primary font-medium">
              View {label} →
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
