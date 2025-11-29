/**
 * Enhanced Developer Setup Wizard
 * Multi-step registration form with Soft UI gradient components
 * 
 * Requirements: All Section 10 tasks
 */

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { Building2, Phone, Briefcase, FileText, Save } from 'lucide-react';

// Gradient Components
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientInput } from '@/components/ui/GradientInput';
import { GradientTextarea } from '@/components/ui/GradientTextarea';
import { GradientSelect, GradientSelectItem } from '@/components/ui/GradientSelect';
import { GradientCheckbox } from '@/components/ui/GradientCheckbox';
import { GradientProgressIndicator } from '@/components/wizard/GradientProgressIndicator';

type FormValues = {
  name: string;
  specializations: string[];
  establishedYear?: number;
  description?: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city: string;
  province: string;
  totalProjects?: number;
  completedProjects?: number;
  currentProjects?: number;
  upcomingProjects?: number;
  logo?: string;
  acceptTerms: boolean;
};

const STEPS = [
  { id: 1, title: 'Company Info', icon: Building2 },
  { id: 2, title: 'Contact Details', icon: Phone },
  { id: 3, title: 'Portfolio', icon: Briefcase },
  { id: 4, title: 'Review', icon: FileText },
];

const SPECIALIZATION_OPTIONS = [
  { value: 'residential', label: 'Residential', description: 'Houses, apartments, estates' },
  { value: 'commercial', label: 'Commercial', description: 'Offices, retail, business parks' },
  { value: 'mixed_use', label: 'Mixed Use', description: 'Combined residential & commercial' },
  { value: 'industrial', label: 'Industrial', description: 'Warehouses, factories, logistics' },
  { value: 'luxury', label: 'Luxury', description: 'High-end properties' },
  { value: 'affordable', label: 'Affordable Housing', description: 'Budget-friendly developments' },
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

export default function DeveloperSetupWizardEnhanced() {
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [, setLocation] = useLocation();

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
      specializations: [],
      totalProjects: 0,
      completedProjects: 0,
      currentProjects: 0,
      upcomingProjects: 0,
      acceptTerms: false,
    },
  });

  const createProfile = trpc.developer.createProfile.useMutation();
  const getProfile = trpc.developer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: user } = trpc.auth.me.useQuery();

  const formValues = watch();

  // Load existing draft or pre-fill email
  useEffect(() => {
    if (getProfile.data) {
      const data = getProfile.data;
      reset({
        name: data.name,
        specializations:
          typeof data.specializations === 'string'
            ? (JSON.parse(data.specializations) as string[])
            : ((data.specializations || []) as string[]),
        establishedYear: data.establishedYear || undefined,
        description: data.description || '',
        email: data.email || user?.email || '',
        phone: data.phone || '',
        website: data.website || '',
        address: data.address || '',
        city: data.city || '',
        province: data.province || '',
        totalProjects: data.totalProjects || 0,
        completedProjects: data.completedProjects || 0,
        currentProjects: data.currentProjects || 0,
        upcomingProjects: data.upcomingProjects || 0,
        logo: data.logo || '',
        acceptTerms: false,
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
        return !!(formValues.name && formValues.specializations.length > 0);
      case 2:
        return !!(formValues.email && formValues.city && formValues.province);
      case 3:
        return true; // Portfolio is optional
      case 4:
        return formValues.acceptTerms;
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
      if (!data.acceptTerms) {
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
        totalProjects: data.totalProjects ? Number(data.totalProjects) : 0,
        completedProjects: data.completedProjects ? Number(data.completedProjects) : 0,
        currentProjects: data.currentProjects ? Number(data.currentProjects) : 0,
        upcomingProjects: data.upcomingProjects ? Number(data.upcomingProjects) : 0,
        logo: data.logo || null,
      });

      toast.success('Profile submitted for review successfully!');
      setLocation('/developer-dashboard');
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Developer Registration
          </h1>
          <p className="text-gray-600">
            Join our platform as a verified property developer
          </p>
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
            {/* Step 1: Company Info */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Company Information
                  </h2>
                  <p className="text-gray-600">
                    Tell us about your development company
                  </p>
                </div>

                <GradientInput
                  label="Company Name"
                  placeholder="e.g. Apex Developments"
                  required
                  {...register('name', { required: 'Company name is required' })}
                  error={errors.name?.message}
                />

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Development Specializations
                    <span className="ml-1 bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent font-semibold">
                      *
                    </span>
                  </label>
                  <p className="text-sm text-gray-500">
                    Select all types of developments your company specializes in
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SPECIALIZATION_OPTIONS.map((spec) => (
                      <GradientCheckbox
                        key={spec.value}
                        label={spec.label}
                        description={spec.description}
                        checked={formValues.specializations?.includes(spec.value)}
                        onCheckedChange={(checked) => {
                          const current = formValues.specializations || [];
                          if (checked) {
                            setValue('specializations', [...current, spec.value]);
                          } else {
                            setValue(
                              'specializations',
                              current.filter((s) => s !== spec.value)
                            );
                          }
                        }}
                      />
                    ))}
                  </div>
                  {formValues.specializations?.length === 0 && (
                    <p className="text-sm bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent font-medium">
                      Please select at least one specialization
                    </p>
                  )}
                </div>

                <GradientInput
                  label="Established Year"
                  type="number"
                  placeholder="e.g. 2010"
                  {...register('establishedYear')}
                  helperText="Year your company was founded"
                />

                <GradientTextarea
                  label="Company Description"
                  placeholder="Tell us about your company..."
                  rows={4}
                  autoResize
                  {...register('description')}
                  helperText="Brief overview of your company and expertise"
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
                    How can we reach you?
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GradientInput
                    label="Email Address"
                    type="email"
                    placeholder="contact@company.com"
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
                  label="Website"
                  type="url"
                  placeholder="https://www.example.com"
                  {...register('website')}
                  helperText="Your company website (optional)"
                />

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

            {/* Step 3: Portfolio */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Portfolio Overview
                  </h2>
                  <p className="text-gray-600">
                    Tell us about your development experience
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GradientInput
                    label="Total Projects (Since Inception)"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register('totalProjects')}
                    helperText="All projects combined"
                  />

                  <GradientInput
                    label="Completed Developments"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register('completedProjects')}
                    helperText="100% complete and handed over"
                  />

                  <GradientInput
                    label="Current Developments"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register('currentProjects')}
                    helperText="Active projects under construction"
                  />

                  <GradientInput
                    label="Upcoming Projects"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register('upcomingProjects')}
                    helperText="Future launches approved or announced"
                  />
                </div>

                {/* Portfolio Summary */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-100">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Portfolio Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {formValues.totalProjects || 0}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {formValues.completedProjects || 0}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        {formValues.currentProjects || 0}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Active</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {formValues.upcomingProjects || 0}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Pipeline</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
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
                  {/* Company Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-100">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Company Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Company Name</p>
                        <p className="font-medium text-gray-900">{formValues.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Established</p>
                        <p className="font-medium text-gray-900">
                          {formValues.establishedYear || 'Not specified'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">Specializations</p>
                        <p className="font-medium text-gray-900">
                          {formValues.specializations
                            ?.map((s) =>
                              SPECIALIZATION_OPTIONS.find((opt) => opt.value === s)
                                ?.label
                            )
                            .join(', ')}
                        </p>
                      </div>
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

                  {/* Portfolio */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-100">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-purple-600" />
                      Portfolio
                    </h3>
                    <div className="grid grid-cols-4 gap-4 text-sm text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {formValues.totalProjects || 0}
                        </p>
                        <p className="text-gray-600">Total</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {formValues.completedProjects || 0}
                        </p>
                        <p className="text-gray-600">Completed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {formValues.currentProjects || 0}
                        </p>
                        <p className="text-gray-600">Active</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">
                          {formValues.upcomingProjects || 0}
                        </p>
                        <p className="text-gray-600">Pipeline</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <GradientCheckbox
                  label="I accept the Terms and Conditions"
                  description="By checking this box, you agree to our Developer Terms of Service and Privacy Policy. Your application will be reviewed by our team."
                  checked={formValues.acceptTerms}
                  onCheckedChange={(checked) =>
                    setValue('acceptTerms', checked as boolean)
                  }
                  error={
                    !formValues.acceptTerms && step === 4
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
                {step < 4 && (
                  <GradientButton
                    type="button"
                    variant="outline"
                    icon={Save}
                  >
                    Save Draft
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
                    disabled={!formValues.acceptTerms}
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
