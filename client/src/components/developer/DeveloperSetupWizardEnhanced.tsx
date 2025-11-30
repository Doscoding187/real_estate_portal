/**
 * Enhanced Developer Setup Wizard
 * Multi-step registration form with Soft UI gradient components
 * Integrated with new modular step components
 * 
 * Requirements: All Section 10 & 11 tasks
 */

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { Building2, Phone, Briefcase, FileText, Save, Check } from 'lucide-react';

// Gradient Components
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientProgressIndicator } from '@/components/wizard/GradientProgressIndicator';

// Wizard Step Components
import {
  BasicInfoStep,
  ContactInfoStep,
  PortfolioStep,
  ReviewStep,
  type BasicInfoData,
  type ContactInfoData,
  type PortfolioData,
  type ReviewData,
} from '@/components/wizard/steps';

// Auto-save and Draft Management
import { useAutoSave } from '@/hooks/useAutoSave';
import { SaveStatusIndicator } from '@/components/ui/SaveStatusIndicator';
import { DraftManager } from '@/components/wizard/DraftManager';

type FormValues = BasicInfoData & ContactInfoData & PortfolioData & {
  termsAccepted: boolean;
};

const STEPS = [
  { id: 1, title: 'Company Info', icon: Building2 },
  { id: 2, title: 'Contact Details', icon: Phone },
  { id: 3, title: 'Portfolio', icon: Briefcase },
  { id: 4, title: 'Review', icon: FileText },
];

