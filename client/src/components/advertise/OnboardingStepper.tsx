import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/tracking';

export interface Step {
  id: string;
  title: string;
  component: React.ReactNode;
}

export interface OnboardingStepperProps {
  steps: Step[];
  onComplete: () => void;
}

export function OnboardingStepper({ steps, onComplete }: OnboardingStepperProps) {
  const [currentStep, setCurrentStep] = useState(() => {
    try {
       const saved = localStorage.getItem('agent_funnel_step');
       return saved ? parseInt(saved, 10) : 0;
    } catch(e) {
       return 0;
    }
  });

  // Track event + preserve step
  useEffect(() => {
    try {
      localStorage.setItem('agent_funnel_step', currentStep.toString());
    } catch(e) {}
  }, [currentStep]);

  const handleNext = () => {
    trackEvent('onboarding_step_completed', { stepId: steps[currentStep].id, stepIndex: currentStep });
    if (currentStep < steps.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
    }
  };

  const reinforcementMsgs = [
    "Let's get your platform account set up.",
    "Great! You're 25% set up. Let's define your territory.",
    "You're 50% set up - almost ready to receive leads.",
    "Final step! Pick the plan that suits your volume."
  ];

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      {/* Reinforcement Copy */}
      <div className="text-center mb-8 px-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <h3 className="text-xl font-semibold text-slate-800">
          Step {currentStep + 1} of {steps.length} — {reinforcementMsgs[Math.min(currentStep, reinforcementMsgs.length - 1)]}
        </h3>
        <div className="w-full bg-slate-100 h-2 mt-4 rounded-full overflow-hidden max-w-sm mx-auto">
          <div 
            className="h-full bg-primary transition-all duration-700 ease-in-out" 
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Stepper Header */}
      <div className="flex items-center justify-between mb-12 relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10 translate-y-[-50%]"></div>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          return (
            <div key={step.id} className="flex flex-col items-center bg-transparent">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base border-4 transition-colors duration-300
                  ${
                    isActive
                      ? 'bg-primary border-primary/20 text-white shadow-lg shadow-primary/20'
                      : isCompleted
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-slate-200 text-slate-400'
                  }
                `}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span
                className={`text-sm mt-3 font-semibold transition-colors duration-300 ${
                  isActive ? 'text-primary' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-200 p-8 md:p-10 min-h-[400px] flex flex-col">
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {steps[currentStep].component}
        </div>

        {/* Footer Controls */}
        <div className="flex justify-between mt-12 pt-6 border-t border-slate-100">
          <Button variant="outline" size="lg" onClick={handleBack} disabled={currentStep === 0}>
            Back
          </Button>
          <Button size="lg" onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Complete Setup & Add First Listing' : 'Continue to Next Step'}
          </Button>
        </div>
      </div>
    </div>
  );
}
