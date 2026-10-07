/**
 * PortfolioStep Component
 * Third step of the developer registration wizard
 * Collects organisation development specializations
 *
 */

import * as React from 'react';
import { Building, Hammer, Zap } from 'lucide-react';
import { SpecializationCardGrid } from '../SpecializationCardGrid';
import { SpecializationBadge } from '../SpecializationBadge';
import { cn } from '@/lib/utils';
import type { Specialization } from '../SpecializationCardGrid';

export interface PortfolioData {
  specializations: string[];
}

export interface PortfolioStepProps {
  data: PortfolioData;
  onChange: (data: Partial<PortfolioData>) => void;
  errors?: Record<string, string>;
  className?: string;
}

const availableSpecializations: Specialization[] = [
  {
    id: 'residential',
    label: 'Residential',
    description: 'Houses, apartments, townhouses',
    icon: Building,
  },
  {
    id: 'commercial',
    label: 'Commercial',
    description: 'Offices, retail, warehouses',
    icon: Building,
  },
  {
    id: 'mixed-use',
    label: 'Mixed-Use',
    description: 'Combined residential & commercial',
    icon: Building,
  },
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'High-end premium developments',
    icon: Zap,
  },
  {
    id: 'affordable',
    label: 'Affordable Housing',
    description: 'Budget-friendly developments',
    icon: Building,
  },
  {
    id: 'sustainable',
    label: 'Sustainable',
    description: 'Green & eco-friendly buildings',
    icon: Zap,
  },
  {
    id: 'renovation',
    label: 'Renovation',
    description: 'Refurbishment & restoration',
    icon: Hammer,
  },
  {
    id: 'industrial',
    label: 'Industrial',
    description: 'Factories, logistics centers',
    icon: Building,
  },
];

export const PortfolioStep = React.forwardRef<HTMLDivElement, PortfolioStepProps>(
  ({ data, onChange, errors, className }, ref) => {
    const handleSpecializationChange = (selectedIds: string[]) => {
      onChange({ specializations: selectedIds });
    };

    const handleRemoveSpecialization = (id: string) => {
      const updated = data.specializations.filter(spec => spec !== id);
      onChange({ specializations: updated });
    };

    return (
      <div ref={ref} className={cn('space-y-8', className)}>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Building className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Development Expertise
          </h2>
          <p className="text-gray-600">Choose your development specializations</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Development Specializations</h3>
          <p className="text-sm text-gray-600">
            Select your areas of expertise. Choose at least one specialization.
          </p>

          {data.specializations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Selected:</h4>
              <div className="flex flex-wrap gap-2">
                {data.specializations.map(specId => {
                  const spec = availableSpecializations.find(s => s.id === specId);
                  return spec ? (
                    <SpecializationBadge
                      key={spec.id}
                      id={spec.id}
                      label={spec.label}
                      icon={spec.icon}
                      onRemove={handleRemoveSpecialization}
                      variant="primary"
                    />
                  ) : null;
                })}
              </div>
            </div>
          )}

          <SpecializationCardGrid
            specializations={availableSpecializations}
            selectedIds={data.specializations}
            onSelectionChange={handleSpecializationChange}
            maxSelections={5}
            minSelections={1}
          />

          {errors?.specializations && (
            <p className="text-sm text-red-600">{errors.specializations}</p>
          )}
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-700">
            <strong>Company expertise:</strong> Choose the specialisations that accurately describe
            your organisation.
          </p>
        </div>
      </div>
    );
  },
);

PortfolioStep.displayName = 'PortfolioStep';
