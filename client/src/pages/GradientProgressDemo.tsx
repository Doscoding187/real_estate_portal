/**
 * GradientProgressIndicator Demo
 * Visual demonstration of the progress indicator component
 */

import { useState } from 'react';
import { GradientProgressIndicator } from '@/components/wizard/GradientProgressIndicator';
import { GradientButton } from '@/components/ui/GradientButton';
import {
  Building2,
  Phone,
  Briefcase,
  FileText,
  Home,
  User,
  CreditCard,
  CheckCircle,
} from 'lucide-react';

const wizardSteps = [
  { id: 1, title: 'Company Info', icon: Building2 },
  { id: 2, title: 'Contact', icon: Phone },
  { id: 3, title: 'Portfolio', icon: Briefcase },
  { id: 4, title: 'Review', icon: FileText },
];

const checkoutSteps = [
  { id: 1, title: 'Cart', icon: Home },
  { id: 2, title: 'Shipping', icon: User },
  { id: 3, title: 'Payment', icon: CreditCard },
  { id: 4, title: 'Confirm', icon: CheckCircle },
];

export default function GradientProgressDemo() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const [checkoutStep, setCheckoutStep] = useState(2);
  const [checkoutCompleted, setCheckoutCompleted] = useState<number[]>([1]);

  const handleNext = () => {
    if (currentStep < wizardSteps.length) {
      setCompletedSteps([...completedSteps, currentStep]);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setCompletedSteps(completedSteps.filter(id => id !== currentStep - 1));
    }
  };

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            GradientProgressIndicator
          </h1>
          <p className="text-gray-600">
            Visual progress tracker with gradient styling for multi-step wizards
          </p>
        </div>

        {/* Interactive Demo */}
        <section className="bg-white rounded-2xl p-8 shadow-lg space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Interactive Demo</h2>
            <p className="text-gray-600 mb-6">
              Click the buttons to navigate through steps. Completed steps are clickable.
            </p>
          </div>

          {/* Progress Indicator */}
          <GradientProgressIndicator
            steps={wizardSteps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />

          {/* Step Content */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                {React.createElement(wizardSteps[currentStep - 1].icon, { className: 'w-8 h-8' })}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {wizardSteps[currentStep - 1].title}
              </h3>
              <p className="text-gray-600">
                This is step {currentStep} of {wizardSteps.length}
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <GradientButton variant="outline" onClick={handleBack} disabled={currentStep === 1}>
              Back
            </GradientButton>

            <GradientButton variant="outline" onClick={handleReset}>
              Reset
            </GradientButton>

            <GradientButton
              variant="primary"
              onClick={handleNext}
              disabled={currentStep === wizardSteps.length}
            >
              {currentStep === wizardSteps.length ? 'Complete' : 'Next Step'}
            </GradientButton>
          </div>
        </section>

        {/* States Demo */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* All States */}
          <section className="bg-white rounded-2xl p-8 shadow-lg space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">All States</h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Initial State</h3>
                <GradientProgressIndicator
                  steps={wizardSteps}
                  currentStep={1}
                  completedSteps={[]}
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">In Progress</h3>
                <GradientProgressIndicator
                  steps={wizardSteps}
                  currentStep={2}
                  completedSteps={[1]}
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Almost Complete</h3>
                <GradientProgressIndicator
                  steps={wizardSteps}
                  currentStep={4}
                  completedSteps={[1, 2, 3]}
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">All Complete</h3>
                <GradientProgressIndicator
                  steps={wizardSteps}
                  currentStep={4}
                  completedSteps={[1, 2, 3, 4]}
                />
              </div>
            </div>
          </section>

          {/* Different Use Case */}
          <section className="bg-white rounded-2xl p-8 shadow-lg space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Checkout Flow</h2>
            <p className="text-sm text-gray-600">
              Example of a checkout process with different icons
            </p>

            <GradientProgressIndicator
              steps={checkoutSteps}
              currentStep={checkoutStep}
              completedSteps={checkoutCompleted}
              onStepClick={stepId => {
                if (checkoutCompleted.includes(stepId)) {
                  setCheckoutStep(stepId);
                }
              }}
            />

            <div className="flex gap-3">
              <GradientButton
                size="sm"
                variant="outline"
                onClick={() => {
                  if (checkoutStep > 1) {
                    setCheckoutStep(checkoutStep - 1);
                    setCheckoutCompleted(checkoutCompleted.filter(id => id !== checkoutStep - 1));
                  }
                }}
                disabled={checkoutStep === 1}
              >
                Previous
              </GradientButton>
              <GradientButton
                size="sm"
                variant="success"
                onClick={() => {
                  if (checkoutStep < checkoutSteps.length) {
                    setCheckoutCompleted([...checkoutCompleted, checkoutStep]);
                    setCheckoutStep(checkoutStep + 1);
                  }
                }}
                disabled={checkoutStep === checkoutSteps.length}
              >
                Continue
              </GradientButton>
            </div>
          </section>
        </div>

        {/* Features */}
        <section className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Features</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" />
                Gradient Styling
              </h3>
              <p className="text-sm text-gray-600 ml-4">
                Active steps use blue-to-indigo gradient, completed steps use green-to-emerald
                gradient
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600" />
                Smooth Animations
              </h3>
              <p className="text-sm text-gray-600 ml-4">
                300ms transitions for all state changes with scale and shadow effects
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-600" />
                Clickable Steps
              </h3>
              <p className="text-sm text-gray-600 ml-4">
                Completed steps can be clicked to navigate back, with hover effects
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600" />
                Responsive Design
              </h3>
              <p className="text-sm text-gray-600 ml-4">
                Full view on desktop, compact indicator on mobile devices
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600" />
                Accessibility
              </h3>
              <p className="text-sm text-gray-600 ml-4">
                ARIA labels, keyboard navigation, and screen reader support
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600" />
                Custom Icons
              </h3>
              <p className="text-sm text-gray-600 ml-4">
                Support for any Lucide icon, with checkmark for completed steps
              </p>
            </div>
          </div>
        </section>

        {/* Mobile Preview */}
        <section className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Mobile View</h2>
          <p className="text-gray-600 mb-6">
            Resize your browser to see the compact mobile view, or view this on a mobile device
          </p>

          <div className="max-w-sm mx-auto border-4 border-gray-300 rounded-2xl p-4 bg-gray-50">
            <GradientProgressIndicator steps={wizardSteps} currentStep={2} completedSteps={[1]} />
          </div>
        </section>
      </div>
    </div>
  );
}
