import { useState } from 'react';
import { Bus, Footprints, Heart, MapPin, School, ShoppingBag, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const googleMapsBrowserKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';

const formatDistanceOnly = (rawDistance: unknown) => {
  const value = String(rawDistance || '').trim();
  if (!value) return 'Distance N/A';
  const match = value.match(/[\d.]+\s*(km|m)/i);
  return match ? match[0] : value.split('-')[0].trim();
};

/**
 * Temporary generic provider component retained for DevelopmentDetail while
 * that journey receives its own location-authority audit. It is deliberately
 * not used by PropertyDetailPage: raw provider results, a fixed radius and
 * distance-only ordering are not a public landmark authority. Do not add a
 * new public consumer; Location Intelligence V1 will replace this with a
 * governed location-context contract.
 */
export function NearbyLandmarks({ property }: NearbyLandmarksProps) {
  const [activeTab, setActiveTab] = useState('Education');
  const [isMapPreviewUnavailable, setIsMapPreviewUnavailable] = useState(!googleMapsBrowserKey);
  const latitude =
    typeof property.latitude === 'string'
      ? Number.parseFloat(property.latitude)
      : property.latitude;
  const longitude =
    typeof property.longitude === 'string'
      ? Number.parseFloat(property.longitude)
      : property.longitude;
  const hasValidCoordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude) && latitude !== 0 && longitude !== 0;
  const activeTabConfig = TABS.find(tab => tab.id === activeTab);
  const activeTabLabel = activeTabConfig?.label || 'Nearby';
  const { data: connectedPOIs = [] } = trpc.location.getNearbyAmenities.useQuery(
    {
      latitude: latitude || 0,
      longitude: longitude || 0,
      radius: 5000,
      types: activeTabConfig?.types || [],
      limit: 5,
    },
    {
      enabled: Boolean(activeTabConfig) && hasValidCoordinates,
      staleTime: 1000 * 60 * 60,
    },
  );

  if (!hasValidCoordinates) return null;

  const hasCredibleNearbyPlaces = connectedPOIs.length > 0;
  const handleOpenMap = () => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      '_blank',
    );
  };

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-labelledby="location-overview-heading"
    >
      <div className="p-5 sm:p-6">
        <h2 id="location-overview-heading" className="text-lg font-bold text-slate-950">
          Location overview
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Use the public listing location to explore the surrounding area.
        </p>

        <div className="group relative mt-5 h-[190px] overflow-hidden rounded-xl border border-slate-200 sm:h-[240px]">
          {isMapPreviewUnavailable ? (
            <div
              role="status"
              className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-600"
            >
              <MapPin className="mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">Map preview unavailable</p>
              <p className="mt-1 text-xs text-slate-500">
                Open the property area in Google Maps instead.
              </p>
            </div>
          ) : (
            <img
              src={`https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=14&size=800x400&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=${googleMapsBrowserKey}`}
              alt={`Map preview of ${property.title}`}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setIsMapPreviewUnavailable(true)}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-100 md:pointer-events-none md:opacity-0 md:transition-opacity md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100">
            <Button
              onClick={handleOpenMap}
              className="rounded-full bg-blue-600 px-5 text-white shadow-lg hover:bg-blue-700"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Open in Google Maps
            </Button>
          </div>
        </div>

        {hasCredibleNearbyPlaces && (
          <div className="mt-5">
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Nearby place categories">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      isActive
                        ? 'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700'
                        : 'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700'
                    }
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {connectedPOIs.map((poi, index) => (
                <div key={poi.id || index} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{poi.name}</p>
                    <p className="mt-0.5 text-xs capitalize text-slate-500">
                      {(poi.type ? poi.type.replace(/_/g, ' ') : activeTabLabel).trim()}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-500">
                    <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDistanceOnly(poi.distance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
