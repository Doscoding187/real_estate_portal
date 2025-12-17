import React, { useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { CheckCircle, AlertTriangle, Save, UploadCloud, Users, Check } from 'lucide-react';

// Mock data for demonstration - in a real app, this would come from an API
const MOCK_AGENTS = [
  { id: 'agent-1', name: 'Sarah Jenkins', role: 'Lead Agent', avatar: 'SJ' },
  { id: 'agent-2', name: 'Mike Ross', role: 'Sales Associate', avatar: 'MR' },
  { id: 'agent-3', name: 'Jessica Pearson', role: 'Principal', avatar: 'JP' },
  { id: 'agent-4', name: 'Harvey Specter', role: 'Senior Broker', avatar: 'HS' },
];

export const FinalisationPhase: React.FC = () => {
  const { 
    finalisation, 
    setFinalisation, 
    validateForPublish, 
    publish, 
    saveDraft,
    developmentData 
  } = useDevelopmentWizard();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const handlePublish = async () => {
    setPublishErrors([]);
    setSuccessMessage('');
    
    // Run full validation across all phases
    const { isValid, errors } = validateForPublish();
    
    if (!isValid) {
      setPublishErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      await publish();
      setSuccessMessage('Development published successfully! Redirecting...');
      // In a real app, you would redirect here after a delay
    } catch (error) {
      setPublishErrors(['Failed to publish. Please try again later.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      await saveDraft();
      alert('Draft saved successfully');
    } catch (error) {
      alert('Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAgent = (agentId: string) => {
    const currentIds = finalisation.salesTeamIds || [];
    const newIds = currentIds.includes(agentId)
      ? currentIds.filter(id => id !== agentId)
      : [...currentIds, agentId];
    
    setFinalisation({ salesTeamIds: newIds });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Finalisation</h2>
        <p className="text-gray-500">Review your listing, assign a sales team, and publish to the portal.</p>
      </div>

      {/* Validation Errors */}
      {publishErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Cannot publish yet</h3>
            <ul className="mt-1 list-disc list-inside text-sm text-red-700 space-y-1">
              {publishErrors.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-800">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Sales Team Selection */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Assign Sales Team</h3>
        </div>
        <p className="text-sm text-gray-500">Select the agents who will receive leads for this development.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_AGENTS.map((agent) => {
            const isSelected = finalisation.salesTeamIds?.includes(agent.id);
            return (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                className={`
                  flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                  ${isSelected ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-600'}
                `}>
                  {agent.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{agent.name}</div>
                  <div className="text-xs text-gray-500">{agent.role}</div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-blue-600" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Marketing Company */}
      <section className="space-y-4 pt-6 border-t border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Marketing Details</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">Marketing Company (Optional)</label>
          <input
            type="text"
            value={finalisation.marketingCompany || ''}
            onChange={(e) => setFinalisation({ marketingCompany: e.target.value })}
            placeholder="e.g. Premier Real Estate Marketing"
            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row gap-4 pt-8 border-t border-gray-100">
        <button
          onClick={handleSaveDraft}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          Save Draft
        </button>
        
        <button
          onClick={handlePublish}
          disabled={isSubmitting}
          className={`
            flex-[2] flex items-center justify-center gap-2 px-6 py-4 text-white font-semibold rounded-xl transition-all shadow-sm
            ${isSubmitting 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
            }
          `}
        >
          <UploadCloud className="w-5 h-5" />
          {isSubmitting ? 'Publishing...' : 'Publish Development'}
        </button>
      </div>
    </div>
  );
};