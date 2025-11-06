import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  Search,
  Filter,
  Layers,
  Navigation,
  BarChart3,
  Target,
  Home,
  Globe,
} from 'lucide-react';
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';
import { LocationHierarchyFilter } from '@/components/location/LocationHierarchyFilter';
import { PropertyMap } from '@/components/location/PropertyMap';
import { trpc } from '@/lib/trpc';

interface Property {
  id: number;
  title: string;
  price: number;
  propertyType: string;
  listingType: string;
  bedrooms?: number;
  bathrooms?: number;
  latitude: string;
  longitude: string;
  mainImage?: string;
  city: string;
  province: string;
}

export default function LocationIntelligence() {
  const [activeTab, setActiveTab] = useState('map');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [locationFilter, setLocationFilter] = useState({
    provinceId: undefined as number | undefined,
    cityId: undefined as number | undefined,
    suburbId: undefined as number | undefined,
  });

  // Fetch heatmap data for density visualization
  const { data: heatmapData } = trpc.location.getPropertyHeatmap.useQuery({
    bounds: {
      north: -25.5,
      south: -26.8,
      east: 28.5,
      west: 27.4,
    },
    gridSize: 15,
  });

  // Calculate distance between two points
  const { data: distanceData } = trpc.location.calculateDistance.useQuery(
    {
      from: { latitude: -26.2041, longitude: 28.0473 }, // Johannesburg
      to: { latitude: -33.9249, longitude: 18.4241 }, // Cape Town
      unit: 'km',
    },
    { enabled: false }, // Only calculate on demand
  );

  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location);
  };

  const handleLocationFilterChange = (selection: typeof locationFilter) => {
    setLocationFilter(selection);
  };

  const handlePropertySelect = (property: Property) => {
    // Handle property selection - could navigate to property detail page
    console.log('Selected property:', property);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Globe className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Location Intelligence</h1>
              <p className="text-muted-foreground">
                Smart, location-aware property search and discovery
              </p>
            </div>
            <Badge variant="secondary" className="ml-2">
              Phase 5
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Property Map
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Location Search
            </TabsTrigger>
            <TabsTrigger value="filters" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Hierarchy Filters
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Location Tools
            </TabsTrigger>
          </TabsList>

          {/* Property Map Tab */}
          <TabsContent value="map" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Map Controls */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Search</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <LocationAutocomplete
                      onLocationSelect={handleLocationSelect}
                      placeholder="Search any location..."
                      type="all"
                    />

                    <div className="text-sm text-muted-foreground">
                      {selectedLocation && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>Selected: {selectedLocation.name}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Map Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Properties for Sale</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Properties for Rent</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>High Density Areas</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Interactive Map */}
              <div className="lg:col-span-3">
                <PropertyMap
                  onPropertySelect={handlePropertySelect}
                  showFilters={true}
                  height="700px"
                />
              </div>
            </div>
          </TabsContent>

          {/* Location Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Smart Location Search
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LocationAutocomplete
                    onLocationSelect={handleLocationSelect}
                    placeholder="Search provinces, cities, suburbs..."
                    type="all"
                  />

                  <LocationAutocomplete
                    onLocationSelect={handleLocationSelect}
                    placeholder="Search cities only..."
                    type="city"
                  />

                  <LocationAutocomplete
                    onLocationSelect={handleLocationSelect}
                    placeholder="Search suburbs only..."
                    type="suburb"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Search Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedLocation ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-semibold">{selectedLocation.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {selectedLocation.type}
                          </p>
                        </div>
                      </div>

                      {selectedLocation.provinceName && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Province: </span>
                          <span>{selectedLocation.provinceName}</span>
                        </div>
                      )}

                      {selectedLocation.latitude && selectedLocation.longitude && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Coordinates: </span>
                          <span>
                            {selectedLocation.latitude}, {selectedLocation.longitude}
                          </span>
                        </div>
                      )}

                      <div className="pt-3">
                        <Button className="w-full">
                          <Navigation className="h-4 w-4 mr-2" />
                          View on Map
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Search for a location to see details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Hierarchy Filters Tab */}
          <TabsContent value="filters" className="space-y-4">
            <LocationHierarchyFilter
              onSelectionChange={handleLocationFilterChange}
              showSuburbs={true}
            />

            {locationFilter.provinceId || locationFilter.cityId || locationFilter.suburbId ? (
              <Card>
                <CardHeader>
                  <CardTitle>Filter Applied</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {locationFilter.provinceId && (
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Province ID: {locationFilter.provinceId}</Badge>
                      </div>
                    )}
                    {locationFilter.cityId && (
                      <div className="flex items-center gap-2">
                        <Badge variant="default">City ID: {locationFilter.cityId}</Badge>
                      </div>
                    )}
                    {locationFilter.suburbId && (
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Suburb ID: {locationFilter.suburbId}</Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    This selection can be used to filter property searches and map views.
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Property Density</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{heatmapData?.length || 0}</div>
                    <p className="text-sm text-muted-foreground">Areas with property listings</p>
                    <Badge variant="outline">Heatmap Data Points</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Coverage Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">9</div>
                    <p className="text-sm text-muted-foreground">Provinces covered</p>
                    <Badge variant="outline">South Africa</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Search Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">&lt;100ms</div>
                    <p className="text-sm text-muted-foreground">Average search time</p>
                    <Badge variant="outline">Optimized</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Location Hierarchy Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">9</div>
                    <div className="text-sm text-muted-foreground">Provinces</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">50+</div>
                    <div className="text-sm text-muted-foreground">Major Cities</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">500+</div>
                    <div className="text-sm text-muted-foreground">Suburbs</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Tools Tab */}
          <TabsContent value="tools" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-5 w-5" />
                    Distance Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Calculate distances between locations
                  </p>

                  <div className="space-y-3">
                    <div className="text-sm">
                      <strong>Johannesburg → Cape Town:</strong>
                      <br />
                      <span className="text-muted-foreground">Approximately 1,400 km</span>
                    </div>

                    <div className="text-sm">
                      <strong>Durban → Pretoria:</strong>
                      <br />
                      <span className="text-muted-foreground">Approximately 570 km</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Target className="h-4 w-4 mr-2" />
                    Calculate Custom Distance
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Reverse Geocoding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Get address from coordinates</p>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Example:</strong>
                      <br />
                      <span className="font-mono text-xs">-26.2041, 28.0473</span>
                      <br />
                      <span className="text-muted-foreground">→ Johannesburg, Gauteng</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <MapPin className="h-4 w-4 mr-2" />
                    Try Reverse Geocoding
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Agent Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Define and visualize agent service areas
                  </p>

                  <div className="space-y-2">
                    <div className="text-sm">
                      • Draw custom coverage polygons
                      <br />
                      • Set radius-based service areas
                      <br />• Assign multiple agents per area
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Manage Coverage Areas
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Market Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Location-based market insights</p>

                  <div className="space-y-2">
                    <div className="text-sm">
                      • Property price trends by area
                      <br />
                      • Demand heatmaps
                      <br />• Average days on market
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
