import { useState, useCallback } from 'react';
import { GoogleMap, Marker, MarkerClusterer, useJsApiLoader } from '@react-google-maps/api';
import { Loader2, MapPin, Layers, Grid3x3, SplitSquareHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapHybridView, PropertyMapItem } from '@/hooks/useMapHybridView';
import { useMapFeedSync } from '@/hooks/useMapFeedSync';
import { PropertyCard } from './cards/PropertyCard';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { IconButton } from '@/components/ui/soft/IconButton';

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

const libraries: ("places")[] = ['places'];

export function MapHybridView({ categoryId, filters, onPropertyClick }: MapHybridViewProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const {
    properties,
    isLoading,
    searchInArea,
  } = useMapHybridView({ categoryId, filters });

  // Use the new map/feed sync hook
  const {
    selectedPropertyId,
    hoveredPropertyId,
    handleMapLoad,
    handleMapPan,
    handleFeedItemSelect,
    handleMarkerClick,
    handlePropertyHover,
    registerPropertyRef,
    clearSelection,
    fitBoundsToProperties,
    feedScrollRef,
  } = useMapFeedSync({
    onBoundsChange: (bounds) => {
      // Trigger property refetch with new bounds
      console.log('Map bounds changed:', bounds);
    },
    onPropertySelect: (propertyId) => {
      onPropertyClick?.(propertyId);
    },
  });

  // Handle marker click with sync
  const onMarkerClick = useCallback((property: PropertyMapItem) => {
    handleMarkerClick(property.id);
  }, [handleMarkerClick]);

  // Handle property click from feed with sync
  const onCardClick = useCallback((property: PropertyMapItem) => {
    handleFeedItemSelect(property.id, {
      lat: property.latitude,
      lng: property.longitude,
    });
  }, [handleFeedItemSelect]);

  // Handle map bounds change
  const onBoundsChanged = useCallback(() => {
    const map = (window as any).googleMapInstance;
    if (map) {
      const bounds = map.getBounds();
      if (bounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        
        handleMapPan({
          north: ne.lat(),
          south: sw.lat(),
          east: ne.lng(),
          west: sw.lng(),
        });
      }
    }
  }, [handleMapPan]);

  // Fit bounds to all properties
  const onFitBounds = useCallback(() => {
    const propertyLocations = properties.map(p => ({
      lat: p.latitude,
      lng: p.longitude,
    }));
    fitBoundsToProperties(propertyLocations);
  }, [properties, fitBoundsToProperties]);

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
      {/* Header with view mode toggle - Modern design */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <h2 className="text-lg font-bold text-gray-900">Map View</h2>
        
        {/* View mode toggle - Modern pill design */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
          <motion.button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              viewMode === 'map'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Map only view"
          >
            <MapPin className="w-4 h-4" />
            <span>Map</span>
          </motion.button>
          <motion.button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              viewMode === 'split'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Split view"
          >
            <SplitSquareHorizontal className="w-4 h-4" />
            <span>Split</span>
          </motion.button>
          <motion.button
            onClick={() => setViewMode('feed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              viewMode === 'feed'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Feed only view"
          >
            <Grid3x3 className="w-4 h-4" />
            <span>Feed</span>
          </motion.button>
        </div>

        {/* Property count */}
        <div className="text-sm text-gray-600 font-medium">
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
              onLoad={(map) => {
                handleMapLoad(map);
                (window as any).googleMapInstance = map;
              }}
              onDragEnd={onBoundsChanged}
              onZoomChanged={onBoundsChanged}
              options={{
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true,
                styles: [
                  {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }],
                  },
                ],
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
                    {properties.map((property) => {
                      const isSelected = selectedPropertyId === property.id;
                      const isHovered = hoveredPropertyId === property.id;
                      const isHighlighted = isSelected || isHovered;

                      return (
                        <Marker
                          key={property.id}
                          position={{ lat: property.latitude, lng: property.longitude }}
                          onClick={() => onMarkerClick(property)}
                          clusterer={clusterer}
                          icon={
                            isHighlighted
                              ? {
                                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                    <svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
                                      <defs>
                                        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                                          <feOffset dx="0" dy="2" result="offsetblur"/>
                                          <feComponentTransfer>
                                            <feFuncA type="linear" slope="0.3"/>
                                          </feComponentTransfer>
                                          <feMerge>
                                            <feMergeNode/>
                                            <feMergeNode in="SourceGraphic"/>
                                          </feMerge>
                                        </filter>
                                      </defs>
                                      <circle cx="24" cy="24" r="20" fill="${isSelected ? '#6366f1' : '#2563eb'}" stroke="white" stroke-width="3" filter="url(#shadow)"/>
                                      ${isSelected ? '<circle cx="24" cy="24" r="8" fill="white"/>' : ''}
                                    </svg>
                                  `),
                                  scaledSize: new google.maps.Size(48, 48),
                                  anchor: new google.maps.Point(24, 24),
                                }
                              : {
                                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                    <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                                      <circle cx="16" cy="16" r="12" fill="#3b82f6" stroke="white" stroke-width="2"/>
                                    </svg>
                                  `),
                                  scaledSize: new google.maps.Size(32, 32),
                                  anchor: new google.maps.Point(16, 16),
                                }
                          }
                          animation={isSelected ? google.maps.Animation.BOUNCE : undefined}
                        />
                      );
                    })}
                  </>
                )}
              </MarkerClusterer>
            </GoogleMap>

            {/* Search in area button - Modern glass design */}
            <motion.div 
              className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.button
                onClick={searchInArea}
                className="flex items-center gap-2 px-5 py-2.5 glass-overlay rounded-full text-sm font-medium text-gray-900 hover:shadow-lg transition-all"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <MapPin className="w-4 h-4 text-indigo-600" />
                Search this area
              </motion.button>
            </motion.div>

            {/* Fit bounds button - Modern design */}
            {properties.length > 0 && (
              <motion.div 
                className="absolute bottom-4 right-4 z-10"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
              >
                <IconButton
                  icon={Layers}
                  onClick={onFitBounds}
                  label="Fit all properties"
                  variant="glass"
                />
              </motion.div>
            )}

            {/* Sticky property card with glass overlay */}
            <AnimatePresence>
              {selectedPropertyId && properties.find(p => p.id === selectedPropertyId) && (
                <motion.div
                  initial={{ y: 100, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 100, opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 w-80 max-w-[90vw]"
                >
                  <ModernCard variant="glass" className="p-4 relative">
                    <button
                      onClick={clearSelection}
                      className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                    
                    {(() => {
                      const property = properties.find(p => p.id === selectedPropertyId);
                      if (!property) return null;
                      
                      return (
                        <div className="space-y-3">
                          <img
                            src={property.imageUrl}
                            alt={property.title}
                            className="w-full h-40 object-cover rounded-lg"
                          />
                          <div>
                            <h3 className="font-bold text-base mb-1 text-gray-900">{property.title}</h3>
                            <p className="text-indigo-600 font-bold text-lg mb-2">
                              {new Intl.NumberFormat('en-ZA', {
                                style: 'currency',
                                currency: 'ZAR',
                                maximumFractionDigits: 0,
                              }).format(property.price)}
                            </p>
                            <p className="text-sm text-gray-600 mb-3">
                              {property.beds && `${property.beds} Bed`}
                              {property.baths && ` • ${property.baths} Bath`}
                              {property.size && ` • ${property.size} m²`}
                            </p>
                            <motion.button
                              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => onPropertyClick?.(property.id)}
                            >
                              View Details
                            </motion.button>
                          </div>
                        </div>
                      );
                    })()}
                  </ModernCard>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading overlay with modern design */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 glass-overlay flex items-center justify-center z-20"
                >
                  <div className="flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-lg">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    <span className="text-sm font-medium text-gray-700">Loading properties...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Property feed with modern design */}
        {(viewMode === 'feed' || viewMode === 'split') && (
          <div 
            ref={feedScrollRef}
            className={`bg-gray-50 overflow-y-auto ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}
          >
            <div className="p-4 space-y-4">
              {properties.length === 0 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                    <MapPin className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No properties found</h3>
                  <p className="text-sm text-gray-600 max-w-md">
                    Try adjusting the map view or changing your filters to see more properties.
                  </p>
                </motion.div>
              )}

              {properties.map((property, index) => {
                const isSelected = selectedPropertyId === property.id;
                const isHovered = hoveredPropertyId === property.id;
                
                return (
                  <motion.div
                    key={property.id}
                    ref={(el) => registerPropertyRef(property.id, el)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`transition-all ${
                      isSelected || isHovered ? 'ring-2 ring-indigo-500 rounded-2xl' : ''
                    }`}
                    onMouseEnter={() => handlePropertyHover(property.id)}
                    onMouseLeave={() => handlePropertyHover(null)}
                  >
                    <PropertyCard
                      property={property}
                      onClick={() => onCardClick(property)}
                      onSave={() => handleSave(property.id)}
                    />
                  </motion.div>
                );
              })}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center py-8"
                >
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    <span className="text-sm font-medium text-gray-600">Loading properties...</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
