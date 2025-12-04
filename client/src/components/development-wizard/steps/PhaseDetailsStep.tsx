import { useEffect, useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Link2, Building, Info, Sparkles, X, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { InlineError } from '@/components/ui/InlineError';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Development {
  id: number;
  name: string;
  city: string;
  province: string;
}

const specTypeOptions = [
  { value: 'affordable', label: 'Affordable Housing', color: 'bg-green-500' },
  { value: 'gap', label: 'GAP Housing', color: 'bg-blue-500' },
  { value: 'luxury', label: 'Luxury', color: 'bg-purple-500' },
  { value: 'custom', label: 'Custom', color: 'bg-orange-500' },
];

const phaseStatusOptions = [
  { value: 'planning', label: 'Planning', color: 'bg-slate-500' },
  { value: 'under-construction', label: 'Under Construction', color: 'bg-orange-500' },
  { value: 'now-selling', label: 'Now Selling', color: 'bg-green-500' },
  { value: 'sold-out', label: 'Sold Out', color: 'bg-gray-500' },
];

export function PhaseDetailsStep() {
  const {
    parentDevelopmentId,
    phaseName,
    phaseNumber,
    specType,
    customSpecType,
    phaseStatus,
    unitsInPhase,
    finishingDifferences,
    phaseHighlights,
    phaseCompletionDate,
    phaseDescription,
    setParentDevelopmentId,
    setPhaseName,
    setPhaseNumber,
    setSpecType,
    setCustomSpecType,
    setPhaseStatus,
    setUnitsInPhase,
    setFinishingDifferences,
    addPhaseHighlight,
    removePhaseHighlight,
    setPhaseCompletionDate,
    setPhaseDescription,
  } = useDevelopmentWizard();

  const [developments, setDevelopments] = useState<Development[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [newHighlight, setNewHighlight] = useState('');

  // Validation context
  const validationContext = { currentStep: 1 };

  // Field validation
  const parentValidation = useFieldValidation({
    field: 'parentDevelopmentId',
    value: parentDevelopmentId,
    context: validationContext,
    trigger: 'blur',
  });

  const phaseNameValidation = useFieldValidation({
    field: 'phaseName',
    value: phaseName,
    context: validationContext,
    trigger: 'blur',
  });

  // Fetch user's developments
  useEffect(() => {
    const fetchDevelopments = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/developer/developments', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setDevelopments(data);
        } else {
          toast.error('Failed to load your developments');
        }
      } catch (error) {
        console.error('Error fetching developments:', error);
        toast.error('Error loading developments');
      } finally {
        setLoading(false);
      }
    };

    fetchDevelopments();
  }, []);

  const handleAddHighlight = () => {
    if (newHighlight.trim() && (phaseHighlights?.length || 0) < 5) {
      addPhaseHighlight(newHighlight.trim());
      setNewHighlight('');
      toast.success('Highlight added');
    } else if ((phaseHighlights?.length || 0) >= 5) {
      toast.error('Maximum 5 highlights allowed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Parent Development Link Section */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Link to Parent Development</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="parentDevelopment" className="text-slate-700">
              Select Parent Development <span className="text-red-500">*</span>
            </Label>
            <Select
              value={parentDevelopmentId?.toString()}
              onValueChange={(value) => {
                setParentDevelopmentId(parseInt(value));
                parentValidation.clearError();
              }}
            >
              <SelectTrigger
                id="parentDevelopment"
                className="mt-1"
                disabled={loading}
                aria-invalid={!!parentValidation.error}
              >
                <SelectValue placeholder={loading ? 'Loading developments...' : 'Select a development'} />
              </SelectTrigger>
              <SelectContent>
                {developments.map((dev) => (
                  <SelectItem key={dev.id} value={dev.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{dev.name}</span>
                      <span className="text-xs text-slate-500">
                        {dev.city}, {dev.province}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InlineError
              error={parentValidation.error}
              show={!!parentValidation.error}
              size="sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              This phase will be linked to the selected development
            </p>
          </div>
        </div>
      </Card>

      {/* Phase Information Section */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-800">Phase Information</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phaseName" className="text-slate-700">
                Phase Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phaseName"
                placeholder="e.g., Phase 2, The Gardens"
                value={phaseName || ''}
                onChange={(e) => {
                  setPhaseName(e.target.value);
                  phaseNameValidation.clearError();
                }}
                onBlur={phaseNameValidation.onBlur}
                className="mt-1"
                aria-invalid={!!phaseNameValidation.error}
              />
              <InlineError
                error={phaseNameValidation.error}
                show={!!phaseNameValidation.error}
                size="sm"
              />
            </div>

            <div>
              <Label htmlFor="phaseNumber" className="text-slate-700">
                Phase Number
              </Label>
              <Input
                id="phaseNumber"
                type="number"
                min="1"
                placeholder="e.g., 2"
                value={phaseNumber || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    setPhaseNumber(val);
                  }
                }}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Optional numeric identifier
              </p>
            </div>
          </div>

          {/* Spec Type Selector */}
          <div>
            <Label className="text-slate-700">
              Specification Type <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {specTypeOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={specType === option.value ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all duration-200 px-3 py-1.5 text-sm font-medium',
                    specType === option.value
                      ? `${option.color} text-white hover:opacity-90`
                      : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                  )}
                  onClick={() => setSpecType(option.value as any)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom Spec Type Input */}
          {specType === 'custom' && (
            <div>
              <Label htmlFor="customSpecType" className="text-slate-700">
                Custom Specification Type <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customSpecType"
                placeholder="e.g., Mid-Range Executive"
                value={customSpecType || ''}
                onChange={(e) => setCustomSpecType(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {/* Phase Status */}
          <div>
            <Label className="text-slate-700">
              Phase Status
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {phaseStatusOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={phaseStatus === option.value ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all duration-200 px-3 py-1.5 text-sm font-medium',
                    phaseStatus === option.value
                      ? `${option.color} text-white hover:opacity-90`
                      : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                  )}
                  onClick={() => setPhaseStatus(option.value as any)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Optional Phase Details Section */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <button
          type="button"
          onClick={() => setShowOptionalDetails(!showOptionalDetails)}
          className="w-full flex items-center justify-between mb-4 hover:opacity-70 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-800">Optional Phase Details</h3>
          </div>
          {showOptionalDetails ? (
            <ChevronUp className="w-5 h-5 text-slate-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-600" />
          )}
        </button>

        {showOptionalDetails && (
          <div className="space-y-4 pt-2">
            {/* Units in Phase */}
            <div>
              <Label htmlFor="unitsInPhase" className="text-slate-700">
                Number of Units in This Phase
              </Label>
              <Input
                id="unitsInPhase"
                type="number"
                min="1"
                placeholder="e.g., 50"
                value={unitsInPhase || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    setUnitsInPhase(val);
                  }
                }}
                className="mt-1"
              />
            </div>

            {/* Finishing Differences */}
            <div>
              <Label className="text-slate-700 mb-2 block">
                Finishing Differences from Master Development
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="kitchen" className="text-sm text-slate-600">
                    Kitchen
                  </Label>
                  <Input
                    id="kitchen"
                    placeholder="e.g., Upgraded granite countertops"
                    value={finishingDifferences?.kitchen?.[0] || ''}
                    onChange={(e) =>
                      setFinishingDifferences({
                        ...finishingDifferences,
                        kitchen: e.target.value ? [e.target.value] : undefined,
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="bathrooms" className="text-sm text-slate-600">
                    Bathrooms
                  </Label>
                  <Input
                    id="bathrooms"
                    placeholder="e.g., Premium fixtures"
                    value={finishingDifferences?.bathrooms?.[0] || ''}
                    onChange={(e) =>
                      setFinishingDifferences({
                        ...finishingDifferences,
                        bathrooms: e.target.value ? [e.target.value] : undefined,
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="flooring" className="text-sm text-slate-600">
                    Flooring
                  </Label>
                  <Input
                    id="flooring"
                    placeholder="e.g., Engineered wood"
                    value={finishingDifferences?.flooring?.[0] || ''}
                    onChange={(e) =>
                      setFinishingDifferences({
                        ...finishingDifferences,
                        flooring: e.target.value ? [e.target.value] : undefined,
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="electrical" className="text-sm text-slate-600">
                    Electrical
                  </Label>
                  <Input
                    id="electrical"
                    placeholder="e.g., Smart home ready"
                    value={finishingDifferences?.electrical?.[0] || ''}
                    onChange={(e) =>
                      setFinishingDifferences({
                        ...finishingDifferences,
                        electrical: e.target.value ? [e.target.value] : undefined,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Phase Highlights */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-700">
                  Phase-Specific Highlights <span className="text-xs text-slate-500">(Maximum 5)</span>
                </Label>
                <span className="text-xs text-slate-500">
                  {phaseHighlights?.length || 0}/5
                </span>
              </div>

              {/* Existing Highlights */}
              {phaseHighlights && phaseHighlights.length > 0 && (
                <div className="space-y-2 mb-3">
                  {phaseHighlights.map((highlight, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-slate-700">{highlight}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePhaseHighlight(index)}
                        className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Highlight */}
              {(!phaseHighlights || phaseHighlights.length < 5) && (
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Ocean-facing units, Rooftop terrace"
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddHighlight();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddHighlight}
                    disabled={!newHighlight.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 px-6"
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>

            {/* Expected Completion Date */}
            <div>
              <Label htmlFor="completionDate" className="text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Expected Completion Date
              </Label>
              <Input
                id="completionDate"
                type="date"
                value={phaseCompletionDate || ''}
                onChange={(e) => setPhaseCompletionDate(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Phase Description */}
            <div>
              <Label htmlFor="phaseDescription" className="text-slate-700">
                Phase Description
              </Label>
              <Textarea
                id="phaseDescription"
                placeholder="Describe what makes this phase unique, target buyers, special features..."
                value={phaseDescription || ''}
                onChange={(e) => setPhaseDescription(e.target.value)}
                rows={4}
                className="mt-1 resize-none"
              />
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-2 text-sm text-slate-500 px-2">
        <Info className="w-4 h-4" />
        <p><span className="text-red-500">*</span> Required fields</p>
      </div>
    </div>
  );
}
