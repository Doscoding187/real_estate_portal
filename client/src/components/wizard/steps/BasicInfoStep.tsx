/**
 * BasicInfoStep Component
 * First step of the developer registration wizard
 * Collects basic company information with gradient styling
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import * as React from 'react';
import { Building2, Globe, Calendar } from 'lucide-react';
import { GradientInput } from '../../ui/GradientInput';
import { GradientTextarea } from '../../ui/GradientTextarea';
import { GradientSelect, GradientSelectItem } from '../../ui/GradientSelect';
import { OptimizedSelect } from '@/components/ui/OptimizedSelect';
import { cn } from '@/lib/utils';

export interface BasicInfoData {
  name: string;
  description: string;
  category: string;
  establishedYear: number | null;
  website: string;
}

export interface BasicInfoStepProps {
  /**
   * Current form data
   */
  data: BasicInfoData;
  /**
   * Callback when data changes
   */
  onChange: (data: Partial<BasicInfoData>) => void;
  /**
   * Validation errors
   */
  errors?: Record<string, string>;
  /**
   * Additional className
   */
  className?: string;
}

const categoryOptions = [
  { value: 'residential', label: 'Residential Development' },
  { value: 'commercial', label: 'Commercial Development' },
  { value: 'mixed_use', label: 'Mixed-Use Development' },
  { value: 'industrial', label: 'Industrial Development' },
];

// Generate year options (current year back to 1950)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1949 }, (_, i) => {
  const year = currentYear - i;
  return { value: year.toString(), label: year.toString() };
});

export const BasicInfoStep = React.forwardRef<HTMLDivElement, BasicInfoStepProps>(
  ({ data, onChange, errors, className }, ref) => {
    const handleChange = (field: keyof BasicInfoData, value: string | number | null) => {
      onChange({ [field]: value });
    };

    return (
      <div ref={ref} className={cn('space-y-6', className)}>
        {/* Step Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Company Information
          </h2>
          <p className="text-gray-600">Tell us about your development company</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Company Name *</label>
            <GradientInput
              type="text"
              placeholder="Enter your company name"
              value={data.name}
              onChange={e => handleChange('name', e.target.value)}
              error={errors?.name}
            />
            {errors?.name && <p className="text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Company Description</label>
            <GradientTextarea
              placeholder="Describe your company's focus and expertise..."
              value={data.description}
              onChange={e => handleChange('description', e.target.value)}
              error={errors?.description}
              rows={4}
            />
            {errors?.description && <p className="text-sm text-red-600">{errors.description}</p>}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Primary Development Category *
            </label>
            <GradientSelect
              placeholder="Select your primary focus"
              value={data.category}
              onValueChange={value => handleChange('category', value)}
              error={errors?.category}
            >
              {categoryOptions.map(option => (
                <GradientSelectItem key={option.value} value={option.value}>
                  {option.label}
                </GradientSelectItem>
              ))}
            </GradientSelect>
            {errors?.category && <p className="text-sm text-red-600">{errors.category}</p>}
          </div>

          {/* Two-column layout for remaining fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Established Year */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Established Year</label>
              <GradientSelect
                placeholder="Select year"
                value={data.establishedYear?.toString() || ''}
                onValueChange={value =>
                  handleChange('establishedYear', value ? parseInt(value) : null)
                }
                error={errors?.establishedYear}
              >
                {yearOptions.map(option => (
                  <GradientSelectItem key={option.value} value={option.value}>
                    {option.label}
                  </GradientSelectItem>
                ))}
              </GradientSelect>
              {errors?.establishedYear && (
                <p className="text-sm text-red-600">{errors.establishedYear}</p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Website</label>
              <GradientInput
                type="url"
                placeholder="https://yourcompany.com"
                value={data.website}
                onChange={e => handleChange('website', e.target.value)}
                error={errors?.website}
              />
              {errors?.website && <p className="text-sm text-red-600">{errors.website}</p>}
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Provide accurate information as this will be displayed on your
            public profile and used for verification.
          </p>
        </div>
      </div>
    );
  },
);

BasicInfoStep.displayName = 'BasicInfoStep';
