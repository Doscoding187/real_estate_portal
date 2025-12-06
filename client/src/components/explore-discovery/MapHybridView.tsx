import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow, MarkerClusterer, useJsApiLoader } from '@react-google-maps/api';
import { Loader2, MapPin, Layers, Grid3x3, SplitSquareHorizontal } from 'lucide-react';
import { useMapHybridView, PropertyMapItem } from '@/hooks/useMapHybridView';
import { PropertyCard } from './cards/PropertyCard';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

type ViewMode = 'map' | 'feed' | 'split';

interface MapHybridViewProps {
  categoryId?: number;
  filters?: Record<string, any>;
  onPropertyClick?: (propertyId: number) => void;
}

export function MapHybridView({ categoryId, filters, onPropertyClick }: MapHybridViewProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [selectedProperty, setSelectedProperty] = useState<PropertyMapItem | null>(null);

  const {
    properties,
    selectedPropertyId,
    highlightedPropertyId,
    isLoading,
    handleMapLoad,
    handleBoundsChanged,
    handlePropertySelect,
    handlePropertyHighlight,
    searchInArea,
    fitBounds,
    panToProperty,
  } = useMapHybridView({ categoryId, filters });

  // Handle marker click
  const handleMarkerClick = useCallback((property: PropertyMapItem) => {
    setSelectedProperty(property);
    handlePropertySelect(property.id);
  }, [handlePropertySelect]);

  // Handle card scroll into view
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { propertyId } = customEvent.detail;
      handlePropertyHighlight(propertyId);
    };

    window.addEventListener('propertyInView', handleScroll as EventListener);
    return () => window.removeEventListener('propertyInView', handleScroll as EventListener);
  }, [handlePropertyHighlight]);

  // Handle property click from feed
  const handleCardClick = useCallback((propertyId: number) => {
    panToProperty(propertyId);
    onPropertyClick?.(propertyId);
  }, [panToProperty, onPropertyClick]);

  const handleSave = useCallback((propertyId: number) => {
    console.log('Save property:', propertyId);
    // TODO: Implement save functionality
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading map...</span>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col">
      {/* Header with view mode toggle */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <h2 className="text-lg font-bold text-gray-900">Map View</h2>
        
        {/* View mode toggle */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-label="Map only view"
          >
            <MapPin className="w-4 h-4" />
            <span>Map</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'split'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-label="Split view"
          >
            <SplitSquareHorizontal className="w-4 h-4" />
            <span>Split</span>
          </button>
          <button
            onClick={() => setViewMode('feed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'feed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-label="Feed only view"
          >
            <Grid3x3 className="w-4 h-4" />
            <span>Feed</span>
          </button>
        </div>

        {/* Property count */}
        <div className="text-sm text-gray-600">
          {properties.length} {properties.length === 1 ? 'property' : 'properties'}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className={`relative ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={properties.length > 0 ? undefined : { lat: -26.2041, lng: 28.0473 }}
              zoom={10}
              onLoad={handleMapLoad}
              onDragEnd={handleBoundsChanged}
              onZoomChanged={handleBoundsChanged}
              options={{
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true,
              }}
            >
              {/* Marker clusterer for dense areas */}
              <MarkerClusterer
                options={{
                  imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
                  gridSize: 60,
                  maxZoom: 15,
                }}
              >
                {(clusterer) => (
                  <>
                    {properties.map((property) => (
                      <Marker
                        key={property.id}
                        position={{ lat: property.latitude, lng: property.longitude }}
                        onClick={() => handleMarkerClick(property)}
                        clusterer={clusterer}
                        icon={
                          highlightedPropertyId === property.id || selectedPropertyId === property.id
                            ? {
                                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                  <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="20" cy="20" r="18" fill="#2563eb" stroke="white" stroke-width="3"/>
                                  </svg>
                                `),
                                scaledSize: new google.maps.Size(40, 40),
                                anchor: new google.maps.Point(20, 20),
                              }
                            : undefined
                        }
                      />
                    ))}
                  </>
                )}
              </MarkerClusterer>

              {/* Info window for selected property */}
              {selectedProperty && (
                <InfoWindow
                  position={{ lat: selectedProperty.latitude, lng: selectedProperty.longitude }}
                  onCloseClick={() => setSelectedProperty(null)}
                >
                  <div className="max-w-xs">
                    <img
                      src={selectedProperty.imageUrl}
                      alt={selectedProperty.title}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                    <h3 className="font-bold text-sm mb-1">{selectedProperty.title}</h3>
                    <p className="text-blue-600 font-bold text-sm mb-1">
                      {new Intl.NumberFormat('en-ZA', {
                        style: 'currency',
                        currency: 'ZAR',
                        maximumFractionDigits: 0,
                      }).format(selectedProperty.price)}
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      {selectedProperty.beds && `${selectedProperty.beds} Bed`}
                      {selectedProperty.baths && ` • ${selectedProperty.baths} Bath`}
                      {selectedProperty.size && ` • ${selectedProperty.size} m²`}
                    </p>
                    <button
                      className="w-full py-2 px-4 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                      onClick={() => onPropertyClick?.(selectedProperty.id)}
                    >
                      View Details
                    </button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>

            {/* Search in area button */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <button
                onClick={searchInArea}
                className="flex items-center gap-2 px-4 py-2 bg-white shadow-lg rounded-full text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <MapPin className="w-4 h-4 text-blue-600" />
                Search this area
              </button>
            </div>

            {/* Fit bounds button */}
            {properties.length > 0 && (
              <div className="absolute bottom-4 right-4 z-10">
                <button
                  onClick={fitBounds}
                  className="flex items-center gap-2 px-4 py-2 bg-white shadow-lg rounded-full text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                  aria-label="Fit all properties"
                >
                  <Layers className="w-4 h-4 text-blue-600" />
                  Fit all
                </button>
              </div>
            )}

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Property feed */}
        {(viewMode === 'feed' || viewMode === 'split') && (
          <div className={`bg-gray-50 overflow-y-auto ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="p-4 space-y-4">
              {properties.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No properties found</h3>
                  <p className="text-sm text-gray-600 max-w-md">
                    Try adjusting the map view or changing your filters to see more properties.
                  </p>
                </div>
              )}

              {properties.map((property) => (
                <div
                  key={property.id}
                  className={`transition-all ${
                    highlightedPropertyId === property.id ? 'ring-2 ring-blue-500 rounded-2xl' : ''
                  }`}
                  onMouseEnter={() => handlePropertyHighlight(property.id)}
                  onMouseLeave={() => handlePropertyHighlight(null)}
                >
                  <PropertyCard
                    property={property}
                    onClick={() => handleCardClick(property.id)}
                    onSave={() => handleSave(property.id)}
                  />
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  <span className="ml-2 text-gray-600">Loading properties...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
