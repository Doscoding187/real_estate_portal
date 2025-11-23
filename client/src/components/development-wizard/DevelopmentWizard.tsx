import { useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { ArrowLeft, ArrowRight, Home, Check } from 'lucide-react';
import React from 'react';

// Import steps
import { BasicDetailsStep } from './steps/BasicDetailsStep';
import { UnitTypesStep } from './steps/UnitTypesStep';
import { HighlightsStep } from './steps/HighlightsStep';
import { MediaUploadStep } from './steps/MediaUploadStep';
import { DeveloperInfoStep } from './steps/DeveloperInfoStep';
import { PreviewStep } from './steps/PreviewStep';

const steps = [
  { id: 0, title: 'Basic Details' },
  { id: 1, title: 'Unit Types' },
  { id: 2, title: 'Highlights' },
  { id: 3, title: 'Media' },
  { id: 4, title: 'Developer' },
  { id: 5, title: 'Preview' },
];

export function DevelopmentWizard() {
  const [, setLocation] = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const { currentStep, goToStep, nextStep, previousStep, reset } = useDevelopmentWizard();

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center relative">
          <Button 
            variant="ghost" 
            onClick={handleExit}
            className="absolute top-0 right-0 text-slate-500 hover:text-slate-700"
          >
            Exit
          </Button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            List a Development
          </h1>
          <p className="text-gray-600 text-lg">Create a listing for your residential development</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => goToStep(index)}
                      disabled={index > currentStep}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white cursor-pointer'
                          : isCurrent
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        stepNumber
                      )}
                    </button>
                    <span
                      className={`text-xs mt-2 text-center max-w-[80px] ${isCurrent ? 'font-semibold text-gray-900' : 'text-gray-500'}`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button 
              onClick={nextStep} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg gap-2"
            >
              Next Step
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
             // Submit button logic is inside PreviewStep, but we can have a placeholder or handle it here if needed.
             // For now, PreviewStep handles the submission, so we might hide the "Next" button or change it to "Submit" if we lift state up.
             // However, the original wizard had the submit button in the PreviewStep or as the final action.
             // In ListingWizard, the submit button is in the main component.
             // Let's keep it consistent with the previous DevelopmentWizard logic for now, 
             // but styled. The PreviewStep in DevelopmentWizard has its own submit button.
             // We can hide the main "Next" button on the last step.
             null
          )}
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
