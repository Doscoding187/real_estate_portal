import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MapPin, Home, Building, Key, Building2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchFormData {
  location: string;
  propertyType: string;
  listingType: 'buy' | 'rent';
  priceMin: string;
  priceMax: string;
}

export function ModernHeroSection() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<SearchFormData>({
    location: '',
    propertyType: 'all',
    listingType: 'buy',
    priceMin: '',
    priceMax: '',
  });

  const handleLocationChange = (value: string) => {
    setFormData(prev => ({ ...prev, location: value }));
  };

  const handlePropertyTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, propertyType: value }));
  };

  const handleListingTypeChange = (value: 'buy' | 'rent') => {
    setFormData(prev => ({ ...prev, listingType: value }));
  };

  const handlePriceChange = (field: 'priceMin' | 'priceMax', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    // Construct search URL based on form data
    const params = new URLSearchParams();

    if (formData.location) {
      params.set('location', formData.location);
    }

    if (formData.propertyType !== 'all') {
      params.set('propertyType', formData.propertyType);
    }

    if (formData.priceMin) {
      params.set('priceMin', formData.priceMin);
    }

    if (formData.priceMax) {
      params.set('priceMax', formData.priceMax);
    }

    const baseUrl = formData.listingType === 'buy' ? '/property-for-sale' : '/property-to-rent';
    const searchUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

    setLocation(searchUrl);
  };

  const popularLocations = [
    'Johannesburg',
    'Cape Town',
    'Durban',
    'Pretoria',
    'Port Elizabeth',
    'Bloemfontein',
  ];

  const propertyTypes = [
    { value: 'all', label: 'All Property Types', icon: Home },
    { value: 'house', label: 'House', icon: Home },
    { value: 'apartment', label: 'Apartment', icon: Building },
    { value: 'townhouse', label: 'Townhouse', icon: Building2 },
    { value: 'villa', label: 'Villa', icon: Home },
    { value: 'land', label: 'Land', icon: MapPin },
    { value: 'commercial', label: 'Commercial', icon: Building2 },
  ];

  const priceRanges = {
    buy: [
      { min: '', max: '500000', label: 'Under R 500,000' },
      { min: '500000', max: '1000000', label: 'R 500,000 - R 1,000,000' },
      { min: '1000000', max: '2000000', label: 'R 1,000,000 - R 2,000,000' },
      { min: '2000000', max: '5000000', label: 'R 2,000,000 - R 5,000,000' },
      { min: '5000000', max: '', label: 'Over R 5,000,000' },
    ],
    rent: [
      { min: '', max: '5000', label: 'Under R 5,000' },
      { min: '5000', max: '10000', label: 'R 5,000 - R 10,000' },
      { min: '10000', max: '20000', label: 'R 10,000 - R 20,000' },
      { min: '20000', max: '35000', label: 'R 20,000 - R 35,000' },
      { min: '35000', max: '', label: 'Over R 35,000' },
    ],
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-white to-slate-50 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232774AE' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative container mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight"
          >
            Your dream home is
            <span className="block text-blue-600 mt-2">just a search away</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto"
          >
            Discover thousands of properties for sale and rent across South Africa. From apartments
            to family homes, find your perfect match today.
          </motion.p>

          {/* Buy/Rent Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex rounded-lg bg-slate-100 p-1 mb-8"
          >
            <button
              onClick={() => handleListingTypeChange('buy')}
              className={`px-6 py-3 rounded-md font-semibold transition-all ${
                formData.listingType === 'buy'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Home className="inline-block w-4 h-4 mr-2" />
              Buy Property
            </button>
            <button
              onClick={() => handleListingTypeChange('rent')}
              className={`px-6 py-3 rounded-md font-semibold transition-all ${
                formData.listingType === 'rent'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Key className="inline-block w-4 h-4 mr-2" />
              Rent Property
            </button>
          </motion.div>
        </div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-6 lg:p-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            {/* Location Input */}
            <div className="lg:col-span-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <MapPin className="inline-block w-4 h-4 mr-1" />
                Location
              </label>
              <Input
                type="text"
                placeholder="Enter city, suburb, or area..."
                value={formData.location}
                onChange={e => handleLocationChange(e.target.value)}
                className="w-full h-12 text-base"
              />
            </div>

            {/* Property Type */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Building className="inline-block w-4 h-4 mr-1" />
                Property Type
              </label>
              <Select value={formData.propertyType} onValueChange={handlePropertyTypeChange}>
                <SelectTrigger className="w-full h-12 text-base">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map(type => {
                    const IconComponent = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">Price Range</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={formData.priceMin}
                  onChange={e => handlePriceChange('priceMin', e.target.value)}
                  className="h-12 text-base"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={formData.priceMax}
                  onChange={e => handlePriceChange('priceMax', e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            </div>

            {/* Search Button */}
            <div className="lg:col-span-2">
              <Button
                onClick={handleSearch}
                size="lg"
                className="w-full lg:w-auto h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all hover:shadow-lg"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Quick Price Selections */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-600 mb-3">Quick price ranges:</p>
            <div className="flex flex-wrap gap-2">
              {priceRanges[formData.listingType].map((range, index) => (
                <button
                  key={index}
                  onClick={() => {
                    handlePriceChange('priceMin', range.min);
                    handlePriceChange('priceMax', range.max);
                  }}
                  className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Popular Locations */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-4xl mx-auto mt-12 text-center"
        >
          <p className="text-sm text-slate-600 mb-4">Popular searches:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {popularLocations.map((location, index) => (
              <button
                key={index}
                onClick={() => handleLocationChange(location)}
                className="px-4 py-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-full text-sm font-medium text-slate-700 hover:text-blue-700 transition-all"
              >
                {location}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto mt-16"
        >
          {[
            { number: '50,000+', label: 'Properties' },
            { number: '100+', label: 'Cities' },
            { number: '1,000+', label: 'Agents' },
            { number: '4.8/5', label: 'User Rating' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-1">{stat.number}</div>
              <div className="text-sm text-slate-600">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
