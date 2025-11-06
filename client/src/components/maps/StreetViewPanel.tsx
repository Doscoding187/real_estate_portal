import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Navigation,
  RotateCw,
  Maximize2,
  Minimize2,
  AlertCircle,
  Camera,
  ArrowLeft,
  ArrowRight,
  Home,
} from 'lucide-react';

declare global {
  interface Window {
    google: any;
    initGooglePlaces: () => void;
  }
}

interface StreetViewLocation {
  lat: number;
  lng: number;
  address?: string;
  panoramaId?: string;
}

interface StreetViewOptions {
  heading?: number; // 0-360 degrees
  pitch?: number; // -90 to 90 degrees
  zoom?: number; // 1-5 levels
  pov?: {
    heading: number;
    pitch: number;
  };
}

interface StreetViewPanelProps {
  location: StreetViewLocation;
  options?: StreetViewOptions;
  showControls?: boolean;
  onLocationChange?: (location: StreetViewLocation) => void;
  className?: string;
}

export function StreetViewPanel({
  location,
  options = {},
  showControls = true,
  onLocationChange,
  className = '',
}: StreetViewPanelProps) {
  const panoramaRef = useRef<HTMLDivElement>(null);
  const panoramaInstanceRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<StreetViewLocation>(location);
  const [availableLinks, setAvailableLinks] = useState<google.maps.StreetViewLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMapsAPI = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.google && window.google.maps && window.google.maps.StreetViewPanorama) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}&libraries=places&callback=initGooglePlaces`;
        script.async = true;
        script.defer = true;

        window.initGooglePlaces = () => {
          resolve();
        };

        script.onerror = () => {
          reject(new Error('Failed to load Google Maps API'));
        };

        document.head.appendChild(script);
      });
    };

    loadGoogleMapsAPI()
      .then(() => setIsLoaded(true))
      .catch(error => {
        console.error('Failed to load Google Maps API:', error);
        setError('Failed to load Google Maps. Please check your API key.');
      });
  }, []);

  // Initialize Street View panorama
  useEffect(() => {
    if (!panoramaRef.current || !isLoaded || !location.lat || !location.lng) return;

    try {
      const panorama = new window.google.maps.StreetViewPanorama(panoramaRef.current, {
        position: new window.google.maps.LatLng(location.lat, location.lng),
        pov: {
          heading: options.heading || 0,
          pitch: options.pitch || 0,
        },
        zoom: options.zoom || 1,
        addressControl: showControls,
        linksControl: showControls,
        panControl: showControls,
        enableCloseButton: true,
        motionTracking: true,
        motionTrackingControl: showControls,
      });

      panoramaInstanceRef.current = panorama;

      // Set up event listeners
      panorama.addListener('position_changed', () => {
        const newPosition = panorama.getPosition();
        if (newPosition) {
          const newLocation = {
            lat: newPosition.lat(),
            lng: newPosition.lng(),
            address: currentLocation.address,
          };
          setCurrentLocation(newLocation);
          onLocationChange?.(newLocation);
        }
      });

      panorama.addListener('links_changed', () => {
        const links = panorama.getLinks();
        setAvailableLinks(links);
      });

      panorama.addListener('error', (event: any) => {
        console.error('Street View error:', event);
        setError('Street View is not available at this location');
      });

      // Check if Street View is available
      panorama.addListener('status_changed', () => {
        const status = panorama.getStatus();
        if (status !== window.google.maps.StreetViewStatus.OK) {
          setError('Street View is not available at this location');
        } else {
          setError(null);
        }
      });
    } catch (error) {
      console.error('Failed to initialize Street View:', error);
      setError('Failed to initialize Street View');
    }
  }, [isLoaded, location, options, showControls, currentLocation.address, onLocationChange]);

  // Navigate to new location
  const navigateToLocation = useCallback((newLocation: StreetViewLocation) => {
    if (!panoramaInstanceRef.current) return;

    setIsLoading(true);
    panoramaInstanceRef.current.setPosition(
      new google.maps.LatLng(newLocation.lat, newLocation.lng),
    );
    setCurrentLocation(newLocation);
    setIsLoading(false);
  }, []);

  // Navigate to adjacent locations using links
  const navigateToLink = useCallback(
    (link: google.maps.StreetViewLink) => {
      if (!panoramaInstanceRef.current) return;

      setIsLoading(true);
      const [lat, lng] = link.latLng.toString().replace('(', '').replace(')', '').split(',');
      const newLocation = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address: link.description || 'Adjacent location',
      };

      navigateToLocation(newLocation);
    },
    [navigateToLocation],
  );

  // Update view angles
  const updatePov = useCallback((heading: number, pitch: number) => {
    if (!panoramaInstanceRef.current) return;

    const newPov = {
      heading: (heading + 360) % 360,
      pitch: Math.max(-90, Math.min(90, pitch)),
    };

    panoramaInstanceRef.current.setPov(newPov);
  }, []);

  // Reset view to original position
  const resetView = useCallback(() => {
    if (!panoramaInstanceRef.current || !location.lat || !location.lng) return;

    setIsLoading(true);
    panoramaInstanceRef.current.setPosition(new google.maps.LatLng(location.lat, location.lng));
    panoramaInstanceRef.current.setPov({
      heading: options.heading || 0,
      pitch: options.pitch || 0,
    });
    panoramaInstanceRef.current.setZoom(options.zoom || 1);
    setIsLoading(false);
  }, [location, options]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setError(null);
    navigator.geolocation.getCurrentPosition(
      position => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        navigateToLocation(newLocation);
      },
      error => {
        console.error('Geolocation error:', error);
        setError('Unable to get your current location');
      },
    );
  }, [navigateToLocation]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls Panel */}
      {showControls && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Street View
              <Badge variant="outline" className="ml-auto">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Navigation Controls */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={getCurrentLocation}>
                <Navigation className="h-4 w-4 mr-2" />
                My Location
              </Button>

              <Button variant="outline" size="sm" onClick={resetView}>
                <Home className="h-4 w-4 mr-2" />
                Reset View
              </Button>

              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-4 w-4 mr-2" />
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Fullscreen
                  </>
                )}
              </Button>
            </div>

            {/* View Controls */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePov(-90, 0)}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePov(0, 15)}
                disabled={isLoading}
              >
                <RotateCw className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePov(90, 0)}
                disabled={isLoading}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePov(0, -15)}
                disabled={isLoading}
              >
                <RotateCw className="h-4 w-4 rotate-180" />
              </Button>
            </div>

            {/* Available Navigation Links */}
            {availableLinks.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Available Locations</label>
                <div className="grid grid-cols-1 gap-2">
                  {availableLinks.slice(0, 5).map((link, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToLink(link)}
                      disabled={isLoading}
                      className="justify-start text-left"
                    >
                      <Navigation className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {link.description || `Location ${index + 1}`}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="text-sm text-muted-foreground">
              {isLoading ? 'Loading...' : 'Ready to explore'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Street View may not be available in all locations. Try a nearby address or landmark.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Street View Panorama */}
      <Card className={`overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
        <CardContent className="p-0">
          <div
            ref={panoramaRef}
            className={`w-full ${isFullscreen ? 'h-full' : 'h-96 md:h-[500px]'} relative`}
          >
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Loading Street View...</p>
                </div>
              </div>
            )}

            {isLoading && isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-white p-3 rounded-lg shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm">Loading...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Exit Button */}
          {isFullscreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 z-10 bg-white/90"
            >
              <Minimize2 className="h-4 w-4 mr-2" />
              Exit Fullscreen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Location Information */}
      {currentLocation.address && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{currentLocation.address}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Street View utility component for property listings
export function PropertyStreetView({
  property,
  showControls = false,
  className = '',
}: {
  property: {
    latitude: number;
    longitude: number;
    address: string;
    title: string;
  };
  showControls?: boolean;
  className?: string;
}) {
  const location: StreetViewLocation = {
    lat: property.latitude,
    lng: property.longitude,
    address: property.address,
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Street View
        </CardTitle>
        <p className="text-sm text-muted-foreground">{property.title}</p>
      </CardHeader>
      <CardContent className="p-0">
        <StreetViewPanel
          location={location}
          showControls={showControls}
          options={{
            heading: 0,
            pitch: 0,
            zoom: 1,
          }}
        />
      </CardContent>
    </Card>
  );
}
