import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Bath, Bed, Loader2, Mail, Phone, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { formatSARandShort } from '@/lib/bond-calculator';
import { trackFunnelStep } from '@/lib/analytics/advertiseTracking';
import { formatPriceCompact } from '@/lib/formatPrice';
import { createLeadCaptureRequestId, publicLeadConsent } from '@/lib/leadCapture';

type LeadDialogMode = 'brochure' | 'contact' | 'qualification' | 'info' | 'viewing';

interface DevelopmentLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: LeadDialogMode;
  listingType?: 'sale' | 'rent';
  ctaLocation?: string;
  unitContext?: {
    id?: number | string | null;
    name?: string | null;
    unitId?: string;
    unitName?: string;
    unitPriceFrom?: number;
    unitBedrooms?: number;
    unitBathrooms?: number;
  } | null;
  development: {
    id: number;
    name: string;
    cataloguePublisherId?: number | null;
    brochureUrl?: string | null;
    transactionType?: 'for_sale' | 'for_rent';
    publisherAuthorityKind?: 'platform_reference' | 'developer_first_party';
    isSoldOut?: boolean;
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
  info: {
    title: 'Request Information',
    description:
      'Share your details to receive the latest pricing, specifications, and next steps for this unit.',
    submitLabel: 'Request Information',
    leadSource: 'development_detail_info',
    successMessage: 'Information request submitted.',
  },
  viewing: {
    title: 'Request a Viewing',
    description:
      'Share your details and the rental team will follow up about a suitable viewing time.',
    submitLabel: 'Request a Viewing',
    leadSource: 'development_detail_viewing',
    successMessage: 'Your viewing request has been sent.',
  },
};

function getModeCopy(
  mode: LeadDialogMode,
  isRentalListing: boolean,
  isPlatformReference: boolean,
  isSoldOut: boolean,
) {
  const copy = MODE_COPY[mode];

  if (isPlatformReference) {
    if (mode === 'contact') {
      return {
        ...copy,
        title: isSoldOut ? 'Register Interest' : 'Send Enquiry',
        description: isSoldOut
          ? 'Share your details with Property Listify to register interest in this sold-out development. The request will be reviewed with the correct unit context.'
          : 'Share your details with Property Listify. This enquiry is managed as a platform reference and is not a direct message to an external developer.',
        submitLabel: isSoldOut ? 'Register Interest' : 'Send Enquiry',
        successMessage: isSoldOut ? 'Your interest has been registered.' : 'Your enquiry has been submitted.',
      };
    }

    if (mode === 'viewing') {
      return {
        ...copy,
        description:
          'Share your details with Property Listify to request a viewing. The request will be reviewed with this development and unit context.',
      };
    }

    if (mode === 'brochure') {
      return {
        ...copy,
        description:
          'Share your details with Property Listify to request the available brochure and pricing information for this development.',
      };
    }

    if (mode === 'info') {
      return {
        ...copy,
        description:
          'Share your details with Property Listify to request the latest pricing, specifications, and availability for this unit.',
      };
    }

    return copy;
  }

  if (!isRentalListing) return copy;

  if (mode === 'contact') {
    return {
      ...copy,
      title: 'Contact Rental Team',
      description:
        'Send your enquiry and the rental team can respond with availability, monthly rent, and next steps.',
    };
  }

  if (mode === 'info') {
    return {
      ...copy,
      title: 'Request Rental Information',
      description:
        'Share your details to receive the latest monthly rent, specifications, and availability for this unit.',
    };
  }

  if (mode === 'brochure') {
    return {
      ...copy,
      description:
        'Share your details to receive the rental brochure and latest monthly pricing for this development.',
    };
  }

  return copy;
}

