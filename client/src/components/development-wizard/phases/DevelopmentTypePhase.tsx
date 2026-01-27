import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, TreePine, Briefcase, Layers, ArrowRight, Key, Tag, Gavel } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEVELOPMENT_TYPE_OPTIONS, type DevelopmentType } from '@/types/wizardTypes';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { getWorkflow } from '@/lib/workflows';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ICONS: Record<DevelopmentType, typeof Building2> = {
  residential: Building2,
  mixed_use: Layers,
  land: TreePine,
  commercial: Briefcase,
};

const TRANSACTION_TYPES = [
  { value: 'for_sale', label: 'For Sale', icon: Tag, description: 'Sell units directly to buyers' },
  {
    value: 'for_rent',
    label: 'To Let / Rent',
    icon: Key,
    description: 'Lease units to tenants',
    enabled: true,
  },
  {
    value: 'auction',
    label: 'Auction',
    icon: Gavel,
    description: 'Sell via bidding process',
    enabled: true,
  },
];

export function DevelopmentTypePhase() {
  const {
    developmentType,
    developmentData,
    workflowId,
    setWorkflowSelector,
    setPhase,
    resetWizard,
  } = useDevelopmentWizard();

  const [selectedTxType, setSelectedTxType] = useState<string | undefined>(
    developmentData?.transactionType,
  );
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [pendingTxChange, setPendingTxChange] = useState<string | null>(null);

  const normalizeTxType = (value?: string | null) => {
    if (!value) return value;
    if (value === 'rent') return 'for_rent';
    if (value === 'sale') return 'for_sale';
    return value;
  };

  // Sync state on mount
  React.useEffect(() => {
    if (developmentData?.transactionType) {
      setSelectedTxType(normalizeTxType(developmentData.transactionType));
    }
  }, [developmentData?.transactionType]);

  const handleTxSelect = (type: string) => {
    // LOCK LOGIC: If workflow is active, prevent silent change
    if (workflowId) {
      if (type !== developmentData?.transactionType) {
        setPendingTxChange(type);
        setShowResetDialog(true);
      }
      return;
    }

    const option = TRANSACTION_TYPES.find(o => o.value === type);
    if (option?.enabled === false) {
      toast.info(`${option.label} workflow is coming soon!`);
      return;
    }
    setSelectedTxType(type);
  };

  const confirmReset = () => {
    if (pendingTxChange) {
      resetWizard();
      setSelectedTxType(pendingTxChange); // set local state for next selection
      // Note: resetWizard clears global state, so we are essentially restarting
      // We might need to re-apply the development type selection if we want to keep it?
      // Actually per plan: "Reset Wizard (calls store resetWizard() and returns to Step 1)"
      // So stripping everything is correct. User re-selects dev type is fine or we can re-set dev type.
      // Let's just let resetWizard do its job.
    }
    setShowResetDialog(false);
    setPendingTxChange(null);
  };

  const handleDevSelect = (type: DevelopmentType) => {
    if (workflowId && type !== developmentType) {
      // Also safeguard dev type changes if we are locked
      toast.warning('To change development type, please reset the wizard.', {
        action: {
          label: 'Reset',
          onClick: () => setShowResetDialog(true),
        },
      });
      return;
    }

    // Legacy logic... but wait, useDevelopmentWizard actions now handle setWorkflowSelector?
    // Oh, setWorkflowSelector is for the "Continue" button action.
    // DevelopmentType is still set via the old action until we hit "Continue".
    // Wait, the plan says: "call store setWorkflowSelector(developmentType, transactionType)" in handleContinue.
    // So here we can just update local or store state?
    // Let's use the store's setDevelopmentType as before for UI feedback.
    const { setDevelopmentType } = useDevelopmentWizard.getState();
    const option = DEVELOPMENT_TYPE_OPTIONS.find(o => o.value === type);

    if (!option?.enabled) {
      toast.info(`${option?.label} is coming soon!`);
      return;
    }
    setDevelopmentType(type);
  };

  const handleContinue = () => {
    if (!developmentType) {
      toast.error('Please select a development type');
      return;
    }
    if (!selectedTxType) {
      toast.error('Please select a transaction type');
      return;
    }

    const workflow = getWorkflow({ developmentType, transactionType: selectedTxType });

    if (!workflow) {
      toast.error('This workflow configuration is not yet available.');
      return;
    }

    // ACTIVATE WORKFLOW
    setWorkflowSelector(developmentType, selectedTxType as any);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Removed - Managed by WizardEngine */}

      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider ml-1">
            Development Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEVELOPMENT_TYPE_OPTIONS.map(option => {
              const Icon = ICONS[option.value];
              const isSelected = developmentType === option.value;
              const isDisabled = !option.enabled;

              return (
                <div
                  key={option.value}
                  onClick={() => !isDisabled && handleDevSelect(option.value)}
                  className={cn(
                    'relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all',
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50'
                      : isDisabled
                        ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <div
                    className={cn(
                      'p-3 rounded-lg mr-4 transition-colors',
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4
                        className={cn(
                          'font-medium',
                          isSelected ? 'text-blue-900' : 'text-slate-900',
                        )}
                      >
                        {option.label}
                      </h4>
                      {isDisabled && (
                        <Badge variant="secondary" className="text-[10px]">
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{option.description}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-3 h-3 bg-blue-600 rounded-full shadow-sm ring-2 ring-white" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Transaction Type */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider ml-1">
            Transaction Goal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TRANSACTION_TYPES.map(option => {
              const Icon = option.icon;
              const isSelected = selectedTxType === option.value;
              const isDisabled = option.enabled === false;

              return (
                <div
                  key={option.value}
                  onClick={() => handleTxSelect(option.value)}
                  className={cn(
                    'flex flex-col items-center text-center p-4 rounded-xl border-2 cursor-pointer transition-all',
                    isSelected
                      ? 'border-purple-600 bg-purple-50/50'
                      : isDisabled
                        ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <div
                    className={cn(
                      'p-3 rounded-full mb-3',
                      isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4
                    className={cn(
                      'font-medium text-sm',
                      isSelected ? 'text-purple-900' : 'text-slate-900',
                    )}
                  >
                    {option.label}
                  </h4>
                  {isDisabled && (
                    <span className="text-[10px] text-slate-400 mt-1 block">(Coming Soon)</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-end pt-6 max-w-lg mx-auto">
        <Button
          onClick={handleContinue}
          disabled={!developmentType || !selectedTxType}
          size="lg"
          className="px-10 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
          {workflowId ? 'Resume Wizard' : 'Start Wizard'}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing the transaction type requires resetting the wizard logic. Your current
              progress in this specific workflow will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingTxChange(null);
                setShowResetDialog(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                resetWizard();
                setPendingTxChange(null);
                setShowResetDialog(false);
              }}
            >
              Reset Wizard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
