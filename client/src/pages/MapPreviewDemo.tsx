/**
 * MapPreview Demo Page
 *
 * Demonstrates the map preview feature with location autocomplete
 */

import { useState } from 'react';
import { LocationAutocompleteWithMap } from '@/components/location/LocationAutocompleteWithMap';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MapPreviewDemo() {
  const [locationValue, setLocationValue] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Map Preview Demo</h1>
          <p className="text-slate-600 mt-2">
            Test the location autocomplete with map preview feature
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Location Selection</CardTitle>
            <CardDescription>
              Search for a location and see it on the map. Click the map to expand and adjust the
              marker.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LocationAutocompleteWithMap
              value={locationValue}
              onValueChange={setLocationValue}
              onLocationSelect={setSelectedLocation}
              placeholder="Search for a location..."
              showMapPreview={true}
              label="Select Location"
            />
          </CardContent>
        </Card>

        {selectedLocation && (
          <Card>
            <CardHeader>
              <CardTitle>Selected Location Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-100 p-4 rounded-lg overflow-auto">
                {JSON.stringify(selectedLocation, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
