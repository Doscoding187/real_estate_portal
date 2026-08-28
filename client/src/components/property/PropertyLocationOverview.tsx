import { useEffect, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PublicPropertyLocationPresentation } from '@shared/public-property-detail-presentation';

interface PropertyLocationOverviewProps {
  location: PublicPropertyLocationPresentation;
  propertyTitle: string;
}

const staticMapUrl = (
  location: PublicPropertyLocationPresentation,
  browserKey: string,
): string | null => {
  if (!location.coordinates || !browserKey) return null;

  const { latitude, longitude } = location.coordinates;
  const zoom = location.precision === 'exact' ? 15 : 13;
  const query = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: String(zoom),
    size: '900x500',
    maptype: 'roadmap',
    markers: `color:blue|${latitude},${longitude}`,
    key: browserKey,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${query.toString()}`;
};

/**
 * A detail-page location is deliberately a public-location context, not a
 * generic nearby-places feed. It stays useful when a map provider is missing
 * and makes approximate map precision explicit to the buyer.
 */
export function PropertyLocationOverview({
  location,
  propertyTitle,
}: PropertyLocationOverviewProps) {
  const browserKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';
  const previewUrl = staticMapUrl(location, browserKey);
  const [isMapPreviewUnavailable, setIsMapPreviewUnavailable] = useState(() => !previewUrl);

  useEffect(() => {
    setIsMapPreviewUnavailable(!previewUrl);
  }, [previewUrl]);

  const hasCoordinates = Boolean(location.coordinates);
  const mapsActionLabel =
    location.precision === 'exact'
      ? 'Open location in Google Maps'
      : 'Open public area in Google Maps';
  const mapAlt =
    location.precision === 'exact'
      ? `Public map for ${propertyTitle}`
      : `Approximate area map for ${propertyTitle}`;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-labelledby="location-overview-heading"
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id="location-overview-heading" className="text-lg font-bold text-slate-950">
              Location overview
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-slate-700">{location.label}</p>
          </div>
          <span className="inline-flex w-fit shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {location.precisionLabel}
          </span>
        </div>

        <div className="mt-5 grid overflow-hidden rounded-xl border border-slate-200 sm:grid-cols-[minmax(0,1.25fr)_minmax(230px,0.75fr)]">
          <div className="relative min-h-[210px] bg-slate-50 sm:min-h-[240px]">
            {previewUrl && !isMapPreviewUnavailable ? (
              <img
                src={previewUrl}
                alt={mapAlt}
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setIsMapPreviewUnavailable(true)}
              />
            ) : (
              <div
                role="status"
                className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
              >
                <MapPin className="h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-slate-700">
                  {hasCoordinates ? 'Map preview unavailable' : 'Map location unavailable'}
                </p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                  {hasCoordinates
                    ? 'You can still explore this public location in Google Maps.'
                    : 'A map location was not supplied with this approved listing.'}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center border-t border-slate-200 bg-slate-50 p-5 sm:border-t-0 sm:border-l">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {location.precisionLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{location.description}</p>
            {location.mapsUrl && (
              <Button
                asChild
                variant="outline"
                className="mt-5 h-10 w-full border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <a href={location.mapsUrl} target="_blank" rel="noreferrer">
                  {mapsActionLabel}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
