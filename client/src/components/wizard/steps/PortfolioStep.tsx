/**
 * PortfolioStep Component
 * Third step of the developer registration wizard
 * Collects portfolio metrics and specializations
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 13.2
 */

import * as React from 'react';
import { TrendingUp, Building, Hammer, Zap } from 'lucide-react';
import { MetricGrid } from '../MetricGrid';
import { SpecializationCardGrid } from '../SpecializationCardGrid';
import { SpecializationBadge } from '../SpecializationBadge';
import { GradientInput } from '../../ui/GradientInput';
import { cn } from '@/lib/utils';
import type { Metric } from '../MetricGrid';
import type { Specialization } from '../SpecializationCardGrid';

export interface PortfolioData {
  completedProjects: number;
  currentProjects: number;
  upcomingProjects: number;
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
    const handleMetricChange = (field: keyof PortfolioData, value: string) => {
      const numValue = parseInt(value) || 0;
      onChange({ [field]: numValue });
    };

    const handleSpecializationChange = (selectedIds: string[]) => {
      onChange({ specializations: selectedIds });
    };

    const handleRemoveSpecialization = (id: string) => {
      const updated = data.specializations.filter(spec => spec !== id);
      onChange({ specializations: updated });
    };

    const metrics: Metric[] = [
      {
        id: 'completed',
        label: 'Completed Projects',
        value: data.completedProjects,
        icon: Building,
        variant: 'green',
        emptyMessage: 'Start building your portfolio',
      },
      {
        id: 'current',
        label: 'Current Projects',
        value: data.currentProjects,
        icon: Hammer,
        variant: 'blue',
        emptyMessage: 'Projects in development',
      },
      {
        id: 'upcoming',
        label: 'Upcoming Projects',
        value: data.upcomingProjects,
        icon: TrendingUp,
        variant: 'purple',
        emptyMessage: 'Future developments',
      },
    ];

    return (
      <div ref={ref} className={cn('space-y-8', className)}>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Portfolio & Expertise
          </h2>
          <p className="text-gray-600">Showcase your development experience and specializations</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Project Portfolio</h3>
          <p className="text-sm text-gray-600">Enter the number of projects in each category.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Completed Projects</label>
              <GradientInput
                type="number"
                min="0"
                placeholder="0"
                value={data.completedProjects.toString()}
                onChange={e => handleMetricChange('completedProjects', e.target.value)}
                error={errors?.completedProjects}
              />
              {errors?.completedProjects && (
                <p className="text-sm text-red-600">{errors.completedProjects}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Current Projects</label>
              <GradientInput
                type="number"
                min="0"
                placeholder="0"
                value={data.currentProjects.toString()}
                onChange={e => handleMetricChange('currentProjects', e.target.value)}
                error={errors?.currentProjects}
              />
              {errors?.currentProjects && (
                <p className="text-sm text-red-600">{errors.currentProjects}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Upcoming Projects</label>
              <GradientInput
                type="number"
                min="0"
                placeholder="0"
                value={data.upcomingProjects.toString()}
                onChange={e => handleMetricChange('upcomingProjects', e.target.value)}
                error={errors?.upcomingProjects}
              />
              {errors?.upcomingProjects && (
                <p className="text-sm text-red-600">{errors.upcomingProjects}</p>
              )}
            </div>
          </div>

          <MetricGrid metrics={metrics} />
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
            <strong>Portfolio Tip:</strong> Accurate project numbers help build trust with potential
            clients.
          </p>
        </div>
      </div>
    );
  },
);

PortfolioStep.displayName = 'PortfolioStep';
