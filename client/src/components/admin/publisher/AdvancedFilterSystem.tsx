import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  X,
  Plus,
  Calendar,
  MapPin,
  Home,
  DollarSign,
  Building2,
  Users,
  ChevronDown,
  Sliders,
  Save,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { publisherTheme, getStatusColor, animations, cardElevation } from '@/lib/publisherTheme';

interface FilterOption {
  id: string;
  label: string;
  value: any;
  count?: number;
}

interface FilterGroup {
  id: string;
  title: string;
  options: FilterOption[];
  type: 'single' | 'multiple' | 'range';
  icon?: React.ReactNode;
}

interface AdvancedFilterProps {
  filters: FilterGroup[];
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount: number;
  totalCount: number;
  onClearAll?: () => void;
  onSaveFilter?: () => void;
  savedFilters?: string[];
  onLoadSavedFilter?: (name: string) => void;
}

const FilterChip: React.FC<{
  filter: FilterOption;
  isActive: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}> = ({ filter, isActive, onToggle, onRemove }) => {
  return (
    <Badge
      className={cn(
        'px-3 py-1.5 text-sm font-medium cursor-pointer transition-all duration-200',
        'hover:scale-105 border-2',
        isActive 
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-blue-500 shadow-md' 
          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
      )}
      onClick={onToggle}
    >
      {filter.label}
      {filter.count && (
        <span className="ml-1.5 text-xs opacity-75">
          ({filter.count})
        </span>
      )}
      {onRemove && isActive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-blue-600 rounded-full p-0.5"
        >
          <X className="w-2 h-2" />
        </button>
      )}
    </Badge>
  );
};

const DateRangeFilter: React.FC<{
  startDate?: string;
  endDate?: string;
  onChange: (start: string, end: string) => void;
}> = ({ startDate, endDate, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={startDate}
        onChange={(e) => onChange(e.target.value, endDate)}
        className="w-40 h-9 text-sm"
        placeholder="Start date"
      />
      <span className="text-gray-400">to</span>
      <Input
        type="date"
        value={endDate}
        onChange={(e) => onChange(startDate, e.target.value)}
        className="w-40 h-9 text-sm"
        placeholder="End date"
      />
    </div>
  );
};

const PriceRangeFilter: React.FC<{
  minPrice?: number;
  maxPrice?: number;
  onChange: (min: number, max: number) => void;
}> = ({ minPrice, maxPrice, onChange }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 w-12">Min:</span>
        <Input
          type="number"
          value={minPrice || ''}
          onChange={(e) => onChange(parseInt(e.target.value) || 0, maxPrice || 0)}
          className="h-9 text-sm"
          placeholder="0"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 w-12">Max:</span>
        <Input
          type="number"
          value={maxPrice || ''}
          onChange={(e) => onChange(minPrice || 0, parseInt(e.target.value) || 0)}
          className="h-9 text-sm"
          placeholder="Any"
        />
      </div>
    </div>
  </div>
  );
};

