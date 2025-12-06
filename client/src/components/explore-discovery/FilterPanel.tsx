/**
 * Filter Panel Component
 * Dynamic filter panel with property type detection
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { X, SlidersHorizontal } from 'lucide-react';
import {
  PropertyType,
  ResidentialFilters,
  DevelopmentFilters,
  LandFilters,
} from '@/hooks/usePropertyFilters';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  propertyType: PropertyType;
  onPropertyTypeChange: (type: PropertyType) => void;
  priceMin?: number;
  priceMax?: number;
  onPriceChange: (min?: number, max?: number) => void;
  residentialFilters?: ResidentialFilters;
  onResidentialFiltersChange: (filters: Partial<ResidentialFilters>) => void;
  developmentFilters?: DevelopmentFilters;
  onDevelopmentFiltersChange: (filters: Partial<DevelopmentFilters>) => void;
  landFilters?: LandFilters;
  onLandFiltersChange: (filters: Partial<LandFilters>) => void;
  filterCount: number;
  onClearAll: () => void;
}

export function FilterPanel({
  isOpen,
  onClose,
  propertyType,
  onPropertyTypeChange,
  priceMin,
  priceMax,
  onPriceChange,
  residentialFilters,
  onResidentialFiltersChange,
  developmentFilters,
  onDevelopmentFiltersChange,
  landFilters,
  onLandFiltersChange,
  filterCount,
  onClearAll,
}: FilterPanelProps) {
  if (!isOpen) return null;

  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'all', label: 'All Properties' },
    { value: 'residential', label: 'Residential' },
    { value: 'development', label: 'Developments' },
    { value: 'land', label: 'Land' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-900">Filters</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close filters"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {filterCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {filterCount} filter{filterCount !== 1 ? 's' : ''} active
              </span>
              <button
                onClick={onClearAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-8">
          {/* Property Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Property Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {propertyTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => onPropertyTypeChange(type.value)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    propertyType === type.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Price Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Min Price</label>
                <input
                  type="number"
                  value={priceMin || ''}
                  onChange={(e) => onPriceChange(e.target.value ? Number(e.target.value) : undefined, priceMax)}
                  placeholder="No min"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Max Price</label>
                <input
                  type="number"
                  value={priceMax || ''}
                  onChange={(e) => onPriceChange(priceMin, e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="No max"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Residential Filters */}
          {propertyType === 'residential' && (
            <ResidentialFilterSection
              filters={residentialFilters || {}}
              onChange={onResidentialFiltersChange}
            />
          )}

          {/* Development Filters */}
          {propertyType === 'development' && (
            <DevelopmentFilterSection
              filters={developmentFilters || {}}
              onChange={onDevelopmentFiltersChange}
            />
          )}

          {/* Land Filters */}
          {propertyType === 'land' && (
            <LandFilterSection
              filters={landFilters || {}}
              onChange={onLandFiltersChange}
            />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Show Results
          </button>
        </div>
      </div>
    </>
  );
}

