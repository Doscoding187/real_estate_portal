import React, { useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  X,
  Plus,
  Sparkles,
  CheckCircle2,
  Calendar,
  Megaphone,
  ArrowRight,
  ArrowLeft,
  Coins
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DEVELOPMENT_STATUS_OPTIONS } from '@/types/wizardTypes';

export function OverviewPhase() {
  const {
    developmentData,
    setIdentity,
    addHighlight,
    removeHighlight,
    setPhase,
    validatePhase,
  } = useDevelopmentWizard();

  const [highlightInput, setHighlightInput] = useState('');

  // Local handler for highlights to use the store action
  const handleAddHighlight = () => {
    if (!highlightInput.trim()) return;
    if (developmentData.highlights.includes(highlightInput.trim())) {
      toast.error('Highlight already exists');
      return;
    }
    addHighlight(highlightInput.trim());
    setHighlightInput('');
  };

  const handleNext = () => {
    // Validate Step 8 (Overview/Marketing)
    const { isValid, errors } = validatePhase(8);
    if (isValid) {
      setPhase(9); // Correct next phase (Media)
    } else {
      errors.forEach((e) => toast.error(e));
    }
  };

  const handleBack = () => {
    setPhase(7); // Back to Amenities
    // If amenities was step 6 index, then 7. Check Wizard mapping:
    // Case 7: AmenitiesPhase. So setPhase(7) is correct.
  };

  const showCompletionDate =
    developmentData.status === 'under_construction' ||
    developmentData.status === 'launching_soon';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          Marketing Summary
        </h2>
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
                <CardTitle className="text-lg text-slate-900">
                  Listing Content
                </CardTitle>
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
                value={developmentData.subtitle || ''}
                onChange={(e) => setIdentity({ subtitle: e.target.value })}
                maxLength={100}
                className="h-11 border-slate-200 focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 text-right">
                {(developmentData.subtitle?.length || 0)} / 100
              </p>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label className="text-slate-900 font-medium">
                Development Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Describe the lifestyle, location benefits, and unique selling points..."
                className="min-h-[200px] border-slate-200 focus:border-blue-500 resize-y"
                value={developmentData.description}
                onChange={(e) => setIdentity({ description: e.target.value })}
              />
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-md border border-slate-100">
                <div className="flex items-center gap-2">
                   {developmentData.description.length < 50 ? (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        ⚠️ Too short (min 50)
                      </span>
                   ) : developmentData.description.length < 150 ? (
                      <span className="text-xs text-blue-600 flex items-center gap-1">
                        ℹ️ Good start (aim for 150+)
                      </span>
                   ) : (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        ✅ Great length
                      </span>
                   )}
                </div>
                <p className={cn(
                  "text-xs font-medium",
                  developmentData.description.length >= 50 ? "text-slate-600" : "text-amber-600"
                )}>
                  {developmentData.description.length} / 5000 chars
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
                <CardTitle className="text-lg text-slate-900">
                  Key Selling Points
                </CardTitle>
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
                onChange={(e) => setHighlightInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddHighlight()}
                className="h-11 border-slate-200 focus:border-blue-500"
                maxLength={100}
              />
              <Button
                onClick={handleAddHighlight}
                size="icon"
                className="h-11 w-11 bg-slate-900 hover:bg-slate-800 shrink-0"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-4 min-h-[100px]">
              {developmentData.highlights.length === 0 ? (
                <div className="text-center text-slate-500 py-4">
                  <p className="text-sm font-medium">No highlights added yet.</p>
                  <p className="text-xs mt-1">Add points like "Pet Friendly", "Backup Power", or "Prime Location".</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {developmentData.highlights.map((item, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="pl-3 pr-1 py-1.5 bg-white border border-slate-200 shadow-sm text-slate-700 text-sm font-normal flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      {item}
                      <button
                        onClick={() => removeHighlight(idx)}
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
                {developmentData.highlights.length} of 8 points added (Min 3)
             </p>
          </CardContent>
        </Card>

        {/* Development Status & Timeline */}
        <Card className="border-slate-200 shadow-sm">
           <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">
                  Status & Timeline
                </CardTitle>
                <CardDescription>
                  When will units be ready for occupation?
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                   <Label>Current Development Status</Label>
                   <Select
                      value={developmentData.status}
                      onValueChange={(val: any) => setIdentity({ status: val })}
                   >
                      <SelectTrigger className="h-11">
                         <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                         {DEVELOPMENT_STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                               {opt.label}
                            </SelectItem>
                         ))}
                      </SelectContent>
                   </Select>
                </div>

                {showCompletionDate && (
                   <div className="space-y-3 animate-in fade-in slide-in-from-left-2">
                      <Label>Expected Completion Date</Label>
                      <Input
                        type="date"
                        className="h-11"
                        value={developmentData.completionDate ? new Date(developmentData.completionDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => setIdentity({ completionDate: e.target.value ? new Date(e.target.value) : null })}
                      />
                      <p className="text-xs text-slate-500">
                         Approximate date for first occupation.
                      </p>
                   </div>
                )}
             </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card className="border-slate-200 shadow-sm">
           <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Coins className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">
                  Estimated Costs
                </CardTitle>
                <CardDescription>
                  Provide estimated rates and taxes to help buyers budget.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
             {/* Rates & Taxes */}
             <div className="space-y-3">
                <Label>Estimated Rates & Taxes (Monthly)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase font-medium">From</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R</span>
                      <Input
                        type="number"
                        className="pl-7"
                        placeholder="0"
                        min={0}
                        value={developmentData.ratesFrom || ''}
                        onChange={(e) => setIdentity({ ratesFrom: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase font-medium">To</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R</span>
                      <Input
                        type="number"
                        className="pl-7"
                        placeholder="0"
                        min={0}
                        value={developmentData.ratesTo || ''}
                        onChange={(e) => setIdentity({ ratesTo: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                   General rates range for units in this development.
                </p>
             </div>

             {/* Transfer Costs */}
             <div className="flex items-center space-x-2 border p-3 rounded-lg bg-slate-50">
                <Checkbox 
                  id="transferCosts" 
                  checked={developmentData.transferCostsIncluded || false}
                  onCheckedChange={(checked) => setIdentity({ transferCostsIncluded: checked === true })}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="transferCosts" className="cursor-pointer font-medium text-slate-700">
                    Transfer Costs Included?
                  </Label>
                  <p className="text-xs text-slate-500">
                    Check this if the developer covers transfer fees (marketing incentive).
                  </p>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-8 border-t border-slate-200">
        <Button
          variant="outline"
          onClick={handleBack}
          className="px-6 h-11 border-slate-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          size="lg"
          className="px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
          Continue to Media
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}