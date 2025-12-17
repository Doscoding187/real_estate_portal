import React, { useEffect } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { PhaseIndicator } from './PhaseIndicator';
import { useAutoSave } from '@/hooks/useAutoSave';
import { developmentService } from '@/services/developmentService';
import { Cloud, Check, Loader2, AlertCircle, Eye } from 'lucide-react';

// Import Phases
import { IdentityPhase } from './phases/IdentityPhase';
import { ClassificationPhase } from './phases/ClassificationPhase';
import { OverviewPhase } from './phases/OverviewPhase';
import { UnitTypesPhase } from './phases/UnitTypesPhase';
import { FinalisationPhase } from './phases/FinalisationPhase';
import { PublishSuccess } from './PublishSuccess';

export const WizardContainer: React.FC = () => {
  const wizardState = useDevelopmentWizard();
  const { currentPhase, setPhase, reset } = wizardState;

  // Extract only the data we want to persist (exclude functions)
  const dataToSave = {
    developmentData: wizardState.developmentData,
    classification: wizardState.classification,
    overview: wizardState.overview,
    unitTypes: wizardState.unitTypes,
    finalisation: wizardState.finalisation,
    currentPhase: wizardState.currentPhase
  };

  const { status, lastSavedAt } = useAutoSave(dataToSave, {
    onSave: developmentService.saveDraft,
    debounceMs: 3000 // Wait 3 seconds after typing stops
  });

  const handlePreview = () => {
    // Store the current state in localStorage for the preview window to access
    localStorage.setItem('development_preview_data', JSON.stringify(dataToSave));
    window.open('/development/preview', '_blank');
  };

  // Render Success Page if published
  if (wizardState.finalisation.isPublished) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Development Published</h1>
          </div>
        </div>
        <main className="max-w-7xl mx-auto px-4 mt-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[600px]">
            <PublishSuccess />
          </div>
        </main>
      </div>
    );
  }

  const renderPhase = () => {
    switch (currentPhase) {
      case 1:
        return <IdentityPhase />;
      case 2:
        return <ClassificationPhase />;
      case 3:
        return <OverviewPhase />;
      case 4:
        return <UnitTypesPhase />;
      case 5:
        return <FinalisationPhase />;
      default:
        return <IdentityPhase />;
    }
  };

  const renderSaveStatus = () => {
    switch (status) {
      case 'saving':
        return (
          <div className="flex items-center gap-2 text-blue-600 text-sm font-medium animate-in fade-in">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Saving draft...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium animate-in fade-in">
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">Saved {lastSavedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600 text-sm font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Save Failed</span>
          </div>
        );
      case 'unsaved':
        return (
          <div className="flex items-center gap-2 text-gray-400 text-sm font-medium animate-in fade-in">
            <Cloud className="w-4 h-4" />
            <span className="hidden sm:inline">Unsaved changes</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Add New Development</h1>
          </div>
          
          <div className="flex gap-4">
            {/* Auto-save Status Indicator */}
            <div className="flex items-center px-4 border-r border-gray-100 mr-2">
              {renderSaveStatus()}
            </div>

            <button
              onClick={handlePreview}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>

            <button 
              onClick={() => {
                if (confirm('Are you sure you want to start over? All unsaved progress will be lost.')) {
                  reset();
                }
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Reset Form
            </button>
          </div>
        </div>
      </div>

      <PhaseIndicator currentPhase={currentPhase} />

      <main className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[600px]">
          {renderPhase()}
        </div>
      </main>
    </div>
  );
};