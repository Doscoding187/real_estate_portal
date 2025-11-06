import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Province {
  id: number;
  name: string;
  code: string;
  latitude?: string;
  longitude?: string;
}

interface City {
  id: number;
  name: string;
  provinceId: number;
  provinceName?: string;
  latitude?: string;
  longitude?: string;
  isMetro?: number;
}

interface Suburb {
  id: number;
  name: string;
  cityId: number;
  cityName?: string;
  provinceName?: string;
  latitude?: string;
  longitude?: string;
  postalCode?: string;
}

interface LocationHierarchyFilterProps {
  onSelectionChange: (selection: {
    provinceId?: number;
    cityId?: number;
    suburbId?: number;
  }) => void;
  className?: string;
  showSuburbs?: boolean;
}

export function LocationHierarchyFilter({
  onSelectionChange,
  className,
  showSuburbs = true,
}: LocationHierarchyFilterProps) {
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedSuburb, setSelectedSuburb] = useState<Suburb | null>(null);

  // Fetch provinces
  const { data: provinces } = trpc.location.getLocationHierarchy.useQuery({
    depth: 'province',
  });

  // Fetch cities when province is selected
  const { data: cities } = trpc.location.getLocationHierarchy.useQuery(
    {
      depth: 'city',
      provinceId: selectedProvince?.id,
    },
    {
      enabled: !!selectedProvince?.id,
    },
  );

  // Fetch suburbs when city is selected
  const { data: suburbs } = trpc.location.getLocationHierarchy.useQuery(
    {
      depth: 'suburb',
      cityId: selectedCity?.id,
    },
    {
      enabled: !!selectedCity?.id && showSuburbs,
    },
  );

  const handleProvinceChange = (provinceId: string) => {
    const province = provinces?.find(p => p.id.toString() === provinceId);
    setSelectedProvince(province || null);
    setSelectedCity(null);
    setSelectedSuburb(null);

    onSelectionChange({
      provinceId: province?.id,
    });
  };

  const handleCityChange = (cityId: string) => {
    const city = cities?.find(c => c.id.toString() === cityId);
    setSelectedCity(city || null);
    setSelectedSuburb(null);

    onSelectionChange({
      provinceId: selectedProvince?.id,
      cityId: city?.id,
    });
  };

  const handleSuburbChange = (suburbId: string) => {
    const suburb = suburbs?.find(s => s.id.toString() === suburbId);
    setSelectedSuburb(suburb || null);

    onSelectionChange({
      provinceId: selectedProvince?.id,
      cityId: selectedCity?.id,
      suburbId: suburb?.id,
    });
  };

  const clearSelection = () => {
    setSelectedProvince(null);
    setSelectedCity(null);
    setSelectedSuburb(null);
    onSelectionChange({});
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" />
          Location Filter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Province Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Province</label>
          <Select
            value={selectedProvince?.id.toString() || ''}
            onValueChange={handleProvinceChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a province" />
            </SelectTrigger>
            <SelectContent>
              {provinces?.map(province => (
                <SelectItem key={province.id} value={province.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{province.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {province.code}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City Selection */}
        {selectedProvince && (
          <div className="space-y-2">
            <label className="text-sm font-medium">City</label>
            <Select value={selectedCity?.id.toString() || ''} onValueChange={handleCityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a city" />
              </SelectTrigger>
              <SelectContent>
                {cities?.map(city => (
                  <SelectItem key={city.id} value={city.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{city.name}</span>
                      {city.isMetro === 1 && (
                        <Badge variant="secondary" className="text-xs">
                          Metro
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Suburb Selection */}
        {selectedCity && showSuburbs && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Suburb</label>
            <Select value={selectedSuburb?.id.toString() || ''} onValueChange={handleSuburbChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a suburb" />
              </SelectTrigger>
              <SelectContent>
                {suburbs?.map(suburb => (
                  <SelectItem key={suburb.id} value={suburb.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{suburb.name}</span>
                      {suburb.postalCode && (
                        <Badge variant="outline" className="text-xs">
                          {suburb.postalCode}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Current Selection Summary */}
        {(selectedProvince || selectedCity || selectedSuburb) && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Selection</label>
            <div className="flex flex-wrap gap-2">
              {selectedProvince && (
                <Badge variant="default" className="gap-1">
                  {selectedProvince.name}
                  <button
                    onClick={() => handleProvinceChange('')}
                    className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedCity && (
                <Badge variant="default" className="gap-1">
                  {selectedCity.name}
                  <button
                    onClick={() => handleCityChange('')}
                    className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedSuburb && (
                <Badge variant="default" className="gap-1">
                  {selectedSuburb.name}
                  <button
                    onClick={() => handleSuburbChange('')}
                    className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Clear Button */}
        {(selectedProvince || selectedCity || selectedSuburb) && (
          <Button variant="outline" size="sm" onClick={clearSelection} className="w-full">
            Clear Selection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
