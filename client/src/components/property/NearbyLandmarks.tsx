import React, { useState } from 'react';
import { 
  MapPin, 
  School, 
  Heart, 
  Bus, 
  ShoppingBag, 
  Ticket, 
  Footprints,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { trpc } from '@/lib/trpc';

interface NearbyLandmarksProps {
  property: {
    id: number;
    title: string;
    latitude: string | number;
    longitude: string | number;
  };
}

const TABS = [
  { id: 'Education', icon: School, label: 'Education', types: ['school', 'university'] },
  { id: 'Health', icon: Heart, label: 'Health', types: ['hospital', 'doctor', 'pharmacy'] },
  { id: 'Transportation', icon: Bus, label: 'Transportation', types: ['bus_station', 'train_station', 'transit_station', 'subway_station'] },
  { id: 'Shopping', icon: ShoppingBag, label: 'Shopping', types: ['shopping_mall', 'supermarket', 'department_store'] },
  { id: 'Entertainment', icon: Ticket, label: 'Entertainment', types: ['movie_theater', 'park', 'attraction', 'stadium'] },
];

export function NearbyLandmarks({ property }: NearbyLandmarksProps) {
  const [activeTab, setActiveTab] = useState('Education');
  
  // Fallback to Sandton if no coordinates (for test properties)
  // Fallback to Sandton if no coordinates (for test properties)
  const DEFAULT_LAT = -26.107567;
  const DEFAULT_LNG = 28.056702;

  let latitude = typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude;
  let longitude = typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude;

  // Use default if coordinates are missing or 0
  if (!latitude || !longitude) {
    latitude = DEFAULT_LAT;
    longitude = DEFAULT_LNG;
  }

  const activeTabConfig = TABS.find(t => t.id === activeTab);

  const { data: connectedPOIs, isLoading } = trpc.location.getNearbyAmenities.useQuery({
    latitude,
    longitude,
    radius: 5000,
    types: activeTabConfig?.types || [],
    limit: 5
  }, {
    enabled: !!activeTabConfig, // Always enabled since we have defaults
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const handleOpenMap = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 pb-0">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Nearby Landmarks</h3>
        
        {/* Map Preview */}
        <div className="relative rounded-xl overflow-hidden border border-slate-200 h-[240px] mb-6 group">
          <GooglePropertyMap
            center={{ lat: latitude, lng: longitude }}
            zoom={14}
            minimal={true}
            className="pointer-events-none" // Disable all interaction with the map itself as it's a preview
            properties={[
              {
                id: property.id,
                title: property.title,
                latitude,
                longitude,
                price: 0,
                propertyType: 'property',
                listingType: 'sale',
                address: '',
                city: '',
                bedrooms: 0,
                bathrooms: 0,
                area: 0,
                mainImage: ''
              }
            ]}
          />
          
          {/* Floating Button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              onClick={handleOpenMap}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 shadow-lg flex items-center gap-2 transform scale-95 group-hover:scale-100 transition-all duration-200"
            >
              <MapPin className="h-4 w-4" />
              View on Map
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors
                  ${isActive 
                    ? 'bg-orange-50 border-orange-500 text-orange-700' 
                    : 'bg-white border-orange-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50/50'
                  }
                `}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* POI List */}
      <div className="px-6 min-h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : connectedPOIs && connectedPOIs.length > 0 ? (
          <div className="space-y-0">
            {connectedPOIs.map((poi: any, index: number) => (
              <div 
                key={poi.id || index} 
                className={`flex items-center justify-between py-4 ${index !== connectedPOIs.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="flex flex-col">
                  <span className="text-slate-700 font-medium">{poi.name}</span>
                  {poi.type && (
                    <span className="text-xs text-slate-400 capitalize">{poi.type.replace(/_/g, ' ')}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="text-sm font-semibold text-slate-900">{poi.distance}</span>
                  <Footprints className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <MapPin className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm">No nearby locations found</p>
          </div>
        )}
      </div>

      {/* View More Button - Optional, removing if we don't have pagination */}
      {/* 
      <div className="p-6 pt-2 flex justify-center">
        <Button 
          variant="outline" 
          className="rounded-full border-orange-200 text-slate-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 px-8"
        >
          View more
        </Button>
      </div> 
      */}
    </div>
  );
}
