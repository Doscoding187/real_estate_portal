import React from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Calendar, Tag, AlertCircle, Lock } from 'lucide-react';
import {
  DEVELOPMENT_STATUS_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  OWNERSHIP_TYPE_OPTIONS,
  DEVELOPMENT_NATURE_OPTIONS,
  MARKETING_ROLE_OPTIONS,
  OwnershipType,
  AUCTION_TYPE_OPTIONS,
} from '@/types/wizardTypes';

export function IdentityPhase() {
  const {
    developmentData,
    setIdentity,
    saveWorkflowStepData, // Use this for step archiving
    stepErrors,
    currentStepId,
  } = useDevelopmentWizard();

  // Unified change handler that updates both local state (reactivity) and workflow storage (persistence)
  const handleFieldChange = (field: keyof typeof developmentData, value: any) => {
    setIdentity({ [field]: value });
    // Phase 2B.1 Requirement: Explicit write to 'identity_market' step
    saveWorkflowStepData('identity_market', { [field]: value });
  };

  // Get errors for the current step (structured as FieldError[])
  const errors = (currentStepId && stepErrors[currentStepId]) || [];

  // Helper to find specific field error
  const getError = (fieldName: string) => {
    const error = errors.find((e: any) => e.field === fieldName);
    return error ? error.message : null;
  };

  // Check if current status implies active construction/launch
  const showCompletionDate = ['launching-soon', 'selling'].includes(developmentData.status);

  // Helper for Ownership Type Toggle
  const toggleOwnershipType = (type: OwnershipType) => {
    const current = developmentData.ownershipTypes || [];
    const exists = current.includes(type);

    let updated;
    if (exists) {
      updated = current.filter(t => t !== type);
    } else {
      updated = [...current, type];
    }

    handleFieldChange('ownershipTypes', updated);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Identity Section */}
      <Card
        className={`border-slate-200/60 shadow-sm ${getError('name') ? 'border-red-200 ring-1 ring-red-200' : ''}`}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Identity & Market</CardTitle>
              <CardDescription>Establish the brand identity and market position.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                Development Name <span className="text-red-500">*</span>
                {getError('name') && (
                  <span className="text-xs text-red-500 font-normal ml-auto flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {getError('name')}
                  </span>
                )}
              </Label>
              <Input
                id="name"
                placeholder="e.g. Sunset Heights"
                value={developmentData.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                className={`h-11 ${getError('name') ? 'border-red-300 focus-visible:ring-red-200' : ''}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle / Tagline</Label>
              <Input
                id="subtitle"
                placeholder="e.g. Luxury Coastal Living"
                value={developmentData.subtitle || ''}
                onChange={e => handleFieldChange('subtitle', e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="nature">Nature of Development</Label>
              <Select
                value={developmentData.nature || undefined}
                onValueChange={(val: string) => handleFieldChange('nature', val as any)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select nature of development" />
                </SelectTrigger>
                <SelectContent>
                  {DEVELOPMENT_NATURE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketingRole">Marketing Mandate</Label>
              <Select
                value={developmentData.marketingRole || undefined}
                onValueChange={(val: string) => handleFieldChange('marketingRole', val as any)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select marketing role" />
                </SelectTrigger>
                <SelectContent>
                  {MARKETING_ROLE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Timeline & Status Section */}
      <Card
        className={`border-slate-200/60 shadow-sm ${getError('status') ? 'border-red-200 ring-1 ring-red-200' : ''}`}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Timeline & Status</CardTitle>
              <CardDescription>Current construction status and dates.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="status" className="flex items-center gap-2">
                Development Status <span className="text-red-500">*</span>
                {getError('status') && (
                  <span className="text-xs text-red-500 font-normal ml-auto flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Required
                  </span>
                )}
              </Label>
              <Select
                value={developmentData.status || undefined}
                onValueChange={(val: string) => handleFieldChange('status', val as any)}
              >
                <SelectTrigger className={`h-11 ${getError('status') ? 'border-red-300' : ''}`}>
                  <SelectValue placeholder="Select development status" />
                </SelectTrigger>
                <SelectContent>
                  {DEVELOPMENT_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {developmentData.status
                  ? DEVELOPMENT_STATUS_OPTIONS.find(o => o.value === developmentData.status)
                      ?.description
                  : 'Choose the current sales status of your development'}
              </p>
            </div>

            {showCompletionDate && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="completionDate">Expected Completion</Label>
                <Input
                  id="completionDate"
                  type="date"
                  value={
                    developmentData.completionDate
                      ? new Date(developmentData.completionDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={e =>
                    handleFieldChange(
                      'completionDate',
                      e.target.value ? new Date(e.target.value) : null,
                    )
                  }
                  className="h-11"
                />
              </div>
            )}

            {/* Launch Date - Always visible, conditionally required */}
            {!showCompletionDate && (
              <div className="space-y-2">
                <Label htmlFor="launchDate">
                  Launch Date
                  {developmentData.status === 'launching-soon' && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                <Input
                  id="launchDate"
                  type="date"
                  value={
                    developmentData.launchDate
                      ? new Date(developmentData.launchDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={e =>
                    handleFieldChange(
                      'launchDate',
                      e.target.value ? new Date(e.target.value) : null,
                    )
                  }
                  className="h-11"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Market Configuration */}
      <Card
        className={`border-slate-200/60 shadow-sm ${getError('ownershipTypes') ? 'border-red-200 ring-1 ring-red-200' : ''}`}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Tag className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Market Configuration</CardTitle>
              <CardDescription>How this development is being sold.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>
                Transaction Type{' '}
                <span className="text-slate-400 text-xs font-normal ml-2">(Read Only)</span>
              </Label>
              <div className="h-11 px-3 flex items-center bg-slate-100 border border-slate-200 rounded-md text-slate-500 text-sm cursor-not-allowed">
                <Lock className="w-3 h-3 mr-2 text-slate-400" />
                {TRANSACTION_TYPE_OPTIONS.find(o => o.value === developmentData.transactionType)
                  ?.label || developmentData.transactionType}
              </div>
            </div>

            {developmentData.transactionType === 'auction' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Auction Type <span className="text-red-500">*</span>
                  {getError('auctionType') && (
                    <span className="text-xs text-red-500 font-normal ml-auto flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Required
                    </span>
                  )}
                </Label>
                <Select
                  value={developmentData.auctionType || undefined}
                  onValueChange={(val: string) => handleFieldChange('auctionType', val as any)}
                >
                  <SelectTrigger
                    className={`h-11 ${getError('auctionType') ? 'border-red-300' : ''}`}
                  >
                    <SelectValue placeholder="Select auction type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUCTION_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {developmentData.auctionType
                    ? AUCTION_TYPE_OPTIONS.find(o => o.value === developmentData.auctionType)
                        ?.description
                    : 'Choose how bidding will take place'}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                Ownership Type(s) <span className="text-red-500">*</span>
                {getError('ownershipTypes') && (
                  <span className="text-xs text-red-500 font-normal ml-auto flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Required
                  </span>
                )}
              </Label>
              <div
                className={`grid grid-cols-1 gap-2 p-3 bg-slate-50/50 rounded-lg border ${getError('ownershipTypes') ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}
              >
                {OWNERSHIP_TYPE_OPTIONS.map(type => {
                  const isChecked = (developmentData.ownershipTypes || []).includes(
                    type.value as OwnershipType,
                  );
                  return (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`ownership-${type.value}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleOwnershipType(type.value as OwnershipType)}
                      />
                      <label
                        htmlFor={`ownership-${type.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-700"
                      >
                        {type.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
