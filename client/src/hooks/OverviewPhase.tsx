import React, { useState, KeyboardEvent } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { AlertCircle, Check, Plus, X, Info } from 'lucide-react';

export const OverviewPhase: React.FC = () => {
  const { 
    overview, 
    setOverview, 
    validatePhase, 
    setPhase 
  } = useDevelopmentWizard();

  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const [highlightInput, setHighlightInput] = useState('');

  // Status definitions
  const statuses = [
    { id: 'planning', label: 'Planning', description: 'Not yet broken ground' },
    { id: 'construction', label: 'Under Construction', description: 'Building in progress' },
    { id: 'near-completion', label: 'Near Completion', description: 'Finishing touches' },
    { id: 'completed', label: 'Completed', description: 'Ready for occupation' },
  ] as const;

  // Handlers
  const handleAddHighlight = () => {
    if (!highlightInput.trim()) return;
    
    const currentHighlights = overview.highlights || [];
    setOverview({
      highlights: [...currentHighlights, highlightInput.trim()]
    });
    setHighlightInput('');
  };

  const handleRemoveHighlight = (index: number) => {
    const newHighlights = [...(overview.highlights || [])];
    newHighlights.splice(index, 1);
    setOverview({ highlights: newHighlights });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddHighlight();
    }
  };

  const handleContinue = () => {
    const { isValid, errors } = validatePhase(3);
    
    if (isValid) {
      setLocalErrors([]);
      setPhase(4); // Proceed to Unit Types
    } else {
      setLocalErrors(errors);
      // Scroll to top to see errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Validation helpers for UI feedback
  const descriptionLength = overview.description?.length || 0;
  const isDescriptionValid = descriptionLength >= 50;
  
  const highlightsCount = overview.highlights?.length || 0;
  const isHighlightsValid = highlightsCount >= 3;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Development Overview</h2>
        <p className="text-lg text-gray-500">
          Tell the story of your development. This information appears prominently on the listing.
        </p>
      </div>

      {/* Error Banner */}
      {localErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Please fix the following issues:</h3>
            <ul className="mt-1 list-disc list-inside text-sm text-red-700 space-y-1">
              {localErrors.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Status Selection */}
      <section className="space-y-4">
        <label className="block text-sm font-medium text-gray-900">
          Construction Status
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statuses.map((status) => {
            const isSelected = overview.status === status.id;
            return (
              <button
                key={status.id}
                onClick={() => setOverview({ status: status.id as any })}
                className={`
                  relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-200
                  ${isSelected 
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex justify-between w-full">
                  <span className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {status.label}
                  </span>
                  {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                </div>
                <span className={`text-sm mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                  {status.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Description */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-900">
            Description
          </label>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            isDescriptionValid 
              ? 'bg-green-100 text-green-700' 
              : 'bg-amber-100 text-amber-700'
          }`}>
            {descriptionLength} / 50 characters
          </span>
        </div>
        
        <div className="relative">
          <textarea
            value={overview.description || ''}
            onChange={(e) => setOverview({ description: e.target.value })}
            placeholder="Describe the lifestyle, location, architectural style, and unique selling points of this development..."
            className={`
              w-full min-h-[200px] p-4 rounded-xl border text-gray-900 placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-y
              ${!isDescriptionValid && descriptionLength > 0 
                ? 'border-amber-300 focus:border-amber-500' 
                : 'border-gray-200 focus:border-blue-500'
              }
            `}
          />
          {!isDescriptionValid && descriptionLength > 0 && (
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs text-amber-600 bg-white/90 px-2 py-1 rounded-md shadow-sm backdrop-blur-sm">
              <Info className="w-3 h-3" />
              Keep typing...
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Write a compelling description that highlights what makes this development unique. This will be the main text displayed on the listing page.
        </p>
      </section>

      {/* Highlights */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-900">
            Key Highlights
          </label>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            isHighlightsValid 
              ? 'bg-green-100 text-green-700' 
              : 'bg-amber-100 text-amber-700'
          }`}>
            {highlightsCount} / 3 items required
          </span>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={highlightInput}
              onChange={(e) => setHighlightInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a highlight (e.g., 'No Transfer Duty', 'Backup Power', 'Gym')"
              className="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
          <button
            onClick={handleAddHighlight}
            disabled={!highlightInput.trim()}
            className="px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Highlights List */}
        <div className="space-y-2">
          {overview.highlights?.map((highlight, index) => (
            <div 
              key={index}
              className="group flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-medium">
                  {index + 1}
                </div>
                <span className="text-gray-700 font-medium">{highlight}</span>
              </div>
              <button
                onClick={() => handleRemoveHighlight(index)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Remove highlight"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {(!overview.highlights || overview.highlights.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-400">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="font-medium">No highlights added yet</p>
              <p className="text-sm mt-1">Add at least 3 key selling points to proceed</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer Actions */}
      <div className="flex items-center justify-end pt-6 border-t border-gray-100">
        <button
          onClick={handleContinue}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm hover:shadow-md"
        >
          Continue
        </button>
      </div>
    </div>
  );
};