import React from 'react';
import { Check } from 'lucide-react';

interface PhaseIndicatorProps {
  currentPhase: number;
  totalPhases?: number;
}

const PHASES = ['Identity', 'Classification', 'Overview', 'Units', 'Finalise'];

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
  currentPhase,
  totalPhases = 5,
}) => {
  return (
    <div className="w-full py-6 bg-white border-b border-gray-100 mb-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="relative flex items-center justify-between">
          {/* Progress Bar Background */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full -z-10" />

          {/* Active Progress Bar */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full -z-10 transition-all duration-500 ease-in-out"
            style={{ width: `${((currentPhase - 1) / (totalPhases - 1)) * 100}%` }}
          />

          {PHASES.map((label, index) => {
            const step = index + 1;
            const isActive = step === currentPhase;
            const isCompleted = step < currentPhase;

            return (
              <div key={step} className="flex flex-col items-center gap-2 bg-white px-2">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300
                    ${isActive ? 'border-blue-600 bg-blue-600 text-white scale-110' : ''}
                    ${isCompleted ? 'border-blue-600 bg-blue-600 text-white' : ''}
                    ${!isActive && !isCompleted ? 'border-gray-200 text-gray-400 bg-white' : ''}
                  `}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step}
                </div>
                <span
                  className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