export function DevelopmentLeadDialog({
  open,
  onOpenChange,
  mode,
  listingType = 'sale',
  ctaLocation,
  unitContext,
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
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [captureRequestId, setCaptureRequestId] = useState(() => createLeadCaptureRequestId());

  useEffect(() => {
    if (!open) {
      setForm({
        name: '',
        email: '',
        phone: '',
        message: '',
      });
      setErrors({});
      setConsentAccepted(false);
      setCaptureRequestId(createLeadCaptureRequestId());
    }
  }, [open]);

  const isRentalListing =
    (development.transactionType ?? (listingType === 'rent' ? 'for_rent' : 'for_sale')) ===
    'for_rent';
  const isPlatformReference = development.publisherAuthorityKind === 'platform_reference';
  const isSoldOut = development.isSoldOut === true;
  const copy = getModeCopy(mode, isRentalListing, isPlatformReference, isSoldOut);
  const custodyDescription = isPlatformReference
    ? 'Property Listify manages this enquiry and will review the request with the development and unit context. It is not a direct message to an external developer.'
    : `This enquiry will be routed with the right development and unit context so the ${isRentalListing ? 'rental' : 'sales'} team can follow up with the correct information.`;
  const resolvedUnitName = unitContext?.unitName || unitContext?.name || null;
  const resolvedUnitId =
    unitContext?.unitId ||
    (unitContext?.id !== null && unitContext?.id !== undefined
      ? String(unitContext.id)
      : undefined);

  const generatedMessage = useMemo(() => {
    const subject = resolvedUnitName?.trim()
      ? `${resolvedUnitName} at ${development.name}`
      : development.name;

    if (mode === 'brochure') {
      return isRentalListing
        ? `Please send me the brochure and latest monthly rent details for ${subject}.`
        : `Please send me the brochure and latest pricing for ${subject}.`;
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

      return `I would like to start a full qualification review for ${subject}.${incomeLine}${depositLine}${buyingPowerLine}`.trim();
    }

    if (mode === 'viewing') {
      return `I would like to request a viewing for ${subject}. Please contact me to discuss a suitable time.`;
    }

    if (mode === 'info') {
      return isRentalListing
        ? `Please send me more information about ${subject}, including monthly rent, specifications, and availability.`
        : `Please send me more information about ${subject}, including pricing, specifications, and available options.`;
    }

    return isRentalListing
      ? `I am interested in renting ${subject}. Please contact me with monthly rent, availability, and next steps.`
      : isPlatformReference && isSoldOut
        ? `I would like to register my interest in ${subject}. Please review my request with the available development and unit information.`
        : isPlatformReference
          ? `I am interested in ${subject}. Please review my enquiry with the latest available pricing, availability, and next steps.`
      : `I am interested in ${subject}. Please contact me with pricing, availability, and next steps.`;
  }, [
    affordabilityData?.availableDeposit,
    affordabilityData?.maxAffordable,
    affordabilityData?.monthlyIncome,
    development.name,
    mode,
    isRentalListing,
    isPlatformReference,
    isSoldOut,
    resolvedUnitName,
  ]);

  const createLead = trpc.developer.createLead.useMutation({
    onSuccess: result => {
      if ('ignored' in result) return;
      trackFunnelStep({
        funnel: 'development_detail',
        step: mode,
        action: 'lead_submitted',
        path: ctaLocation || 'unknown',
      });
      toast.success(
        result?.message ||
          (result?.deliveryStatus === 'delivered'
            ? copy.successMessage
            : result?.deliveryStatus === 'attention_required'
              ? isPlatformReference
                ? 'Your request was received. Property Listify review is still required.'
                : `Your request was received. ${isRentalListing ? 'Rental' : 'Sales'} follow-up still needs attention.`
              : isPlatformReference
                ? 'Your request was received and is being reviewed by Property Listify.'
                : `Your request was received. ${isRentalListing ? 'Rental' : 'Sales'} delivery is being completed.`),
      );
      onOpenChange(false);

      if (mode === 'brochure' && development.brochureUrl) {
        const newWindow = window.open(development.brochureUrl, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
          window.location.href = development.brochureUrl;
        }
      } else if (mode === 'brochure') {
        toast.info(
          isPlatformReference
            ? 'Property Listify will review the brochure request.'
            : isRentalListing
              ? 'The rental team will send the brochure to you shortly.'
              : 'The sales team will send the brochure to you shortly.',
        );
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
    if (!consentAccepted) nextErrors.consent = 'Consent is required before submitting.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const urlParams =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

    createLead.mutate({
      developmentId: development.id,
      cataloguePublisherId: development.cataloguePublisherId ?? undefined,
      transactionType: development.transactionType,
      unitId: resolvedUnitId,
      unitName: resolvedUnitName || undefined,
      unitPriceFrom: unitContext?.unitPriceFrom,
      unitBedrooms: unitContext?.unitBedrooms,
      unitBathrooms: unitContext?.unitBathrooms,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      message: form.message.trim() || generatedMessage,
      leadType: mode === 'viewing' ? 'viewing_request' : 'inquiry',
      leadSource: copy.leadSource,
      sourceSurface: ctaLocation || 'development_detail',
      referrerUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      utmSource: urlParams?.get('utm_source') || undefined,
      utmMedium: urlParams?.get('utm_medium') || undefined,
      utmCampaign: urlParams?.get('utm_campaign') || undefined,
      affordabilityData:
        affordabilityData &&
        (affordabilityData.monthlyIncome ||
          affordabilityData.availableDeposit ||
          affordabilityData.maxAffordable)
          ? affordabilityData
          : undefined,
      captureRequestId,
      consent: publicLeadConsent(`development_lead_dialog_${mode}`),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-slate-200 p-0 sm:max-w-3xl">
        <div className="grid bg-white lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] p-6 text-white lg:border-b-0 lg:border-r">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-orange-500/15 text-orange-200 hover:bg-orange-500/15">
                  {mode === 'info'
                    ? 'Unit Enquiry'
                    : mode === 'viewing'
                      ? 'Viewing Request'
                      : 'Lead Capture'}
                </Badge>
                {unitContext?.unitName ? (
                  <Badge className="border-0 bg-white/10 text-white hover:bg-white/10">
                    {unitContext.unitName}
                  </Badge>
                ) : null}
              </div>
              <DialogTitle className="text-2xl font-bold text-white">{copy.title}</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-300">
                {copy.description}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-orange-100 p-2 text-orange-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{development.name}</p>
                  {unitContext?.unitName ? (
                    <p className="text-xs font-medium text-orange-200">
                      Unit: {unitContext.unitName}
                    </p>
                  ) : null}
                  <p className="text-xs leading-5 text-slate-300">
                    {custodyDescription}
                  </p>
                </div>
              </div>

              {unitContext &&
              (unitContext.unitPriceFrom ||
                unitContext.unitBedrooms !== undefined ||
                unitContext.unitBathrooms !== undefined) ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {isRentalListing ? 'Monthly rent from' : 'Price From'}
                    </p>
                    <p className="mt-2 text-base font-bold text-white">
                      {unitContext.unitPriceFrom
                        ? `${formatPriceCompact(unitContext.unitPriceFrom)}${isRentalListing ? ' / month' : ''}`
                        : isRentalListing
                          ? 'Monthly rent on request'
                          : 'Price on request'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      <Bed className="h-3.5 w-3.5" />
                      Bedrooms
                    </div>
                    <p className="mt-2 text-base font-bold text-white">
                      {unitContext.unitBedrooms ?? '-'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      <Bath className="h-3.5 w-3.5" />
                      Bathrooms
                    </div>
                    <p className="mt-2 text-base font-bold text-white">
                      {unitContext.unitBathrooms ?? '-'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">What happens after submit</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {isPlatformReference
                    ? 'The request is stored with development context for Property Listify review; it is not presented as a direct developer contact.'
                    : `The request is stored with development context and can be actioned by the right ${isRentalListing ? 'rental' : 'sales'} team without losing the unit context.`}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {isPlatformReference ? 'Property Listify review' : 'Publisher follow-up'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {isRentalListing ? 'Rental attribution' : 'Sales attribution'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <DialogHeader className="space-y-2 text-left lg:hidden">
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>

            <div className="mt-0 space-y-4 lg:mt-0">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:hidden">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-orange-100 p-2 text-orange-600">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{development.name}</p>
                    {unitContext?.unitName ? (
                      <p className="text-xs font-medium text-blue-700">
                        Unit: {unitContext.unitName}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      {isPlatformReference
                        ? 'Your details are used to create a Property Listify-managed request with this context.'
                        : `Your details are used to connect you with the correct ${isRentalListing ? 'rental' : 'sales and qualification'} team.`}
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
                    className="min-h-[120px]"
                  />
                  <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Suggested message
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{generatedMessage}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-200">
                  <Mail className="h-3.5 w-3.5" />
                  Lead Capture
                </div>
                <p className="mt-1 text-sm text-slate-200">
                  The enquiry is stored with development context and can be attributed correctly in
                  publisher reporting.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <Checkbox
                  id="development-lead-consent"
                  checked={consentAccepted}
                  onCheckedChange={checked => {
                    setConsentAccepted(checked === true);
                    if (errors.consent) setErrors(prev => ({ ...prev, consent: '' }));
                  }}
                />
                <Label
                  htmlFor="development-lead-consent"
                  className="text-xs leading-5 text-slate-600"
                >
                  I agree to be contacted about this enquiry. See our{' '}
                  <a
                    className="text-blue-700 underline"
                    href="/legal/privacy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Privacy Policy
                  </a>
                  .
                </Label>
              </div>
              {errors.consent && <p className="text-xs text-red-500">{errors.consent}</p>}

              <Button
                className="w-full bg-orange-500 text-white hover:bg-orange-600"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