export default function DeveloperSetupWizardEnhanced() {
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [, setLocation] = useLocation();
  const [showResumeDraftDialog, setShowResumeDraftDialog] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      // BasicInfo
      name: '',
      description: '',
      category: '',
      establishedYear: null,
      website: '',
      // ContactInfo
      email: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      logo: null,
      // Portfolio
      completedProjects: 0,
      currentProjects: 0,
      upcomingProjects: 0,
      specializations: [],
      // Terms
      termsAccepted: false,
    },
  });

  const createProfile = trpc.developer.createProfile.useMutation();
  const getProfile = trpc.developer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: user } = trpc.auth.me.useQuery();

  const formValues = watch();
  
  // Handlers for step data changes
  const handleBasicInfoChange = (data: Partial<BasicInfoData>) => {
    Object.entries(data).forEach(([key, value]) => {
      setValue(key as keyof FormValues, value as any);
    });
  };

  const handleContactInfoChange = (data: Partial<ContactInfoData>) => {
    Object.entries(data).forEach(([key, value]) => {
      setValue(key as keyof FormValues, value as any);
    });
  };

  const handlePortfolioChange = (data: Partial<PortfolioData>) => {
    Object.entries(data).forEach(([key, value]) => {
      setValue(key as keyof FormValues, value as any);
    });
  };

  const handleTermsChange = (accepted: boolean) => {
    setValue('termsAccepted', accepted);
  };

  const handleEditStep = (stepIndex: number) => {
    setStep(stepIndex + 1);
  };

  // Convert react-hook-form errors to simple string errors
  const getErrorMessages = (): Record<string, string> => {
    const errorMessages: Record<string, string> = {};
    Object.entries(errors).forEach(([key, error]) => {
      if (error?.message) {
        errorMessages[key] = error.message;
      }
    });
    return errorMessages;
  };

  // Auto-save hook - saves draft to localStorage automatically
  const { lastSaved, isSaving: isAutoSaving, error: autoSaveError } = useAutoSave(
    {
      step,
      completedSteps,
      ...formValues,
    },
    {
      storageKey: 'developer-registration-draft',
      debounceMs: 2000,
      enabled: step > 1 && !createProfile.isPending, // Only auto-save after first step
      onError: (error) => {
        console.error('Auto-save error:', error);
        toast.error('Failed to auto-save draft');
      },
    }
  );

  // Check for draft on mount and show resume dialog
  useEffect(() => {
    const savedDraft = localStorage.getItem('developer-registration-draft');
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        
        // Check if there's meaningful progress (beyond step 1 or has data)
        const hasMeaningfulProgress = 
          draft.step > 1 || 
          draft.name || 
          draft.specializations?.length > 0;
        
        if (hasMeaningfulProgress) {
          setShowResumeDraftDialog(true);
        }
      } catch (error) {
        console.error('Error parsing draft:', error);
        localStorage.removeItem('developer-registration-draft');
      }
    }
  }, []);

  // Handle resume draft decision
  const handleResumeDraft = () => {
    setShowResumeDraftDialog(false);
    
    const savedDraft = localStorage.getItem('developer-registration-draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        
        // Restore form values
        reset({
          name: draft.name || '',
          description: draft.description || '',
          category: draft.category || '',
          establishedYear: draft.establishedYear || null,
          website: draft.website || '',
          email: draft.email || user?.email || '',
          phone: draft.phone || '',
          address: draft.address || '',
          city: draft.city || '',
          province: draft.province || '',
          logo: draft.logo || null,
          completedProjects: draft.completedProjects || 0,
          currentProjects: draft.currentProjects || 0,
          upcomingProjects: draft.upcomingProjects || 0,
          specializations: draft.specializations || [],
          termsAccepted: false,
        });
        
        // Restore wizard state
        setStep(draft.step || 1);
        setCompletedSteps(draft.completedSteps || []);
        
        toast.success('Draft restored successfully!');
      } catch (error) {
        console.error('Error restoring draft:', error);
        toast.error('Failed to restore draft');
      }
    }
  };

  const handleStartFresh = () => {
    setShowResumeDraftDialog(false);
    localStorage.removeItem('developer-registration-draft');
    reset({
      name: '',
      description: '',
      category: '',
      establishedYear: null,
      website: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      logo: null,
      completedProjects: 0,
      currentProjects: 0,
      upcomingProjects: 0,
      specializations: [],
      termsAccepted: false,
    });
    setStep(1);
    setCompletedSteps([]);
    toast.info('Starting fresh registration');
  };

  // Handle manual save draft
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setDraftSaved(false);

    try {
      // The draft is already auto-saved via useAutoSave
      // This is just for user feedback
      await new Promise(resolve => setTimeout(resolve, 500));

      setDraftSaved(true);
      toast.success('Draft saved successfully!');
      
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Load existing draft or pre-fill email
  useEffect(() => {
    if (getProfile.data) {
      const data = getProfile.data;
      reset({
        name: data.name,
        description: data.description || '',
        category: data.category || '',
        establishedYear: data.establishedYear || null,
        website: data.website || '',
        email: data.email || user?.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        province: data.province || '',
        logo: data.logo || null,
        completedProjects: data.completedProjects || 0,
        currentProjects: data.currentProjects || 0,
        upcomingProjects: data.upcomingProjects || 0,
        specializations:
          typeof data.specializations === 'string'
            ? (JSON.parse(data.specializations) as string[])
            : ((data.specializations || []) as string[]),
        termsAccepted: false,
      });

      if (data.status === 'pending') {
        toast.success('Your application is already pending review.');
      }
    } else if (user?.email) {
      setValue('email', user.email);
    }
  }, [getProfile.data, user, reset, setValue]);

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!(formValues.name && formValues.category);
      case 2:
        return !!(formValues.email && formValues.city && formValues.province);
      case 3:
        return formValues.specializations.length > 0; // At least one specialization required
      case 4:
        return formValues.termsAccepted;
      default:
        return false;
    }
  };

  const onNext = () => {
    if (validateStep(step)) {
      setCompletedSteps([...completedSteps, step]);
      setStep(step + 1);
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const onBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const onStepClick = (stepId: number) => {
    if (completedSteps.includes(stepId)) {
      setStep(stepId);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      if (!data.termsAccepted) {
        toast.error('Please accept the terms and conditions');
        return;
      }

      await createProfile.mutateAsync({
        name: data.name,
        specializations: data.specializations as any,
        establishedYear: data.establishedYear ? Number(data.establishedYear) : null,
        description: data.description || null,
        email: data.email,
        phone: data.phone || null,
        website: data.website || null,
        address: data.address || null,
        city: data.city,
        province: data.province,
        completedProjects: data.completedProjects ? Number(data.completedProjects) : 0,
        currentProjects: data.currentProjects ? Number(data.currentProjects) : 0,
        upcomingProjects: data.upcomingProjects ? Number(data.upcomingProjects) : 0,
        logo: data.logo || null,
      });

      toast.success('Profile submitted for review successfully!');
      
      // Clear the draft from localStorage
      localStorage.removeItem('developer-registration-draft');
      
      setLocation('/developer/success');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to submit profile');
    }
  };

  if (getProfile.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Resume Draft Dialog */}
      <DraftManager
        open={showResumeDraftDialog}
        onOpenChange={setShowResumeDraftDialog}
        onResume={handleResumeDraft}
        onStartFresh={handleStartFresh}
        wizardType="listing"
        draftData={{
          currentStep: step,
          totalSteps: 4,
          developmentName: formValues.name,
          address: formValues.city && formValues.province 
            ? `${formValues.city}, ${formValues.province}` 
            : undefined,
          lastModified: lastSaved || undefined,
        }}
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center relative">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Developer Registration
          </h1>
          <p className="text-gray-600">
            Join our platform as a verified property developer
          </p>
          
          {/* Auto-save status indicator */}
          {step > 1 && (
            <div className="absolute top-0 right-0">
              <SaveStatusIndicator
                lastSaved={lastSaved}
                isSaving={isAutoSaving}
                error={autoSaveError}
                variant="compact"
              />
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <GradientProgressIndicator
            steps={STEPS}
            currentStep={step}
            completedSteps={completedSteps}
            onStepClick={onStepClick}
          />
        </div>

        {/* Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-white p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <BasicInfoStep
                  data={{
                    name: formValues.name,
                    description: formValues.description,
                    category: formValues.category,
                    establishedYear: formValues.establishedYear,
                    website: formValues.website,
                  }}
                  onChange={handleBasicInfoChange}
                  errors={getErrorMessages()}
                />
              </div>
            )}

            {/* Step 2: Contact Info */}
            {step === 2 && (
              <div className="animate-in fade-in-from-right-4 duration-300">
                <ContactInfoStep
                  data={{
                    email: formValues.email,
                    phone: formValues.phone,
                    address: formValues.address,
                    city: formValues.city,
                    province: formValues.province,
                    logo: formValues.logo,
                  }}
                  onChange={handleContactInfoChange}
                  errors={getErrorMessages()}
                />
              </div>
            )}

            {/* Step 3: Portfolio */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <PortfolioStep
                  data={{
                    completedProjects: formValues.completedProjects,
                    currentProjects: formValues.currentProjects,
                    upcomingProjects: formValues.upcomingProjects,
                    specializations: formValues.specializations,
                  }}
                  onChange={handlePortfolioChange}
                  errors={getErrorMessages()}
                />
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <ReviewStep
                  data={{
                    basicInfo: {
                      name: formValues.name,
                      description: formValues.description,
                      category: formValues.category,
                      establishedYear: formValues.establishedYear,
                      website: formValues.website,
                    },
                    contactInfo: {
                      email: formValues.email,
                      phone: formValues.phone,
                      address: formValues.address,
                      city: formValues.city,
                      province: formValues.province,
                      logo: formValues.logo,
                    },
                    portfolio: {
                      completedProjects: formValues.completedProjects,
                      currentProjects: formValues.currentProjects,
                      upcomingProjects: formValues.upcomingProjects,
                      specializations: formValues.specializations,
                    },
                    termsAccepted: formValues.termsAccepted,
                  }}
                  onTermsChange={handleTermsChange}
                  onEditStep={handleEditStep}
                  submitting={createProfile.isPending}
                  errors={getErrorMessages()}
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t-2 border-gray-100">
              <GradientButton
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={step === 1}
              >
                Back
              </GradientButton>

              <div className="flex gap-3">
                {step < 4 && (
                  <GradientButton
                    type="button"
                    variant="outline"
                    icon={draftSaved ? Check : Save}
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                  >
                    {draftSaved ? 'Saved' : isSavingDraft ? 'Saving...' : 'Save Draft'}
                  </GradientButton>
                )}

                {step < 4 ? (
                  <GradientButton
                    type="button"
                    variant="primary"
                    onClick={onNext}
                    disabled={!validateStep(step)}
                  >
                    Next Step
                  </GradientButton>
                ) : (
                  <GradientButton
                    type="submit"
                    variant="success"
                    loading={createProfile.isPending}
                    disabled={!formValues.termsAccepted}
                  >
                    Submit Application
                  </GradientButton>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