// Residential Filter Section
function ResidentialFilterSection({
  filters,
  onChange,
}: {
  filters: ResidentialFilters;
  onChange: (updates: Partial<ResidentialFilters>) => void;
}) {
  const bedOptions = [1, 2, 3, 4, 5];
  const bathOptions = [1, 2, 3, 4];
  const parkingOptions = [1, 2, 3, 4];
  const securityLevels = ['Basic', 'Standard', 'High', 'Maximum'];

  const toggleArrayValue = (array: number[] | undefined, value: number) => {
    if (!array) return [value];
    if (array.includes(value)) {
      return array.filter((v) => v !== value);
    }
    return [...array, value];
  };

  const toggleStringArrayValue = (array: string[] | undefined, value: string) => {
    if (!array) return [value];
    if (array.includes(value)) {
      return array.filter((v) => v !== value);
    }
    return [...array, value];
  };

  return (
    <div className="space-y-6">
      {/* Bedrooms */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Bedrooms
        </label>
        <div className="flex flex-wrap gap-2">
          {bedOptions.map((num) => (
            <button
              key={num}
              onClick={() => onChange({ beds: toggleArrayValue(filters.beds, num) })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                filters.beds?.includes(num)
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {num}+
            </button>
          ))}
        </div>
      </div>

      {/* Bathrooms */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Bathrooms
        </label>
        <div className="flex flex-wrap gap-2">
          {bathOptions.map((num) => (
            <button
              key={num}
              onClick={() => onChange({ baths: toggleArrayValue(filters.baths, num) })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                filters.baths?.includes(num)
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {num}+
            </button>
          ))}
        </div>
      </div>

      {/* Parking */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Parking Spaces
        </label>
        <div className="flex flex-wrap gap-2">
          {parkingOptions.map((num) => (
            <button
              key={num}
              onClick={() => onChange({ parking: toggleArrayValue(filters.parking, num) })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                filters.parking?.includes(num)
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {num}+
            </button>
          ))}
        </div>
      </div>

      {/* Security Level */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Security Level
        </label>
        <div className="grid grid-cols-2 gap-2">
          {securityLevels.map((level) => (
            <button
              key={level}
              onClick={() => onChange({ securityLevel: toggleStringArrayValue(filters.securityLevel, level) })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                filters.securityLevel?.includes(level)
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Pet Friendly */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.petFriendly || false}
            onChange={(e) => onChange({ petFriendly: e.target.checked })}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900">Pet-Friendly</span>
        </label>
      </div>

      {/* Furnished */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.furnished || false}
            onChange={(e) => onChange({ furnished: e.target.checked })}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900">Furnished</span>
        </label>
      </div>
    </div>
  );
}

// Development Filter Section
function DevelopmentFilterSection({
  filters,
  onChange,
}: {
  filters: DevelopmentFilters;
  onChange: (updates: Partial<DevelopmentFilters>) => void;
}) {
  const launchStatuses = ['Pre-Launch', 'Launching Soon', 'Now Selling', 'Final Phase'];
  const phases = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];
  const unitConfigs = ['Studio', '1 Bed', '2 Bed', '3 Bed', '4+ Bed', 'Penthouse'];

  const toggleArrayValue = (array: string[] | undefined, value: string) => {
    if (!array) return [value];
    if (array.includes(value)) {
      return array.filter((v) => v !== value);
    }
    return [...array, value];
  };

  return (
    <div className="space-y-6">
      {/* Launch Status */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Launch Status
        </label>
        <div className="grid grid-cols-2 gap-2">
          {launchStatuses.map((status) => (
            <button
              key={status}
              onClick={() => onChange({ launchStatus: toggleArrayValue(filters.launchStatus, status) })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                filters.launchStatus?.includes(status)
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Phase */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Development Phase
        </label>
        <div className="grid grid-cols-2 gap-2">
          {phases.map((phase) => (
            <button
              key={phase}
              onClick={() => onChange({ phase: toggleArrayValue(filters.phase, phase) })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                filters.phase?.includes(phase)
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>

      {/* Unit Configurations */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Unit Configurations
        </label>
        <div className="grid grid-cols-2 gap-2">
          {unitConfigs.map((config) => (
            <button
              key={config}
              onClick={() => onChange({ unitConfigurations: toggleArrayValue(filters.unitConfigurations, config) })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                filters.unitConfigurations?.includes(config)
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {config}
            </button>
          ))}
        </div>
      </div>

      {/* Developer Offers */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.developerOffers || false}
            onChange={(e) => onChange({ developerOffers: e.target.checked })}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900">Has Developer Offers</span>
        </label>
      </div>
    </div>
  );
}

// Land Filter Section
function LandFilterSection({
  filters,
  onChange,
}: {
  filters: LandFilters;
  onChange: (updates: Partial<LandFilters>) => void;
}) {
  const zoningTypes = ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Mixed Use'];
  const utilityOptions = ['Water', 'Electricity', 'Sewage', 'Gas', 'Fiber Internet'];
  const surveyStatuses = ['Surveyed', 'Not Surveyed', 'Survey in Progress'];

  const toggleArrayValue = (array: string[] | undefined, value: string) => {
    if (!array) return [value];
    if (array.includes(value)) {
      return array.filter((v) => v !== value);
    }
    return [...array, value];
  };

  return (
    <div className="space-y-6">
      {/* Zoning */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Zoning
        </label>
        <div className="grid grid-cols-2 gap-2">
          {zoningTypes.map((zone) => (
            <button
              key={zone}
              onClick={() => onChange({ zoning: toggleArrayValue(filters.zoning, zone) })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                filters.zoning?.includes(zone)
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {/* Utilities */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Available Utilities
        </label>
        <div className="space-y-2">
          {utilityOptions.map((utility) => (
            <label key={utility} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.utilities?.includes(utility) || false}
                onChange={(e) => {
                  const newUtilities = e.target.checked
                    ? toggleArrayValue(filters.utilities, utility)
                    : filters.utilities?.filter((u) => u !== utility) || [];
                  onChange({ utilities: newUtilities.length > 0 ? newUtilities : undefined });
                }}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">{utility}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Size Range */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Land Size (sqm)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Min Size</label>
            <input
              type="number"
              value={filters.sizeMin || ''}
              onChange={(e) => onChange({ sizeMin: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="No min"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Max Size</label>
            <input
              type="number"
              value={filters.sizeMax || ''}
              onChange={(e) => onChange({ sizeMax: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="No max"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Survey Status */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Survey Status
        </label>
        <div className="grid grid-cols-2 gap-2">
          {surveyStatuses.map((status) => (
            <button
              key={status}
              onClick={() => onChange({ surveyStatus: toggleArrayValue(filters.surveyStatus, status) })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                filters.surveyStatus?.includes(status)
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