export const AdvancedFilterSystem: React.FC<AdvancedFilterProps> = ({
  filters,
  activeFilters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
  resultCount,
  totalCount,
  onClearAll,
  onSaveFilter,
  savedFilters,
  onLoadSavedFilter
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);

  const activeFilterCount = useMemo(() => {
    return Object.keys(activeFilters).filter(key => {
      const value = activeFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).some(k => value[k]);
      return value !== undefined && value !== '' && value !== null;
    }).length;
  }, [activeFilters]);

  const handleFilterChange = useCallback((filterId: string, value: any) => {
    const newFilters = { ...activeFilters };
    if (Array.isArray(value)) {
      const current = newFilters[filterId] || [];
      const index = current.indexOf(value);
      if (index > -1) {
        newFilters[filterId] = current.filter((_, i) => i !== index);
      } else {
        newFilters[filterId] = [...current, value];
      }
    } else {
      newFilters[filterId] = value;
    }
    onFiltersChange(newFilters);
  }, [activeFilters, onFiltersChange]);

  const clearFilter = useCallback((filterId: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterId];
    onFiltersChange(newFilters);
  }, [activeFilters, onFiltersChange]);

  const renderFilterContent = (filter: FilterGroup) => {
    switch (filter.type) {
      case 'range':
        if (filter.id === 'dateRange') {
          return (
            <DateRangeFilter
              startDate={activeFilters[filter.id]?.start}
              endDate={activeFilters[filter.id]?.end}
              onChange={(start, end) => handleFilterChange(filter.id, { start, end })}
            />
          );
        }
        if (filter.id === 'priceRange') {
          return (
            <PriceRangeFilter
              minPrice={activeFilters[filter.id]?.min}
              maxPrice={activeFilters[filter.id]?.max}
              onChange={(min, max) => handleFilterChange(filter.id, { min, max })}
            />
          );
        }
        break;

      case 'multiple':
        return (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {filter.options.map(option => (
              <FilterChip
                key={option.id}
                filter={option}
                isActive={Array.isArray(activeFilters[filter.id]) && activeFilters[filter.id].includes(option.value)}
                onToggle={() => handleFilterChange(filter.id, option.value)}
                onRemove={() => {
                  const current = activeFilters[filter.id] || [];
                  const newCurrent = current.filter((v: any) => v !== option.value);
                  onFiltersChange({ ...activeFilters, [filter.id]: newCurrent });
                }}
              />
            ))}
          </div>
        );

      case 'single':
      default:
        return (
          <div className="space-y-1">
            {filter.options.map(option => (
              <label
                key={option.id}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors duration-200',
                  activeFilters[filter.id] === option.value
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'hover:bg-gray-50 border-gray-200'
                )}
              >
                <input
                  type="radio"
                  name={filter.id}
                  value={option.value}
                  checked={activeFilters[filter.id] === option.value}
                  onChange={() => handleFilterChange(filter.id, option.value)}
                  className="sr-only"
                />
                <span className="text-sm">{option.label}</span>
                {option.count && (
                  <span className="text-xs text-gray-500 ml-auto">
                    ({option.count})
                  </span>
                )}
              </label>
            ))}
          </div>
        );
    }
  };

  return (
    <Card className={cn('border-0 shadow-lg', cardElevation.medium)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            Advanced Filters
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Saved Filters */}
            {savedFilters && savedFilters.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {savedFilters.map((savedName, index) => (
                    <DropdownMenuItem
                      key={savedName}
                      onClick={() => onLoadSavedFilter?.(savedName)}
                      className="cursor-pointer"
                    >
                      {savedName}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowSavedFilters(!showSavedFilters)}
                    className="cursor-pointer"
                  >
                    {showSavedFilters ? 'Hide Saved' : 'Show All'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Active Filter Count */}
            {activeFilterCount > 0 && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                {activeFilterCount} active
              </Badge>
            )}

            {/* Clear All */}
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="h-8 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search across all fields..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-12 h-11 text-base border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter Results Summary */}
        {(resultCount !== totalCount || activeFilterCount > 0) && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">
              Showing {resultCount} of {totalCount} results
              {activeFilterCount > 0 && (
                <span className="font-semibold">
                  {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
                </span>
              )}
            </span>
            {onSaveFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveFilter}
                className="h-8 gap-1.5 text-blue-600 hover:bg-blue-50"
              >
                <Save className="w-3.5 h-3.5" />
                Save Filter
              </Button>
            )}
          </div>
        )}

        {/* Filter Groups */}
        <div className={cn(
          'space-y-6 transition-all duration-300',
          isExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-0 overflow-hidden'
        )}>
          {filters.map((filter, index) => (
            <div
              key={filter.id}
              className={cn(
                'space-y-3 p-4 rounded-xl border-2 transition-all duration-200',
                'border-gray-100 hover:border-blue-200',
                animations.fadeIn,
                `animate-stagger-${index + 1}`
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                {filter.icon || <Filter className="w-4 h-4 text-gray-600" />}
                <h4 className="font-semibold text-gray-800">{filter.title}</h4>
                {activeFilters[filter.id] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter(filter.id)}
                    className="h-6 w-6 p-0 hover:bg-red-50"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </Button>
                )}
              </div>
              {renderFilterContent(filter)}
            </div>
          ))}
        </div>

        {/* Toggle Filters */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 transition-colors duration-200"
          >
            {isExpanded ? 'Hide Filters' : 'Show Advanced Filters'}
            <ChevronDown className={cn(
              'w-4 h-4 transition-transform duration-200',
              isExpanded ? 'rotate-180' : ''
            )} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};