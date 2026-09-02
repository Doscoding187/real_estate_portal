import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Palette,
  Users,
  CreditCard,
  CheckCircle,
  Upload,
  Globe,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { useCommercialCatalog, type CommercialProduct } from '@/hooks/useCommercialCatalog';
import {
  getCommercialPricePresentation,
  getCommercialTermPresentation,
} from '@/lib/commercialCatalog';
import { onboardingConfig } from '@/lib/config/onboarding';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Step 1: Basic Info Schema
const basicInfoSchema = z.object({
  name: z.string().min(2, 'Agency name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
});

// Step 2: Branding Schema
const brandingSchema = z.object({
  logoUrl: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  tagline: z.string().max(100, 'Tagline must be less than 100 characters').optional(),
  companyName: z.string().min(2, 'Company name is required'),
});

// Step 3: Team Setup Schema
const teamSetupSchema = z.object({
  inviteAgents: z.boolean().default(false),
  agentEmails: z.array(z.string().email()).optional(),
});

// Step 4: Plan Selection Schema
const planSelectionSchema = z.object({
  selectedPlanId: z.number(),
  agreeToTerms: z.boolean().refine(val => val, 'You must agree to the terms'),
});

type BasicInfoData = z.infer<typeof basicInfoSchema>;
type BrandingData = z.infer<typeof brandingSchema>;
type TeamSetupData = z.infer<typeof teamSetupSchema>;
type PlanSelectionData = z.infer<typeof planSelectionSchema>;

const STEPS = [
  { id: 1, title: 'Agency foundation', description: 'Establish the business account' },
  { id: 2, title: 'Agency identity', description: 'Set the business identity' },
  { id: 3, title: 'Team launch', description: 'Invite people who will own work' },
  { id: 4, title: 'Launch Access', description: 'Confirm the Agency workspace' },
  { id: 5, title: 'Invoice handoff', description: 'Request the EFT invoice' },
];

const AgencyOnboarding: React.FC = () => {
  const utils = trpc.useUtils();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);

  // Form data state
  const [basicInfo, setBasicInfo] = useState<BasicInfoData | null>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [teamSetup, setTeamSetup] = useState<TeamSetupData | null>(null);
  const [planSelection, setPlanSelection] = useState<PlanSelectionData | null>(null);

  // Draft persistence
  const { saveDraft, loadDraft, clearDraft } = useOnboardingDraft();

  // API calls. The plan step reads the same canonical commercial catalog as
  // the public proposition so once-off Launch Access terms cannot be
  // misrepresented by legacy price/interval storage columns.
  const { data: commercialCatalog } = useCommercialCatalog('agency');
  const plans: CommercialProduct[] = commercialCatalog?.products ?? [];
  const createAgencyMutation = trpc.agency.createOnboarding.useMutation();
  const createCheckoutMutation = trpc.billing.createCheckoutSession.useMutation();

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setDraftData(draft);
      setShowResumeModal(true);
    }
  }, [loadDraft]);

  // Auto-save form data
  useEffect(() => {
    const formData = { basicInfo, branding, teamSetup, planSelection };
    saveDraft(formData, currentStep);
  }, [basicInfo, branding, teamSetup, planSelection, currentStep, saveDraft]);

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!basicInfo || !branding || !planSelection) {
      toast.error('Missing Information', {
        description: 'Please complete all required steps before continuing.',
      });
      return;
    }

    try {
      // Step 1: Create agency with pending_payment status
      const agency = await createAgencyMutation.mutateAsync({
        basicInfo,
        branding,
        teamEmails: teamSetup?.agentEmails || [],
        planId: planSelection.selectedPlanId,
      });

      if (agency.alreadyCreated) {
        toast.info('Resuming agency setup', {
          description: 'Your agency already exists. Continuing to the existing payment request.',
        });
      }

      // Make the upgraded agency-admin identity visible to route guards and workspace queries.
      await Promise.all([
        utils.auth.me.invalidate(),
        utils.agency.getOnboardingStatus.invalidate(),
      ]).catch(error => {
        console.warn('Agency session refresh failed after onboarding:', error);
      });

      // Step 2: Issue a manual EFT invoice and hand off to billing.
      const checkout = await createCheckoutMutation.mutateAsync({
        // A retry must use the server-owned subscription plan, not stale form state.
        planId: agency.alreadyCreated ? agency.planId : planSelection.selectedPlanId,
        successUrl: `${window.location.origin}/agency/onboarding/success?agency_id=${agency.agencyId}`,
        cancelUrl: onboardingConfig.urls.cancel(4),
      });

      // Clear draft after successful agency creation and invoice issue.
      clearDraft();

      // Redirect to the invoice handoff.
      if (checkout.url) {
        window.location.href = checkout.url;
      } else {
        throw new Error('No billing handoff URL received');
      }
    } catch (error) {
      console.error('Agency setup error:', error);
      toast.error('Setup Failed', {
        description:
          error instanceof Error
            ? error.message
            : 'There was an error setting up your agency. Please try again.',
      });
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {STEPS.map(step => (
          <div key={step.id} className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${
                currentStep === step.id
                  ? 'bg-primary text-primary-foreground'
                  : completedSteps.includes(step.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {completedSteps.includes(step.id) ? <CheckCircle className="w-5 h-5" /> : step.id}
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">{step.title}</div>
              <div className="text-xs text-gray-500">{step.description}</div>
            </div>
          </div>
        ))}
      </div>
      <Progress value={(currentStep / STEPS.length) * 100} className="w-full" />
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            onNext={data => {
              setBasicInfo(data);
              nextStep();
            }}
          />
        );
      case 2:
        return (
          <BrandingStep
            onNext={data => {
              setBranding(data);
              nextStep();
            }}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <TeamSetupStep
            onNext={data => {
              setTeamSetup(data);
              nextStep();
            }}
            onPrev={prevStep}
          />
        );
      case 4:
        return (
          <PlanSelectionStep
            plans={plans || []}
            onNext={data => {
              setPlanSelection(data);
              nextStep();
            }}
            onPrev={prevStep}
          />
        );
      case 5:
        return (
          <PaymentStep
            onComplete={handleComplete}
            onPrev={prevStep}
            isSubmitting={createAgencyMutation.isPending || createCheckoutMutation.isPending}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Build your Agency operating workspace</h1>
          <p className="mt-2 text-gray-600">
            Establish the business once, then use one connected space to manage the team,
            inventory, opportunities and commercial progress.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Set up your Agency base</CardTitle>
            <CardDescription>
              Create the Agency identity, invite your team when ready, then request the once-off
              Launch Access invoice.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {renderStepIndicator()}
            {renderStepContent()}
          </CardContent>
        </Card>
      </div>

      {/* Resume Draft Modal */}
      <Dialog open={showResumeModal} onOpenChange={setShowResumeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Your Application?</DialogTitle>
            <DialogDescription>
              You have an unfinished onboarding from{' '}
              {draftData?.savedAt ? new Date(draftData.savedAt).toLocaleDateString() : 'earlier'}.
              Would you like to continue where you left off?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                clearDraft();
                setShowResumeModal(false);
              }}
            >
              Start Fresh
            </Button>
            <Button
              onClick={() => {
                if (draftData?.data) {
                  setBasicInfo(draftData.data.basicInfo);
                  setBranding(draftData.data.branding);
                  setTeamSetup(draftData.data.teamSetup);
                  setPlanSelection(draftData.data.planSelection);
                  setCurrentStep(draftData.step);
                }
                setShowResumeModal(false);
              }}
            >
              Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Step Components
interface StepProps {
  onNext: (data: any) => void;
  onPrev?: () => void;
}

const BasicInfoStep: React.FC<StepProps> = ({ onNext }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Building2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Agency foundation</h3>
      </div>

      <form onSubmit={handleSubmit(onNext)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Agency Name *</Label>
            <Input id="name" {...register('name')} placeholder="Enter agency name" />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" {...register('phone')} placeholder="Enter phone number" />
            {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...register('website')} placeholder="Enter website URL" />
            {errors.website && <p className="text-sm text-red-600">{errors.website.message}</p>}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="address">Physical Address *</Label>
            <Input id="address" {...register('address')} placeholder="Enter full address" />
            {errors.address && <p className="text-sm text-red-600">{errors.address.message}</p>}
          </div>

          <div>
            <Label htmlFor="city">City *</Label>
            <Input id="city" {...register('city')} placeholder="Enter city" />
            {errors.city && <p className="text-sm text-red-600">{errors.city.message}</p>}
          </div>

          <div>
            <Label htmlFor="province">Province *</Label>
            <Input id="province" {...register('province')} placeholder="Enter province" />
            {errors.province && <p className="text-sm text-red-600">{errors.province.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Enter agency description"
            rows={4}
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit">Continue to Agency identity</Button>
        </div>
      </form>
    </div>
  );
};

const BrandingStep: React.FC<StepProps> = ({ onNext, onPrev }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BrandingData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b',
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Palette className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Agency identity</h3>
      </div>

      <Alert>
        <AlertDescription>
          Set the business identity people will recognise in the Agency workspace and on supported
          public-facing inventory. These settings can be changed later in Agency settings.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit(onNext)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="companyName">Display Name *</Label>
            <Input
              id="companyName"
              {...register('companyName')}
              placeholder="Agency Display Name"
            />
            {errors.companyName && (
              <p className="text-sm text-red-600">{errors.companyName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" {...register('tagline')} placeholder="Your agency's tagline" />
            {errors.tagline && <p className="text-sm text-red-600">{errors.tagline.message}</p>}
          </div>

          <div>
            <Label htmlFor="primaryColor">Primary Color *</Label>
            <div className="flex space-x-2">
              <Input id="primaryColor" {...register('primaryColor')} placeholder="#3b82f6" />
              <input
                type="color"
                {...register('primaryColor')}
                className="w-12 h-10 rounded border"
              />
            </div>
            {errors.primaryColor && (
              <p className="text-sm text-red-600">{errors.primaryColor.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="secondaryColor">Secondary Color *</Label>
            <div className="flex space-x-2">
              <Input id="secondaryColor" {...register('secondaryColor')} placeholder="#64748b" />
              <input
                type="color"
                {...register('secondaryColor')}
                className="w-12 h-10 rounded border"
              />
            </div>
            {errors.secondaryColor && (
              <p className="text-sm text-red-600">{errors.secondaryColor.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input id="logoUrl" {...register('logoUrl')} placeholder="https://example.com/logo.png" />
          <p className="text-sm text-gray-500 mt-1">
            Upload your logo to an image hosting service and paste the URL here
          </p>
          {errors.logoUrl && <p className="text-sm text-red-600">{errors.logoUrl.message}</p>}
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button type="submit">Continue to Team launch</Button>
        </div>
      </form>
    </div>
  );
};

const TeamSetupStep: React.FC<StepProps> = ({ onNext, onPrev }) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TeamSetupData>({
    defaultValues: { inviteAgents: false, agentEmails: [] },
  });

  const inviteAgents = watch('inviteAgents');
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const emailInputRef = useRef<HTMLInputElement>(null);

  const addEmail = () => {
    const trimmedEmail = emailInput.trim();
    if (trimmedEmail && !emails.includes(trimmedEmail)) {
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(trimmedEmail)) {
        const newEmails = [...emails, trimmedEmail];
        setEmails(newEmails);
        setValue('agentEmails', newEmails);
        setEmailInput('');
        emailInputRef.current?.focus();
      } else {
        toast.error('Invalid email address');
      }
    }
  };

  const removeEmail = (email: string) => {
    const newEmails = emails.filter(e => e !== email);
    setEmails(newEmails);
    setValue('agentEmails', newEmails);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Bring the team into the workspace</h3>
      </div>

      <Alert>
        <AlertDescription>
          Invite the people who will own Agency inventory, opportunities and follow-up. You can do
          this now or continue and manage the team from the workspace later.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit(onNext)} className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="inviteAgents"
            checked={inviteAgents}
            onCheckedChange={checked => setValue('inviteAgents', checked as boolean)}
          />
          <Label htmlFor="inviteAgents">I want to invite team members now</Label>
        </div>

        {inviteAgents && (
          <div className="space-y-4">
            <div>
              <Label>Agent Email Addresses</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  ref={emailInputRef}
                  type="email"
                  placeholder="agent@example.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                />
                <Button type="button" onClick={addEmail} disabled={!emailInput.trim()}>
                  Add
                </Button>
              </div>
            </div>

            {emails.length > 0 && (
              <div className="space-y-2">
                <Label>Invited Agents</Label>
                <div className="flex flex-wrap gap-2">
                  {emails.map(email => (
                    <Badge key={email} variant="secondary" className="flex items-center space-x-1">
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="ml-1 text-xs hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button type="submit">Continue to Launch Access</Button>
        </div>
      </form>
    </div>
  );
};

export interface PlanSelectionStepProps extends StepProps {
  plans: CommercialProduct[];
}

/**
 * Present a catalog product's billing truth. Once-off Launch Access products
 * must never inherit the legacy "/{interval}" price rendering; recurring
 * plans keep their recurring interval presentation.
 */
export function describeAgencyPlanBilling(product: CommercialProduct): {
  priceLabel: string;
  periodSuffix: string | null;
  termNote: string | null;
} {
  const price = getCommercialPricePresentation(product);
  const term = getCommercialTermPresentation(product);

  if (price.kind !== 'fixed') {
    return { priceLabel: price.label, periodSuffix: null, termNote: null };
  }

  if (product.pricing.billingInterval === 'once') {
    const noteParts = [
      product.term.durationDays ? `Access period: ${term.label}` : null,
      term.renewalLabel,
    ].filter(Boolean);
    return {
      priceLabel: price.label,
      periodSuffix: 'once-off',
      termNote: noteParts.length > 0 ? noteParts.join(' · ') : null,
    };
  }

  return {
    priceLabel: price.label,
    periodSuffix: price.period ? price.period.trim() : null,
    termNote: term.renewalLabel,
  };
}

export const PlanSelectionStep: React.FC<PlanSelectionStepProps> = ({ plans, onNext, onPrev }) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlanSelectionData>({
    resolver: zodResolver(planSelectionSchema),
  });

  const selectedPlanId = watch('selectedPlanId');
  const agreeToTerms = watch('agreeToTerms');

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Choose Your Plan</h3>
      </div>

      <Alert>
        <AlertDescription>
          Select the plan that best fits your agency's needs. Your selection determines the invoice
          issued at the end of this wizard.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit(onNext)} className="space-y-6">
        {plans.length === 0 ? (
          <p className="text-sm text-gray-500" role="status">
            Loading available agency plans…
          </p>
        ) : null}
        <RadioGroup
          value={selectedPlanId?.toString()}
          onValueChange={value => setValue('selectedPlanId', parseInt(value))}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {plans.map(plan => {
            const planValue = plan.source.planId;
            const billing = describeAgencyPlanBilling(plan);
            return (
              <div key={planValue} className="relative">
                <RadioGroupItem
                  value={planValue.toString()}
                  id={`plan-${planValue}`}
                  className="sr-only"
                />
                <Label
                  htmlFor={`plan-${planValue}`}
                  className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedPlanId === planValue
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${plan.popular ? 'ring-2 ring-primary/20' : ''}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-4 bg-primary">Most Popular</Badge>
                  )}

                  <div className="text-center">
                    <h4 className="text-lg font-semibold">{plan.displayName}</h4>
                    <div className="text-2xl font-bold text-primary my-2" data-testid="plan-price">
                      {billing.priceLabel}
                      {billing.periodSuffix ? (
                        <span className="ml-1 text-sm font-semibold text-gray-600">
                          {billing.periodSuffix}
                        </span>
                      ) : null}
                    </div>
                    {billing.termNote ? (
                      <p className="text-xs font-medium text-gray-500 mb-2" data-testid="plan-term-note">
                        {billing.termNote}
                      </p>
                    ) : null}

                    {plan.description && (
                      <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                    )}

                    {plan.benefits.length > 0 && (
                      <ul className="text-sm text-left space-y-1">
                        {plan.benefits.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        {errors.selectedPlanId && (
          <p className="text-sm text-red-600">{errors.selectedPlanId.message}</p>
        )}

        <Separator />

        <div className="space-y-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="agreeToTerms"
              checked={agreeToTerms}
              onCheckedChange={checked => setValue('agreeToTerms', checked as boolean)}
            />
            <Label htmlFor="agreeToTerms" className="text-sm leading-relaxed">
              I agree to the{' '}
              <a href="/terms" className="text-primary hover:underline" target="_blank">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-primary hover:underline" target="_blank">
                Privacy Policy
              </a>
              *
            </Label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-600">{errors.agreeToTerms.message}</p>
          )}
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button type="submit" disabled={!selectedPlanId || !agreeToTerms}>
            Continue to Payment
          </Button>
        </div>
      </form>
    </div>
  );
};

const PaymentStep: React.FC<{ onComplete: () => void; onPrev: () => void; isSubmitting?: boolean }> = ({
  onComplete,
  onPrev,
  isSubmitting = false,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Request your Launch Access invoice</h3>
      </div>

      <Alert>
        <AlertDescription>
          Your Agency profile and Launch Access selection are ready. Issue the invoice, then use
          Billing to complete manual EFT and submit proof for finance verification.
        </AlertDescription>
      </Alert>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-semibold mb-4">What happens next?</h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Invoice issued:</strong> Your EFT invoice and payment reference will be ready
              immediately
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Proof upload:</strong> Pay by EFT, then upload proof in the billing workspace
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Activation review:</strong> The supported Agency workspace unlocks after
              finance approves the payment proof
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Team launch:</strong> Bring people into the Agency workspace so inventory,
              opportunities and follow-up have clear operating owners
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onComplete} size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Issuing Invoice...' : 'Issue Invoice'}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default AgencyOnboarding;
