/**
 * ContactInfoStep Component
 * Second step of the developer registration wizard
 * Collects contact information and logo upload
 * 
 * Requirements: 1.7, 1.8, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import * as React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { GradientInput } from '../../ui/GradientInput';
import { GradientSelect } from '../../ui/GradientSelect';
import { LogoUploadZone } from '../LogoUploadZone';
import { cn } from '@/lib/utils';

export interface ContactInfoData {
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  logo: string | null;
}

export interface ContactInfoStepProps {
  data: ContactInfoData;
  onChange: (data: Partial<ContactInfoData>) => void;
  errors?: Record<string, string>;
  uploadProgress?: number;
  uploading?: boolean;
  onLogoUpload?: (file: File | null) => void;
  className?: string;
}

const provinceOptions = [
  { value: 'western-cape', label: 'Western Cape' },
  { value: 'gauteng', label: 'Gauteng' },
  { value: 'kwazulu-natal', label: 'KwaZulu-Natal' },
  { value: 'eastern-cape', label: 'Eastern Cape' },
  { value: 'free-state', label: 'Free State' },
  { value: 'limpopo', label: 'Limpopo' },
  { value: 'mpumalanga', label: 'Mpumalanga' },
  { value: 'north-west', label: 'North West' },
  { value: 'northern-cape', label: 'Northern Cape' },
];

export const ContactInfoStep = React.forwardRef<HTMLDivElement, ContactInfoStepProps>(
  ({ data, onChange, errors, uploadProgress, uploading, onLogoUpload, className }, ref) => {
    const handleChange = (field: keyof ContactInfoData, value: string | null) => {
      onChange({ [field]: value });
    };

    const handleLogoChange = (file: File | null) => {
      onLogoUpload?.(file);
    };

    return (
      <div ref={ref} className={cn('space-y-6', className)}>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Contact Information
          </h2>
          <p className="text-gray-600">
            How can clients and partners reach you?
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Business Email *
              </label>
              <GradientInput
                type="email"
                placeholder="contact@yourcompany.com"
                value={data.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={errors?.email}
              />
              {errors?.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Phone Number *
              </label>
              <GradientInput
                type="tel"
                placeholder="+27 11 123 4567"
                value={data.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                error={errors?.phone}
              />
              {errors?.phone && (
                <p className="text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Business Address
            </label>
            <GradientInput
              type="text"
              placeholder="123 Business Street, Business Park"
              value={data.address}
              onChange={(e) => handleChange('address', e.target.value)}
              error={errors?.address}
            />
            {errors?.address && (
              <p className="text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                City *
              </label>
              <GradientInput
                type="text"
                placeholder="Cape Town"
                value={data.city}
                onChange={(e) => handleChange('city', e.target.value)}
                error={errors?.city}
              />
              {errors?.city && (
                <p className="text-sm text-red-600">{errors.city}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Province *
              </label>
              <GradientSelect
                placeholder="Select province"
                value={data.province}
                onValueChange={(value) => handleChange('province', value)}
                error={errors?.province}
              >
                {provinceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </GradientSelect>
              {errors?.province && (
                <p className="text-sm text-red-600">{errors.province}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Company Logo
            </label>
            <LogoUploadZone
              value={data.logo}
              onChange={handleLogoChange}
              error={errors?.logo}
              uploading={uploading}
              uploadProgress={uploadProgress}
              maxSizeMB={2}
              acceptedTypes={['image/svg+xml', 'image/png', 'image/jpeg']}
            />
            {errors?.logo && (
              <p className="text-sm text-red-600">{errors.logo}</p>
            )}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">
            <strong>Privacy:</strong> Your contact information will only be visible to verified clients and partners.
          </p>
        </div>
      </div>
    );
  }
);

ContactInfoStep.displayName = 'ContactInfoStep';
