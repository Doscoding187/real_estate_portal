import { useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLocation } from 'wouter';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Import steps
import { BasicDetailsStep } from './steps/BasicDetailsStep';
import { UnitTypesStep } from './steps/UnitTypesStep';
import { HighlightsStep } from './steps/HighlightsStep';
import { MediaUploadStep } from './steps/MediaUploadStep';
import { DeveloperInfoStep } from './steps/DeveloperInfoStep';
import { PreviewStep } from './steps/PreviewStep';

const steps = [
  { id: 0, title: 'Basic Details', description: 'Development information' },
  { id: 1, title: 'Unit Types', description: 'Add unit types & pricing' },
  { id: 2, title: 'Highlights', description: 'Features & amenities' },
  { id: 3, title: 'Media', description: 'Upload photos & videos' },
  { id: 4, title: 'Developer Info', description: 'Contact details' },
  { id: 5, title: 'Preview & Submit', description: 'Review and publish' },
];

export function DevelopmentWizard() {
  const [, setLocation] = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const { currentStep, goToStep, nextStep, previousStep, reset } = useDevelopmentWizard();

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    reset();
    setLocation('/');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicDetailsStep />;
      case 1:
        return <UnitTypesStep />;
      case 2:
        return <HighlightsStep />;
      case 3:
        return <MediaUploadStep />;
      case 4:
        return <DeveloperInfoStep />;
      case 5:
        return <PreviewStep />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">List a Development</h1>
              <p className="text-slate-600 mt-1">Create a listing for your residential development</p>
            </div>
            <Button variant="outline" onClick={handleExit}>
              Exit
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-700">
                Step {currentStep + 1} of {steps.length}: {currentStepData.title}
              </span>
              <span className="text-slate-500">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps Indicator */}
          <div className="mt-6 flex justify-between">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`flex-1 text-center px-2 py-3 border-b-2 transition-colors ${
                  index === currentStep
                    ? 'border-blue-600 text-blue-600'
                    : index < currentStep
                    ? 'border-green-500 text-green-600 hover:border-green-600'
                    : 'border-slate-200 text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className="text-xs font-semibold mb-1">{step.title}</div>
                <div className="text-xs hidden md:block">{step.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 mb-6">
          {renderStep()}
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={currentStep === 0}
            size="lg"
          >
            Previous
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button onClick={nextStep} size="lg">
              Next Step
            </Button>
          ) : null}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Development Wizard?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved as a draft. You can continue later from where you left off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
