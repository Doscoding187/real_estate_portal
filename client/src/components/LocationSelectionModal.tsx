import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Search } from 'lucide-react';

interface LocationSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onLocationSelected: (city: string, suburb?: string) => void;
  propertyType: string;
  listingType: 'sale' | 'rent';
}

const allSouthAfricanCities = [
  'Johannesburg',
  'Cape Town',
  'Durban',
  'Pretoria',
  'Port Elizabeth',
  'Bloemfontein',
  'East London',
  'Pietermaritzburg',
  'Kimberley',
  'Polokwane',
  'Nelspruit',
  'Rustenburg',
  'George',
  'Midrand',
  'Centurion',
  'Sandton',
  'Soweto',
  'Benoni',
  'Boksburg',
  'Germiston',
  'Roodepoort',
  'Randburg',
  'Krugersdorp',
  'Vereeniging',
  'Vanderbijlpark',
  'Springs',
  'Alberton',
  'Uitenhage',
  'Paarl',
  'Stellenbosch',
  'Somerset West',
  'Mitchells Plain',
  'Khayelitsha',
  'Umlazi',
  'Phoenix',
  'Chatsworth',
  'Newcastle',
  'Richards Bay',
  'Welkom',
  'Klerksdorp',
  'Potchefstroom',
  'Virginia',
  'Orkney',
  'Bethlehem',
  'Sasolburg',
  'Kroonstad',
];

const popularSuburbs: Record<string, string[]> = {
  Johannesburg: ['Sandton', 'Rosebank', 'Fourways', 'Randburg', 'Midrand'],
  'Cape Town': ['Sea Point', 'Camps Bay', 'Constantia', 'Claremont', 'Bellville'],
  Durban: ['Umhlanga', 'Ballito', 'Westville', 'Morningside', 'Glenwood'],
  Pretoria: ['Centurion', 'Hatfield', 'Menlyn', 'Brooklyn', 'Waterkloof'],
};

export function LocationSelectionModal({
  open,
  onClose,
  onLocationSelected,
  propertyType,
  listingType,
}: LocationSelectionModalProps) {
  const [citySearch, setCitySearch] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [suburbSearch, setSuburbSearch] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setCitySearch(city);
    setShowCitySuggestions(false);
    setSuburbSearch('');
  };

  const handleCityInputChange = (value: string) => {
    setCitySearch(value);
    setSelectedCity(value);
    setShowCitySuggestions(value.length > 0);
  };

  const handleContinue = () => {
    if (selectedCity.trim()) {
      // Save to localStorage
      localStorage.setItem(
        'lastSearchLocation',
        JSON.stringify({
          city: selectedCity,
          suburb: suburbSearch || undefined,
          timestamp: Date.now(),
        }),
      );

      onLocationSelected(selectedCity, suburbSearch || undefined);
      onClose();
    }
  };

  const filteredCities = citySearch
    ? allSouthAfricanCities
        .filter(city => city.toLowerCase().includes(citySearch.toLowerCase()))
        .slice(0, 8)
    : allSouthAfricanCities.slice(0, 8);

  const filteredSuburbs =
    selectedCity && popularSuburbs[selectedCity]
      ? popularSuburbs[selectedCity].filter(s =>
          s.toLowerCase().includes(suburbSearch.toLowerCase()),
        )
      : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Where are you looking to {listingType === 'sale' ? 'buy' : 'rent'}?
          </DialogTitle>
          <DialogDescription>
            Enter a city and optionally a suburb to find {propertyType.toLowerCase()} in your
            preferred area.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* City Search */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              City or Town
            </h3>
            <Input
              placeholder="Type a city name (e.g., Johannesburg, Cape Town)..."
              value={citySearch}
              onChange={e => handleCityInputChange(e.target.value)}
              onFocus={() => setShowCitySuggestions(true)}
              className="mb-2"
            />

            {showCitySuggestions && filteredCities.length > 0 && (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2 bg-slate-50">
                {filteredCities.map(city => (
                  <Button
                    key={city}
                    variant="outline"
                    size="sm"
                    className="justify-start hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => handleCitySelect(city)}
                  >
                    {city}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Suburb Search */}
          {selectedCity && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-600" />
                Suburb or Area (Optional)
              </h3>
              <Input
                placeholder="Search for a suburb..."
                value={suburbSearch}
                onChange={e => setSuburbSearch(e.target.value)}
                className="mb-3"
              />

              {filteredSuburbs.length > 0 && (
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {filteredSuburbs.map(suburb => (
                    <Button
                      key={suburb}
                      variant="outline"
                      size="sm"
                      className="justify-start hover:bg-blue-50 hover:border-blue-300"
                      onClick={() => setSuburbSearch(suburb)}
                    >
                      {suburb}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedCity}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Continue to Results
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
