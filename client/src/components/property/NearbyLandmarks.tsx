// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { MapPin, School, Heart, Bus, ShoppingBag, Ticket, Footprints, Loader2 } from 'lucide-react';
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
];

export function NearbyLandmarks({ property }: NearbyLandmarksProps) {
  const [activeTab, setActiveTab] = useState('Education');

  const latitude =
    typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude;
  const longitude =
    typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude;

  const hasValidCoordinates =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== 0 &&
    longitude !== 0;

  const activeTabConfig = TABS.find(t => t.id === activeTab);
  const activeTabLabel = activeTabConfig?.label || 'Nearby';

  const { data: connectedPOIs, isLoading } = trpc.location.getNearbyAmenities.useQuery(
    {
      latitude: latitude || 0,
      longitude: longitude || 0,
      radius: 5000,
      types: activeTabConfig?.types || [],
      limit: 12,
    },
    {
      enabled: !!activeTabConfig && hasValidCoordinates,
      staleTime: 1000 * 60 * 60,
    },
  );

  const rankedPOIs = useMemo(() => {
    if (!connectedPOIs?.length) return [];

    return [...connectedPOIs]
      .sort((a: any, b: any) => {
        const ratingA = Number(a.rating || 0);
        const ratingB = Number(b.rating || 0);
        if (ratingA !== ratingB) return ratingB - ratingA;

        const reviewsA = Number(a.userRatingsTotal || a.user_ratings_total || 0);
        const reviewsB = Number(b.userRatingsTotal || b.user_ratings_total || 0);
        if (reviewsA !== reviewsB) return reviewsB - reviewsA;

        const distanceA = Number(a.distanceValue || Number.MAX_SAFE_INTEGER);
        const distanceB = Number(b.distanceValue || Number.MAX_SAFE_INTEGER);
        return distanceA - distanceB;
      })
      .slice(0, 5);
  }, [connectedPOIs]);

  const handleOpenMap = () => {
    if (!hasValidCoordinates) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      '_blank',
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-6 pb-0">
        <h3 className="mb-6 text-xl font-bold text-slate-900">Nearby Landmarks</h3>

        <div className="group relative mb-6 h-[240px] overflow-hidden rounded-xl border border-slate-200">
          {hasValidCoordinates ? (
            <>
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=14&size=800x400&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`}
                alt="Map location"
                className="absolute inset-0 h-full w-full object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    '/placeholders/urban-illustration-with-large-buildings-with-cars-and-trees-city-activities-vector.jpg';
                }}
              />

              <div className="absolute inset-0">
                <GooglePropertyMap
                  center={{ lat: latitude as number, lng: longitude as number }}
                  zoom={14}
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

              <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  onClick={handleOpenMap}
                  className="flex scale-95 items-center gap-2 rounded-full bg-blue-600 px-6 py-2 text-white shadow-lg transition-all duration-200 group-hover:scale-100 hover:bg-blue-700"
                >
                  <MapPin className="h-4 w-4" />
                  View on Map
                </Button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
              <MapPin className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium">Location not provided</p>
              <p className="text-xs text-slate-400">Request the exact pin from the developer.</p>
            </div>
          )}
        </div>

        <div className="scrollbar-hide mb-4 flex gap-3 overflow-x-auto pb-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-orange-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50/50'
                }`}
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

      <div className="min-h-[200px] px-6">
        {!hasValidCoordinates ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <MapPin className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm">Nearby landmarks unavailable</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : rankedPOIs.length > 0 ? (
          <div className="space-y-0">
            {rankedPOIs.map((poi: any, index: number) => (
              <div
                key={poi.id || index}
                className={`flex items-center justify-between py-4 ${
                  index !== rankedPOIs.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <div className="min-w-0 flex flex-col">
                  <span className="truncate text-sm font-medium text-slate-700">{poi.name}</span>
                  <span className="text-[11px] capitalize text-slate-400">
                    {(poi.type ? poi.type.replace(/_/g, ' ') : activeTabLabel).trim()}
                  </span>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  {Number(poi.rating || 0) > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                      {Number(poi.rating).toFixed(1)} star
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium capitalize text-slate-600">
                    {(poi.distance || 'Distance unavailable').trim()}
                  </span>
                  <Footprints className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <MapPin className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm">No nearby locations found</p>
          </div>
        )}
      </div>
    </div>
  );
}
