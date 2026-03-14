import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail, Phone, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { formatSARandShort } from '@/lib/bond-calculator';
import { trackFunnelStep } from '@/lib/analytics/advertiseTracking';

type LeadDialogMode = 'brochure' | 'contact' | 'qualification';

interface DevelopmentLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: LeadDialogMode;
  ctaLocation?: string;
  development: {
    id: number;
    name: string;
    developerBrandProfileId?: number | null;
    brochureUrl?: string | null;
  };
  affordabilityData?: {
    monthlyIncome?: number;
    availableDeposit?: number;
    maxAffordable?: number;
    calculatedAt?: string;
  } | null;
}

const MODE_COPY: Record<
  LeadDialogMode,
  {
    title: string;
    description: string;
    submitLabel: string;
    leadSource: string;
    successMessage: string;
  }
> = {
  brochure: {
    title: 'Download Brochure',
    description:
      'Share your details to receive the brochure and pricing pack for this development.',
    submitLabel: 'Unlock Brochure',
    leadSource: 'development_detail_brochure',
    successMessage: 'Brochure request submitted.',
  },
  contact: {
    title: 'Contact Sales Team',
    description:
      'Send your enquiry and the sales team can respond with availability, pricing, and next steps.',
    submitLabel: 'Send Enquiry',
    leadSource: 'development_detail_contact',
    successMessage: 'Your enquiry has been sent.',
  },
  qualification: {
    title: 'Start Full Qualification',
    description:
      'Submit your details to continue with a full affordability review for this development.',
    submitLabel: 'Start Qualification',
    leadSource: 'development_detail_qualification',
    successMessage: 'Qualification request submitted.',
  },
};

export function DevelopmentLeadDialog({
  open,
  onOpenChange,
  mode,
  ctaLocation,
  development,
  affordabilityData,
}: DevelopmentLeadDialogProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setForm({
        name: '',
        email: '',
        phone: '',
        message: '',
      });
      setErrors({});
    }
  }, [open]);

  const copy = MODE_COPY[mode];

  const generatedMessage = useMemo(() => {
    if (mode === 'brochure') {
      return `Please send me the brochure and latest pricing for ${development.name}.`;
    }

    if (mode === 'qualification') {
      const incomeLine = affordabilityData?.monthlyIncome
        ? ` My household income is ${formatSARandShort(affordabilityData.monthlyIncome)} per month.`
        : '';
      const depositLine = affordabilityData?.availableDeposit
        ? ` I have an available deposit of ${formatSARandShort(affordabilityData.availableDeposit)}.`
        : '';
      const buyingPowerLine = affordabilityData?.maxAffordable
        ? ` My estimated buying power is ${formatSARandShort(affordabilityData.maxAffordable)}.`
        : '';

      return `I would like to start a full qualification review for ${development.name}.${incomeLine}${depositLine}${buyingPowerLine}`.trim();
    }

    return `I am interested in ${development.name}. Please contact me with pricing, availability, and next steps.`;
  }, [
    affordabilityData?.availableDeposit,
    affordabilityData?.maxAffordable,
    affordabilityData?.monthlyIncome,
    development.name,
    mode,
  ]);

  const createLead = trpc.developer.createLead.useMutation({
    onSuccess: () => {
      trackFunnelStep({
        funnel: 'development_detail',
        step: mode,
        action: 'lead_submitted',
        path: ctaLocation || 'unknown',
      });
      toast.success(copy.successMessage);
      onOpenChange(false);

      if (mode === 'brochure' && development.brochureUrl) {
        const newWindow = window.open(development.brochureUrl, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
          window.location.href = development.brochureUrl;
        }
      } else if (mode === 'brochure') {
        toast.info('The sales team will send the brochure to you shortly.');
      }
    },
    onError: error => {
      toast.error(error.message || 'Unable to submit your request.');
    },
  });

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) nextErrors.name = 'Name is required.';
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      nextErrors.email = 'Enter a valid email address.';
    if (!form.phone.trim()) nextErrors.phone = 'Phone number is required.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    createLead.mutate({
      developmentId: development.id,
      developerBrandProfileId: development.developerBrandProfileId ?? undefined,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      message: form.message.trim() || generatedMessage,
      leadSource: copy.leadSource,
      referrerUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      affordabilityData:
        affordabilityData &&
        (affordabilityData.monthlyIncome ||
          affordabilityData.availableDeposit ||
          affordabilityData.maxAffordable)
          ? affordabilityData
          : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-orange-100 p-2 text-orange-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{development.name}</p>
                <p className="text-xs text-slate-500">
                  Your details are used to connect you with the correct sales and qualification
                  team.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Input
                placeholder="Full name"
                value={form.name}
                onChange={e => {
                  setForm(prev => ({ ...prev, name: e.target.value }));
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <Input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={e => {
                  setForm(prev => ({ ...prev, email: e.target.value }));
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <Input
                type="tel"
                placeholder="Phone number"
                value={form.phone}
                onChange={e => {
                  setForm(prev => ({ ...prev, phone: e.target.value }));
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                }}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <Textarea
                placeholder="Message (optional)"
                value={form.message}
                onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                className="min-h-[96px]"
              />
              <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Suggested message
                </p>
                <p className="mt-1 text-sm text-slate-600">{generatedMessage}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-200">
              <Mail className="h-3.5 w-3.5" />
              Lead Capture
            </div>
            <p className="mt-1 text-sm text-slate-200">
              Your request will be stored against this development so the team can follow up
              properly.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                Direct follow-up
              </span>
              <span>Qualified lead attribution</span>
            </div>
          </div>

          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            disabled={createLead.isPending}
            onClick={handleSubmit}
          >
            {createLead.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              copy.submitLabel
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
