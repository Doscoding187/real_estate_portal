/**
 * ReviewStep Component
 * Final step of the developer registration wizard
 * Displays all collected information for review and submission
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import * as React from 'react';
import { CheckCircle, Building2 } from 'lucide-react';
import { ReviewSection } from '../ReviewSection';
import { ReviewField } from '../ReviewField';
import { GradientCheckbox } from '../../ui/GradientCheckbox';
import { cn } from '@/lib/utils';
import type { BasicInfoData } from './BasicInfoStep';
import type { ContactInfoData } from './ContactInfoStep';
import type { PortfolioData } from './PortfolioStep';

export interface ReviewData {
  basicInfo: BasicInfoData;
  contactInfo: ContactInfoData;
  portfolio: PortfolioData;
  termsAccepted: boolean;
}

export interface ReviewStepProps {
  data: ReviewData;
  onTermsChange: (accepted: boolean) => void;
  onEditStep: (step: number) => void;
  submitting?: boolean;
  errors?: Record<string, string>;
  className?: string;
}

const formatCategory = (category: string): string => {
  const categoryMap: Record<string, string> = {
    residential: 'Residential Development',
    commercial: 'Commercial Development',
    mixed_use: 'Mixed-Use Development',
    industrial: 'Industrial Development',
  };
  return categoryMap[category] || category;
};

const formatProvince = (province: string): string => {
  const provinceMap: Record<string, string> = {
    'western-cape': 'Western Cape',
    gauteng: 'Gauteng',
    'kwazulu-natal': 'KwaZulu-Natal',
    'eastern-cape': 'Eastern Cape',
    'free-state': 'Free State',
    limpopo: 'Limpopo',
    mpumalanga: 'Mpumalanga',
    'north-west': 'North West',
    'northern-cape': 'Northern Cape',
  };
  return provinceMap[province] || province;
};

export const ReviewStep = React.forwardRef<HTMLDivElement, ReviewStepProps>(
  ({ data, onTermsChange, onEditStep, submitting, errors, className }, ref) => {
    const { basicInfo, contactInfo, portfolio, termsAccepted } = data;

    return (
      <div ref={ref} className={cn('space-y-6', className)}>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Review & Submit
          </h2>
          <p className="text-gray-600">Please review your information before submitting</p>
        </div>

        <div className="space-y-4">
          <ReviewSection
            title="Company Information"
            onEdit={() => onEditStep(0)}
            defaultCollapsed={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReviewField label="Company Name" value={basicInfo.name} type="text" />
              <ReviewField
                label="Primary Category"
                value={formatCategory(basicInfo.category)}
                type="text"
              />
              <ReviewField label="Established Year" value={basicInfo.establishedYear} type="text" />
              <ReviewField label="Website" value={basicInfo.website} type="text" />
            </div>
            <ReviewField label="Description" value={basicInfo.description} type="text" />
          </ReviewSection>

          <ReviewSection
            title="Contact Information"
            onEdit={() => onEditStep(1)}
            defaultCollapsed={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReviewField label="Business Email" value={contactInfo.email} type="text" />
              <ReviewField label="Phone Number" value={contactInfo.phone} type="text" />
              <ReviewField label="City" value={contactInfo.city} type="text" />
              <ReviewField
                label="Province"
                value={formatProvince(contactInfo.province)}
                type="text"
              />
            </div>
            <ReviewField label="Business Address" value={contactInfo.address} type="text" />
            {contactInfo.logo && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Company Logo</h4>
                <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                  <img
                    src={contactInfo.logo}
                    alt="Company logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </ReviewSection>

          <ReviewSection
            title="Portfolio & Expertise"
            onEdit={() => onEditStep(2)}
            defaultCollapsed={false}
          >
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Project Portfolio</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ReviewField
                    label="Completed Projects"
                    value={portfolio.completedProjects}
                    type="metric"
                  />
                  <ReviewField
                    label="Current Projects"
                    value={portfolio.currentProjects}
                    type="metric"
                  />
                  <ReviewField
                    label="Upcoming Projects"
                    value={portfolio.upcomingProjects}
                    type="metric"
                  />
                </div>
              </div>

              <ReviewField
                label="Development Specializations"
                value={portfolio.specializations}
                type="badge"
                icon={Building2}
              />
            </div>
          </ReviewSection>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Terms and Conditions</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>By submitting this application, you agree to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Provide accurate and truthful information</li>
                  <li>Comply with our platform terms of service</li>
                  <li>Allow verification of your company details</li>
                  <li>Maintain professional standards on the platform</li>
                  <li>Keep your profile information up to date</li>
                </ul>
              </div>

              <div className="flex items-start gap-3">
                <GradientCheckbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={onTermsChange}
                  disabled={submitting}
                />
                <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                  I agree to the terms and conditions and confirm that all information provided is
                  accurate *
                </label>
              </div>

              {errors?.terms && <p className="text-sm text-red-600">{errors.terms}</p>}
            </div>
          </div>
        </div>

        {submitting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm text-blue-700">Submitting your application... Please wait.</p>
            </div>
          </div>
        )}

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-sm text-emerald-700">
            <strong>What happens next?</strong> After submission, our team will review your
            application within 2-3 business days.
          </p>
        </div>
      </div>
    );
  },
);

ReviewStep.displayName = 'ReviewStep';
