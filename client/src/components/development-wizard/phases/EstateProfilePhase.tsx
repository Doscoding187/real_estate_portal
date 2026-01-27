import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Scale, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';

// Governance Type Options
const GOVERNANCE_TYPES = [
  { value: 'hoa', label: 'Homeowners Association (HOA)' },
  { value: 'body_corporate', label: 'Body Corporate' },
  { value: 'property_management', label: 'Property Management Company' },
  { value: 'other', label: 'Other' },
];

export function EstateProfilePhase() {
  const { developmentData, stepData, saveWorkflowStepData } = useDevelopmentWizard();

  // Canonical source of truth: Step Data
  const savedData = stepData?.governance_finances || {};

  // Local state for immediate UI responsiveness, hydrated from saved step data
  const [formData, setFormData] = useState({
    hasGoverningBody: savedData.hasGoverningBody ?? false,
    governanceType: savedData.governanceType || '',
    levyRange: savedData.levyRange || { min: 0, max: 0 },
    architecturalGuidelines: savedData.architecturalGuidelines ?? false,
    guidelinesSummary: savedData.guidelinesSummary || '',
    rightsAndTaxes: savedData.rightsAndTaxes || { min: 0, max: 0 },
  });

  // Hydrate local state when step data changes (e.g. on mount or nav)
  useEffect(() => {
    const saved = stepData?.governance_finances || {};
    setFormData(prev => ({
      ...prev,
      hasGoverningBody: saved.hasGoverningBody ?? prev.hasGoverningBody,
      governanceType: saved.governanceType || prev.governanceType,
      levyRange: saved.levyRange || prev.levyRange,
      architecturalGuidelines: saved.architecturalGuidelines ?? prev.architecturalGuidelines,
      guidelinesSummary: saved.guidelinesSummary || prev.guidelinesSummary,
      rightsAndTaxes: saved.rightsAndTaxes || prev.rightsAndTaxes,
    }));
  }, [stepData?.governance_finances]);

  // Helper to persist updates to workflow engine
  const handleUpdate = useCallback(
    (updates: Partial<typeof formData>) => {
      setFormData(prev => ({ ...prev, ...updates }));

      // IMPORTANT: Clear dependent fields if governing body is toggled off
      if ('hasGoverningBody' in updates && updates.hasGoverningBody === false) {
        saveWorkflowStepData('governance_finances', {
          ...updates,
          governanceType: undefined,
          levyRange: undefined,
          architecturalGuidelines: undefined,
          guidelinesSummary: undefined,
        });
      } else {
        saveWorkflowStepData('governance_finances', updates);
      }
    },
    [saveWorkflowStepData],
  );

  const handleGovernanceTypeSelect = (type: string) => {
    handleUpdate({ governanceType: type });
  };

  const handleLevyChange = (values: number[]) => {
    handleUpdate({
      levyRange: { min: values[0], max: values[1] },
    });
  };

  const handleRatesChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'min' | 'max') => {
    const val = parseInt(e.target.value) || 0;
    handleUpdate({
      rightsAndTaxes: {
        ...formData.rightsAndTaxes,
        [field]: val,
      },
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center md:text-left">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Scale className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Governance & Finances</h2>
            <p className="text-slate-600">
              Configure the management structure and financial obligations.
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          This information clarifies the ongoing costs and rules for potential buyers, increasing
          transparency and trust.
        </div>
      </div>

      {/* Main Configuration Card */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-slate-900">Governing Body</CardTitle>
          <CardDescription>Is there an entity specific to this development?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* 1. Primary Question */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <Label className="text-base font-medium text-slate-900">
                Managed Estate / Body Corporate
              </Label>
              <p className="text-sm text-slate-500 mt-1">
                Is this development part of a managed estate, complex, or body corporate?
              </p>
            </div>
            <Switch
              checked={formData.hasGoverningBody}
              onCheckedChange={checked => handleUpdate({ hasGoverningBody: checked })}
            />
          </div>

          {/* CONDITIONAL: Governance Details */}
          {formData.hasGoverningBody && (
            <div className="space-y-6 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
              {/* 2. Governance Type */}
              <div className="space-y-3">
                <Label className="text-base text-slate-900">
                  Type of Governing Body <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GOVERNANCE_TYPES.map(type => (
                    <div
                      key={type.value}
                      onClick={() => handleGovernanceTypeSelect(type.value)}
                      className={cn(
                        'cursor-pointer p-3 rounded-lg border flex items-center gap-3 transition-all',
                        formData.governanceType === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center shrink-0',
                          formData.governanceType === type.value && 'border-blue-600 bg-blue-600',
                        )}
                      >
                        {formData.governanceType === type.value && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Levies */}
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">
                    Estimated Monthly Levies
                  </Label>
                  <p className="text-xs text-slate-500">Range for units in this development</p>
                </div>
                <div className="px-2">
                  <Slider
                    value={[formData.levyRange.min, formData.levyRange.max]}
                    onValueChange={handleLevyChange}
                    min={0}
                    max={20000}
                    step={100}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    From:{' '}
                    <strong className="text-slate-900">
                      {formatCurrency(formData.levyRange.min)}
                    </strong>
                  </span>
                  <span className="text-slate-600">
                    To:{' '}
                    <strong className="text-slate-900">
                      {formatCurrency(formData.levyRange.max)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* 4. Architectural Guidelines */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <Label className="text-sm font-medium text-slate-900">
                    Architectural Guidelines
                  </Label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Are there strict design rules owners must follow?
                  </p>
                </div>
                <Switch
                  checked={formData.architecturalGuidelines}
                  onCheckedChange={checked => handleUpdate({ architecturalGuidelines: checked })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rates & Taxes (Always Visible) */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-slate-900">Rates & Taxes (Municipal)</CardTitle>
          <CardDescription>Estimated municipal rates owners can expect to pay.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Min Estimate</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">R</span>
                <Input
                  type="number"
                  className="pl-7"
                  placeholder="0"
                  value={formData.rightsAndTaxes?.min || ''}
                  onChange={e => handleRatesChange(e, 'min')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Max Estimate</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">R</span>
                <Input
                  type="number"
                  className="pl-7"
                  placeholder="0"
                  value={formData.rightsAndTaxes?.max || ''}
                  onChange={e => handleRatesChange(e, 'max')}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation managed by WizardEngine */}
    </div>
  );
}
