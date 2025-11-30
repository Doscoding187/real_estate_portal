/**
 * Agency Setup Wizard
 * Multi-step registration form for real estate agencies
 * Uses the same gradient UI components as developer wizard
 * 
 * Similar to DeveloperSetupWizardEnhanced but adapted for agencies
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

// Auto-save and Draft Management
import { useAutoSave } from '@/hooks/useAutoSave';
import { SaveStatusIndicator } from '@/components/ui/SaveStatusIndicator';
import { DraftManager } from '@/components/wizard/DraftManager';

// We'll create agency-specific step components
import { GradientInput } from '@/components/ui/GradientInput';
import { GradientTextarea } from '@/components/ui/GradientTextarea';
import { GradientSelect, GradientSelectItem } from '@/components/ui/GradientSelect';
import { GradientCheckbox } from '@/components/ui/GradientCheckbox';

type FormValues = {
  // Basic Info
  name: string;
  slug: string;
  description: string;
  website: string;
  // Contact Info
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  logo: string | null;
  // Terms
  termsAccepted: boolean;
};

const STEPS = [
  { id: 1, title: 'Agency Info', icon: Building2 },
  { id: 2, title: 'Contact Details', icon: Phone },
  { id: 3, title: 'Review', icon: FileText },
];

const SA_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

export default function AgencySetupWizard() {
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [, setLocation] = useLocation();
  const [showResumeDraftDialog, setShowResumeDraftDialog] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      logo: null,
      termsAccepted: false,
    },
  });

  const createAgency = trpc.agency.createOnboarding.useMutation();
  const { data: user } = trpc.auth.me.useQuery();

  const formValues = watch();

  // Auto-generate slug from name
  useEffect(() => {
    if (formValues.name && !formValues.slug) {
      const slug = formValues.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setValue('slug', slug);
    }
  }, [formValues.name, formValues.slug, setValue]);

  // Auto-save hook
  const { lastSaved, isSaving: isAutoSaving, error: autoSaveError } = useAutoSave(
    {
      step,
      completedSteps,
      ...formValues,
    },
    {
      storageKey: 'agency-registration-draft',
      debounceMs: 2000,
      enabled: step > 1 && !createAgency.isPending,
      onError: (error) => {
        console.error('Auto-save error:', error);
        toast.error('Failed to auto-save draft');
      },
    }
  );

  // Check for draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('agency-registration-draft');
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        
        const hasMeaningfulProgress = 
          draft.step > 1 || 
          draft.name || 
          draft.email;
        
        if (hasMeaningfulProgress) {
          setShowResumeDraftDialog(true);
        }
      } catch (error) {
        console.error('Error parsing draft:', error);
        localStorage.removeItem('agency-registration-draft');
      }
    }
  }, []);

  // Pre-fill email from user
  useEffect(() => {
    if (user?.email && !formValues.email) {
      setValue('email', user.email);
    }
  }, [user, formValues.email, setValue]);

  const handleResumeDraft = () => {
    setShowResumeDraftDialog(false);
    
    const savedDraft = localStorage.getItem('agency-registration-draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        
        reset({
          name: draft.name || '',
          slug: draft.slug || '',
          description: draft.description || '',
          website: draft.website || '',
          email: draft.email || user?.email || '',
          phone: draft.phone || '',
          address: draft.address || '',
          city: draft.city || '',
          province: draft.province || '',
          logo: draft.logo || null,
          termsAccepted: false,
        });
        
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
    localStorage.removeItem('agency-registration-draft');
    reset();
    setStep(1);
    setCompletedSteps([]);
    toast.info('Starting fresh registration');
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setDraftSaved(false);

    try {
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

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!(formValues.name && formValues.slug);
      case 2:
        return !!(formValues.email && formValues.city && formValues.province);
      case 3:
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

      await createAgency.mutateAsync({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        website: data.website || null,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city,
        province: data.province,
        logo: data.logo || null,
      });

      toast.success('Agency registered successfully!');
      localStorage.removeItem('agency-registration-draft');
      setLocation('/agency-dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to register agency');
    }
  };

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
          totalSteps: 3,
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
            Agency Registration
          </h1>
          <p className="text-gray-600">
            Join our platform as a verified real estate agency
          </p>
          
          {/* Auto-save status */}
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
            {/* Step 1: Agency Info */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Agency Information
                  </h2>
                  <p className="text-gray-600">
                    Tell us about your real estate agency
                  </p>
                </div>

                <GradientInput
                  label="Agency Name"
                  placeholder="e.g. Premier Properties"
                  required
                  {...register('name', { required: 'Agency name is required' })}
                  error={errors.name?.message}
                />

                <GradientInput
                  label="URL Slug"
                  placeholder="premier-properties"
                  required
                  {...register('slug', { required: 'Slug is required' })}
                  error={errors.slug?.message}
                  helperText="This will be used in your agency's URL"
                />

                <GradientTextarea
                  label="Agency Description"
                  placeholder="Tell us about your agency..."
                  rows={4}
                  autoResize
                  {...register('description')}
                  helperText="Brief overview of your agency and services"
                />

                <GradientInput
                  label="Website"
                  type="url"
                  placeholder="https://www.example.com"
                  {...register('website')}
                  helperText="Your agency website (optional)"
                />
              </div>
            )}

            {/* Step 2: Contact Details */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Contact Details
                  </h2>
                  <p className="text-gray-600">
                    How can clients reach your agency?
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GradientInput
                    label="Email Address"
                    type="email"
                    placeholder="contact@agency.com"
                    required
                    {...register('email', { required: 'Email is required' })}
                    error={errors.email?.message}
                  />

                  <GradientInput
                    label="Phone Number"
                    type="tel"
                    placeholder="+27 12 345 6789"
                    {...register('phone')}
                  />
                </div>

                <GradientInput
                  label="Physical Address"
                  placeholder="123 Main Street"
                  {...register('address')}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GradientInput
                    label="City"
                    placeholder="Cape Town"
                    required
                    {...register('city', { required: 'City is required' })}
                    error={errors.city?.message}
                  />

                  <GradientSelect
                    label="Province"
                    placeholder="Select province"
                    required
                    value={formValues.province}
                    onValueChange={(value) => setValue('province', value)}
                    error={errors.province?.message}
                  >
                    {SA_PROVINCES.map((province) => (
                      <GradientSelectItem key={province} value={province}>
                        {province}
                      </GradientSelectItem>
                    ))}
                  </GradientSelect>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Review & Submit
                  </h2>
                  <p className="text-gray-600">
                    Please review your information before submitting
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Agency Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-100">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Agency Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Agency Name</p>
                        <p className="font-medium text-gray-900">{formValues.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">URL Slug</p>
                        <p className="font-medium text-gray-900">{formValues.slug}</p>
                      </div>
                      {formValues.website && (
                        <div className="col-span-2">
                          <p className="text-gray-600">Website</p>
                          <p className="font-medium text-gray-900">{formValues.website}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-100">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-green-600" />
                      Contact Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Email</p>
                        <p className="font-medium text-gray-900">{formValues.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Phone</p>
                        <p className="font-medium text-gray-900">
                          {formValues.phone || 'Not specified'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">Location</p>
                        <p className="font-medium text-gray-900">
                          {formValues.city}, {formValues.province}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <GradientCheckbox
                  label="I accept the Terms and Conditions"
                  description="By checking this box, you agree to our Agency Terms of Service and Privacy Policy."
                  checked={formValues.termsAccepted}
                  onCheckedChange={(checked) =>
                    setValue('termsAccepted', checked as boolean)
                  }
                  error={
                    !formValues.termsAccepted && step === 3
                      ? 'You must accept the terms to continue'
                      : undefined
                  }
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
                {step < 3 && (
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

                {step < 3 ? (
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
                    loading={createAgency.isPending}
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
