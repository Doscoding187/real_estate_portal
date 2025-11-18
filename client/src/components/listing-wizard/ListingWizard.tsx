/**
 * Smart Listing Creation Wizard - Main Component
 *
 * Multi-step wizard for creating property listings
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle } from 'lucide-react';

// Import wizard steps
import ActionStep from './steps/ActionStep';
import PropertyTypeStep from './steps/PropertyTypeStep';
import BadgesStep from './steps/BadgesStep';
import PropertyDetailsStep from './steps/PropertyDetailsStep';
import BasicInfoStep from './steps/BasicInfoStep';
import PricingStep from './steps/PricingStep';
import LocationStep from './steps/LocationStep';
import MediaUploadStep from './steps/MediaUploadStep';
import PreviewStep from './steps/PreviewStep';

const TOTAL_STEPS = 9;

const STEP_TITLES = [
  'What are you doing?',
  'Property Type',
  'Listing Badges',
  'Property Details',
  'Basic Information',
  'Pricing Details',
  'Location',
  'Media Upload',
  'Preview & Submit',
];

const ListingWizard: React.FC = () => {
  const store: any = useListingWizardStore();
  const currentStep: number = store.currentStep;
  const completedSteps: number[] = store.completedSteps;
  const goToStep = store.goToStep;
  const nextStep = store.nextStep;
  const prevStep = store.prevStep;
  const markStepComplete = store.markStepComplete;
  const validate = store.validate;
  const errors: any[] = store.errors;

  const handleNext = () => {
    if (validate()) {
      markStepComplete(currentStep);
      nextStep();
    }
  };

  const handlePrevious = () => {
    prevStep();
  };

  const progress = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ActionStep />;
      case 2:
        return <PropertyTypeStep />;
      case 3:
        return <BadgesStep />;
      case 4:
        return <PropertyDetailsStep />;
      case 5:
        return <BasicInfoStep />;
      case 6:
        return <PricingStep />;
      case 7:
        return <LocationStep />;
      case 8:
        return <MediaUploadStep />;
      case 9:
        return <PreviewStep />;
      default:
        return <ActionStep />;
    }
  };

  const isStepComplete = (step: number) => completedSteps.includes(step);
  const isStepAccessible = (step: number) => {
    const maxStep = Math.max(...completedSteps, currentStep);
    return step <= maxStep + 1;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Listing</h1>
          <p className="text-gray-600">Follow the steps below to create your property listing</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span className="text-sm text-gray-600">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {STEP_TITLES.map((title, index) => {
              const stepNumber = index + 1;
              const isComplete = isStepComplete(stepNumber);
              const isCurrent = currentStep === stepNumber;
              const isAccessible = isStepAccessible(stepNumber);

              return (
                <button
                  key={stepNumber}
                  onClick={() => isAccessible && goToStep(stepNumber)}
                  disabled={!isAccessible}
                  className={`flex flex-col items-center gap-2 transition-all ${
                    isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  {/* Circle indicator */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isComplete
                        ? 'bg-green-500 border-green-500'
                        : isCurrent
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    ) : (
                      <span
                        className={`text-sm font-bold ${
                          isCurrent ? 'text-white' : 'text-gray-600'
                        }`}
                      >
                        {stepNumber}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-xs text-center max-w-[100px] hidden md:block ${
                      isCurrent ? 'font-bold text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    {title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{STEP_TITLES[currentStep - 1]}</CardTitle>
            <CardDescription>
              {currentStep === 1 &&
                'Select whether you want to sell, rent, or auction your property'}
              {currentStep === 2 && 'Choose the type of property you want to list'}
              {currentStep === 3 && 'Select optional badges to highlight your property features'}
              {currentStep === 4 && 'Provide detailed information about your property'}
              {currentStep === 5 && 'Provide basic information about your property'}
              {currentStep === 6 && 'Enter pricing and financial details'}
              {currentStep === 7 && 'Pin your property location on the map'}
              {currentStep === 8 && 'Upload images, videos, and documents'}
              {currentStep === 9 && 'Review your listing before submitting'}
            </CardDescription>
          </CardHeader>
          <CardContent>{renderStep()}</CardContent>
        </Card>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-red-800 font-semibold mb-2">Please fix the following errors:</h4>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error: any, index: number) => (
                <li key={index} className="text-red-700 text-sm">
                  {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6"
          >
            Previous
          </Button>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => useListingWizardStore.getState().saveDraft()}>
              Save Draft
            </Button>

            {currentStep < TOTAL_STEPS ? (
              <Button onClick={handleNext} className="px-8">
                Next Step
              </Button>
            ) : (
              <Button
                onClick={() => useListingWizardStore.getState().submitForReview()}
                className="px-8 bg-green-600 hover:bg-green-700"
              >
                Submit for Review
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingWizard;
