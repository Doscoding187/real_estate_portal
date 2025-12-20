import { Button } from '@/components/ui/button';
import { Home, Heart, Shield, Wifi, Zap } from 'lucide-react';
import type { PropertyFilters } from '../../../shared/types';
import { cn } from '@/lib/utils';

/**
 * Quick filter preset definitions for South African property market
 * Requirements: 2.2
 */
export const QUICK_FILTER_PRESETS = {
  PET_FRIENDLY: {
    id: 'pet-friendly',
    label: 'Pet-Friendly',
    icon: Heart,
    filters: {
      petFriendly: true,
    } as Partial<PropertyFilters>,
  },
  FIBRE_READY: {
    id: 'fibre-ready',
    label: 'Fibre Ready',
    icon: Wifi,
    filters: {
      fibreReady: true,
    } as Partial<PropertyFilters>,
  },
  SECTIONAL_TITLE: {
    id: 'sectional-title',
    label: 'Sectional Title',
    icon: Home,
    filters: {
      titleType: ['sectional'],
    } as Partial<PropertyFilters>,
  },
  UNDER_R2M: {
    id: 'under-r2m',
    label: 'Under R2M',
    icon: Zap,
    filters: {
      maxPrice: 2000000,
    } as Partial<PropertyFilters>,
  },
  SECURITY_ESTATE: {
    id: 'security-estate',
    label: 'Security Estate',
    icon: Shield,
    filters: {
      securityEstate: true,
    } as Partial<PropertyFilters>,
  },
} as const;

export interface QuickFiltersProps {
  onFilterSelect: (filters: Partial<PropertyFilters>) => void;
  activeFilters: PropertyFilters;
  className?: string;
}

/**
 * Check if a quick filter preset is currently active
 */
const isPresetActive = (
  preset: typeof QUICK_FILTER_PRESETS[keyof typeof QUICK_FILTER_PRESETS],
  activeFilters: PropertyFilters
): boolean => {
  const presetFilters = preset.filters;
  
  // Check each filter in the preset
  for (const [key, value] of Object.entries(presetFilters)) {
    const filterKey = key as keyof PropertyFilters;
    const activeValue = activeFilters[filterKey];
    
    // Handle array comparisons (e.g., titleType)
    if (Array.isArray(value)) {
      if (!Array.isArray(activeValue)) return false;
      if (value.length !== activeValue.length) return false;
      if (!value.every((v) => activeValue.includes(v))) return false;
    }
    // Handle boolean and number comparisons
    else if (activeValue !== value) {
      return false;
    }
  }
  
  return true;
};

/**
 * QuickFilters Component
 * 
 * Displays preset filter buttons for common South African property searches.
 * Provides one-click access to popular filter combinations like Pet-Friendly,
 * Fibre Ready, Sectional Title, Under R2M, and Security Estate.
 * 
 * Features:
 * - SA-specific preset filters
 * - Active state styling
 * - Icon-based visual indicators
 * - Responsive layout
 * 
 * Requirements: 2.2
 */
export function QuickFilters({ onFilterSelect, activeFilters, className }: QuickFiltersProps) {
  const presets = Object.values(QUICK_FILTER_PRESETS);
  
  const handlePresetClick = (preset: typeof QUICK_FILTER_PRESETS[keyof typeof QUICK_FILTER_PRESETS]) => {
    const isActive = isPresetActive(preset, activeFilters);
    
    if (isActive) {
      // If preset is active, clear its filters
      const clearedFilters: Partial<PropertyFilters> = {};
      for (const key of Object.keys(preset.filters)) {
        clearedFilters[key as keyof PropertyFilters] = undefined as any;
      }
      onFilterSelect(clearedFilters);
    } else {
      // Apply the preset filters
      onFilterSelect(preset.filters);
    }
  };
  
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {presets.map((preset) => {
        const Icon = preset.icon;
        const isActive = isPresetActive(preset, activeFilters);
        
        return (
          <Button
            key={preset.id}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(preset)}
            className={cn(
              'flex items-center gap-2 transition-all',
              isActive && 'bg-primary text-primary-foreground shadow-md',
              !isActive && 'hover:bg-accent hover:text-accent-foreground'
            )}
            data-testid={`quick-filter-${preset.id}`}
            data-active={isActive}
          >
            <Icon className="h-4 w-4" />
            <span>{preset.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
