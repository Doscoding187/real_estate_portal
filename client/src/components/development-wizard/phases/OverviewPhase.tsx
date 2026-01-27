import React, { useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Sparkles, CheckCircle2, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WizardData } from '@/lib/types/wizard-workflows';

export function OverviewPhase() {
  const { developmentData, saveWorkflowStepData, stepData: allStepData } = useDevelopmentWizard();

  const [highlightInput, setHighlightInput] = useState('');

  // READ STRATEGY: Prefer canonical step data, fallback to legacy
  const marketingData = allStepData?.marketing_summary || {};
  const currentTagline = marketingData.tagline ?? developmentData.subtitle ?? '';
  const currentDescription = marketingData.description ?? developmentData.description ?? '';
  const currentHighlights = marketingData.keySellingPoints ?? developmentData.highlights ?? [];

  // Helper to persist to 'marketing_summary'
  // We use developmentData (merged) for reading, but ensure we write back to the correct step bucket.
  const handleUpdate = (
    updates: Partial<WizardData> & { keySellingPoints?: string[]; tagline?: string },
  ) => {
    // Current step data foundation
    const currentStepData = allStepData?.marketing_summary || {};

    // canonical mapping: if UI sends 'subtitle', map to 'tagline'
    // if UI sends 'highlights', map to 'keySellingPoints'
    const payload: any = { ...updates };

    if (updates.subtitle !== undefined) {
      payload.tagline = updates.subtitle;
      delete payload.subtitle;
    }

    if (updates.highlights !== undefined) {
      payload.keySellingPoints = updates.highlights;
      delete payload.highlights;
    }

    saveWorkflowStepData('marketing_summary', {
      ...currentStepData,
      ...payload,
    } as any);
  };

  const handleAddHighlight = () => {
    if (!highlightInput.trim()) return;

    // Use the derived currentHighlights for check
    if (currentHighlights.some(h => h.toLowerCase() === highlightInput.trim().toLowerCase())) {
      toast.error('Highlight already exists');
      return;
    }

    const newHighlights = [...currentHighlights, highlightInput.trim()];
    handleUpdate({ highlights: newHighlights });
    setHighlightInput('');
  };

  const handleRemoveHighlight = (index: number) => {
    const newHighlights = [...currentHighlights];
    newHighlights.splice(index, 1);
    handleUpdate({ highlights: newHighlights });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Marketing Summary</h2>
        <p className="text-slate-600">
          Create compelling content to attract buyers. This will be the first thing they see.
        </p>
      </div>

      <div className="grid gap-8">
        {/* Core Marketing Content */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Megaphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">Listing Content</CardTitle>
                <CardDescription>
                  Define how your development appears in search results.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Tagline */}
            <div className="space-y-3">
              <Label className="text-slate-900 font-medium">
                Tagline <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. Where coastal luxury meets modern living"
                value={currentTagline}
                onChange={e => handleUpdate({ subtitle: e.target.value })}
                maxLength={100}
                className="h-11 border-slate-200 focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 text-right">{currentTagline.length} / 100</p>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label className="text-slate-900 font-medium">
                Development Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Describe the lifestyle, location benefits, and unique selling points..."
                className="min-h-[200px] border-slate-200 focus:border-blue-500 resize-y"
                value={currentDescription}
                onChange={e => handleUpdate({ description: e.target.value })}
              />
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-md border border-slate-100">
                <div className="flex items-center gap-2">
                  {currentDescription.length < 50 ? (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      ⚠️ Too short (min 50)
                    </span>
                  ) : currentDescription.length < 150 ? (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      ℹ️ Good start (aim for 150+)
                    </span>
                  ) : (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      ✅ Great length
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'text-xs font-medium',
                    currentDescription.length >= 50 ? 'text-slate-600' : 'text-amber-600',
                  )}
                >
                  {currentDescription.length} / 5000 chars
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Selling Points */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">Key Selling Points</CardTitle>
                <CardDescription>
                  Add 3-8 bullet points summarizing why buyers should choose this estate.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. No Transfer Duty"
                value={highlightInput}
                onChange={e => setHighlightInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddHighlight();
                  }
                }}
                className="h-11 border-slate-200 focus:border-blue-500"
                maxLength={100}
              />
              <Button
                onClick={handleAddHighlight}
                type="button"
                size="icon"
                className="h-11 w-11 bg-slate-900 hover:bg-slate-800 shrink-0"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-4 min-h-[100px]">
              {currentHighlights.length === 0 ? (
                <div className="text-center text-slate-500 py-4">
                  <p className="text-sm font-medium">No highlights added yet.</p>
                  <p className="text-xs mt-1">
                    Add points like "Pet Friendly", "Backup Power", or "Prime Location".
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentHighlights.map((item, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="pl-3 pr-1 py-1.5 bg-white border border-slate-200 shadow-sm text-slate-700 text-sm font-normal flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      {item}
                      <button
                        onClick={() => handleRemoveHighlight(idx)}
                        className="p-1 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {currentHighlights.length} of 8 points added (Min 3)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
