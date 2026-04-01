import React, { useState } from 'react';
import { MapPin, School, Heart, Bus, ShoppingBag, Ticket, Footprints, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { trpc } from '@/lib/trpc';

interface NearbyLandmarksProps {
  property: {
    id: number;
    title: string;
    latitude?: string | number;
    longitude?: string | number;
  };
  overviewItems?: Array<{ key: string; label: string; value: string }>;
}

interface NearbyAmenity {
  id?: string | number;
  name: string;
  type?: string | null;
  distance?: string | null;
}

const TABS = [
  { id: 'Education', icon: School, label: 'Education', types: ['school', 'university'] },
  { id: 'Health', icon: Heart, label: 'Health', types: ['hospital', 'doctor', 'pharmacy'] },
  {
    id: 'Transportation',
    icon: Bus,
    label: 'Transportation',
    types: ['bus_station', 'train_station', 'transit_station', 'subway_station'],
  },
  {
    id: 'Shopping',
    icon: ShoppingBag,
    label: 'Shopping',
    types: ['shopping_mall', 'supermarket', 'department_store'],
  },
  {
    id: 'Entertainment',
    icon: Ticket,
    label: 'Entertainment',
    types: ['movie_theater', 'park', 'attraction', 'stadium'],
  },
] as const;

type LandmarkTabId = (typeof TABS)[number]['id'];

export function NearbyLandmarks({ property, overviewItems = [] }: NearbyLandmarksProps) {
  const [activeTab, setActiveTab] = useState<LandmarkTabId>('Education');

  let latitude =
    typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude;
  let longitude =
    typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude;

  const hasValidCoordinates =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== 0 &&
    longitude !== 0;

  const activeTabConfig = TABS.find(t => t.id === activeTab);
  const activeTabTypes = activeTabConfig ? [...activeTabConfig.types] : [];

  const { data: connectedPOIs, isLoading } = trpc.location.getNearbyAmenities.useQuery(
    {
      latitude: latitude || 0,
      longitude: longitude || 0,
      radius: 5000,
      types: activeTabTypes,
      limit: 5,
    },
    {
      enabled: !!activeTabConfig && hasValidCoordinates,
      staleTime: 1000 * 60 * 60, // 1 hour
    },
  );

  const handleOpenMap = () => {
    if (!hasValidCoordinates) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      '_blank',
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-6 pb-0">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Nearby Landmarks</h3>
            <p className="mt-1 text-sm text-slate-500">
              Use the map and nearby places to judge daily fit before you enquire.
            </p>
          </div>
          {hasValidCoordinates && (
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              5 km radius
            </div>
          )}
        </div>

        {overviewItems.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {overviewItems.map(item => (
              <div
                key={item.key}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                <span className="mr-1 text-slate-400">{item.label}:</span>
                <span className="text-slate-700">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Map Preview with Static Fallback */}
        <div className="relative rounded-xl overflow-hidden border border-slate-200 h-[240px] mb-6 group">
          {hasValidCoordinates ? (
            <>
              {/* Static map image as fallback background */}
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=14&size=800x400&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`}
                alt="Map location"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  // Fallback to a generic map placeholder if static map fails
                  e.currentTarget.src =
                    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=400&fit=crop';
                }}
              />

              {/* Interactive map overlay */}
              <div className="absolute inset-0">
                <GooglePropertyMap
                  minimal={true}
                  className="pointer-events-none"
                  properties={[
                    {
                      id: property.id,
                      title: property.title,
                      latitude: latitude as number,
                      longitude: longitude as number,
                      price: 0,
                      propertyType: 'property',
                      listingType: 'sale',
                      address: '',
                      city: '',
                      bedrooms: 0,
                      bathrooms: 0,
                      area: 0,
                      mainImage: '',
                    },
                  ]}
                />
              </div>

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
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
              <MapPin className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium">Location not provided</p>
              <p className="text-xs text-slate-400">Request the exact pin from the developer.</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors
                  ${
                    isActive
                      ? 'bg-orange-50 border-orange-500 text-orange-700'
                      : 'bg-white border-orange-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50/50'
                  }
                `}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${isActive ? 'text-orange-500' : 'text-slate-400'}`}
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* POI List */}
      <div className="min-h-[200px] px-6">
        {!hasValidCoordinates ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <MapPin className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm">Nearby landmarks unavailable</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : connectedPOIs && connectedPOIs.length > 0 ? (
          <div className="space-y-0">
            {(connectedPOIs as NearbyAmenity[]).map((poi, index: number) => (
              <div
                key={poi.id || index}
                className={`flex items-center justify-between py-4 ${index !== connectedPOIs.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="flex flex-col">
                  <span className="text-slate-700 font-medium">{poi.name}</span>
                  {poi.type && (
                    <span className="text-xs text-slate-400 capitalize">
                      {poi.type.replace(/_/g, ' ')}
                    </span>
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
