import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, House, Loader2, Send } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { agentProfilePhoneError } from '@shared/agentProfilePhone';
import {
  createLeadCaptureRequestId,
  hasVerifiedPublicLeadRecipient,
  publicLeadCaptureAcknowledgement,
  publicLeadConsent,
} from '@/lib/leadCapture';

interface PropertyContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: number;
  propertyTitle: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  cataloguePublisherId?: number;
  developmentId?: number;
  initialMessage?: string;
  source?: string;
  intent?: 'enquiry' | 'viewing_request';
  submitLabel?: string;
  successMessage?: string;
  successAction?: {
    type: 'whatsapp';
    phone: string;
    message?: string;
  };
  affordabilityData?: {
    monthlyIncome?: number;
    monthlyExpenses?: number;
    monthlyDebts?: number;
    availableDeposit?: number;
    maxAffordable?: number;
    calculatedAt?: string;
  };
}

import {
  defaultPropertyEnquiryMessage,
  type PropertyEnquiryType as EnquiryType,
} from '@/lib/propertyEnquiryMessage';

interface ContactFormState {
  name: string;
  email: string;
  phone: string;
  enquiryType: EnquiryType;
  message: string;
  consentAccepted: boolean;
  website: string;
}

export function PropertyContactModal({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
  agentName = 'the listing representative',
  cataloguePublisherId,
  developmentId,
  initialMessage,
  source = 'property_search',
  intent = 'enquiry',
  submitLabel = 'Send enquiry',
  successMessage = 'Your enquiry has been saved and sent to the listing representative.',
  successAction,
  affordabilityData,
}: PropertyContactModalProps) {
  const [formData, setFormData] = useState<ContactFormState>({
    name: '',
    email: '',
    phone: '',
    enquiryType: intent === 'viewing_request' ? 'viewing' : 'general',
    message: initialMessage?.trim()
      ? initialMessage
      : defaultPropertyEnquiryMessage(
          propertyTitle,
          intent === 'viewing_request' ? 'viewing' : 'general',
        ),
    consentAccepted: false,
    website: '',
  });
  const [captureRequestId, setCaptureRequestId] = useState(() => createLeadCaptureRequestId());
  const [successAcknowledgement, setSuccessAcknowledgement] = useState<string | null>(null);
  const [successWhatsAppUrl, setSuccessWhatsAppUrl] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const buildWhatsAppUrl = (phone: string, message?: string) => {
    const digits = phone.replace(/[^\d+]/g, '');
    if (!digits) return null;

    const params = new URLSearchParams();
    if (message?.trim()) {
      params.set('text', message.trim());
    }

    const query = params.toString();
    return `https://wa.me/${digits.replace(/^\+/, '')}${query ? `?${query}` : ''}`;
  };

  useEffect(() => {
    if (!isOpen) return;

    setFormData(prev => ({
      ...prev,
      enquiryType: intent === 'viewing_request' ? 'viewing' : 'general',
      message: initialMessage?.trim()
        ? initialMessage
        : defaultPropertyEnquiryMessage(
            propertyTitle,
            intent === 'viewing_request' ? 'viewing' : 'general',
          ),
      consentAccepted: false,
      website: '',
    }));
    setCaptureRequestId(createLeadCaptureRequestId());
    setSuccessAcknowledgement(null);
    setSuccessWhatsAppUrl(null);
    setSubmissionError(null);
  }, [initialMessage, intent, isOpen, propertyId, propertyTitle]);

  const createLeadMutation = trpc.leads.create.useMutation({
    onSuccess: result => {
      const acknowledgement = publicLeadCaptureAcknowledgement(result, successMessage);
      setSuccessAcknowledgement(acknowledgement);
      setSubmissionError(null);
      toast.success(acknowledgement);

      if (successAction?.type === 'whatsapp' && hasVerifiedPublicLeadRecipient(result)) {
        const whatsappUrl = buildWhatsAppUrl(successAction.phone, successAction.message);
        if (whatsappUrl) {
          setSuccessWhatsAppUrl(whatsappUrl);
          window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        }
      }
    },
    onError: error => {
      const code = String(error.data?.code || '');
      const message =
        code === 'TOO_MANY_REQUESTS'
          ? 'Too many enquiries were submitted from this connection. Please wait a minute and try again.'
          : code === 'NOT_FOUND'
            ? 'This property is no longer accepting enquiries. Return to the search results to keep browsing.'
            : code === 'BAD_REQUEST'
              ? 'Please check your details and try again.'
              : intent === 'viewing_request'
                ? 'We could not save your viewing request. Your details are still here, so you can try again.'
                : 'We could not save your enquiry. Your details are still here, so you can try again.';
      setSubmissionError(message);
      toast.error(message);
      console.error('Lead creation error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.message.trim()
    ) {
      const message = 'Please complete your name, email address, phone number and message.';
      setSubmissionError(message);
      toast.error(message);
      return;
    }
    const phoneError = agentProfilePhoneError(formData.phone);
    if (phoneError) {
      setSubmissionError(phoneError);
      toast.error(phoneError);
      return;
    }
    if (!formData.consentAccepted) {
      const message = 'Please agree to be contacted about this enquiry.';
      setSubmissionError(message);
      toast.error(message);
      return;
    }

    setSubmissionError(null);

    // Public property custody is derived server-side from propertyId. Do not
    // submit display identities or client-selected agent/agency destinations.
    createLeadMutation.mutate({
      propertyId,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      message: formData.message.trim(),
      website: formData.website,
      leadType: formData.enquiryType === 'viewing' ? 'viewing_request' : 'inquiry',
      source,
      cataloguePublisherId,
      developmentId,
      affordabilityData,
      captureRequestId,
      consent: publicLeadConsent('property_contact_modal'),
    });
  };

  const handleChange = <K extends keyof ContactFormState>(field: K, value: ContactFormState[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEnquiryTypeChange = (type: EnquiryType) => {
    setFormData(previous => ({
      ...previous,
      enquiryType: type,
      message:
        !initialMessage?.trim() &&
        previous.message === defaultPropertyEnquiryMessage(propertyTitle, previous.enquiryType)
          ? defaultPropertyEnquiryMessage(propertyTitle, type)
          : previous.message,
    }));
  };
  const propertySummary = (
    <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
      <House className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-blue-700">
          About this property
        </p>
        <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900">
          {propertyTitle}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-w-[500px] sm:p-6">
        {successAcknowledgement ? (
          <div className="space-y-5 py-2" role="status" aria-live="polite">
            <DialogHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <DialogTitle>Enquiry received</DialogTitle>
              {propertySummary}
              <DialogDescription className="text-sm leading-6 text-slate-600">
                {successAcknowledgement}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {successWhatsAppUrl && (
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <a href={successWhatsAppUrl} target="_blank" rel="noreferrer">
                    Open WhatsApp
                  </a>
                </Button>
              )}
              <Button
                type="button"
                variant={successWhatsAppUrl ? 'outline' : 'default'}
                className="w-full"
                onClick={onClose}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {intent === 'viewing_request' ? 'Request a viewing' : 'Send an enquiry'}
              </DialogTitle>
              <DialogDescription>
                {intent === 'viewing_request'
                  ? `Send a viewing request for ${propertyTitle} to ${agentName}. This does not confirm an appointment; if they can accommodate it, they can contact you to arrange a suitable date and time.`
                  : `Send your message to ${agentName}. You can edit the suggested message below.`}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">{propertySummary}</div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {intent !== 'viewing_request' && (
                <div className="space-y-2">
                  <Label htmlFor="enquiryType">I'd like to</Label>
                  <Select
                    value={formData.enquiryType}
                    onValueChange={value => handleEnquiryTypeChange(value as EnquiryType)}
                  >
                    <SelectTrigger id="enquiryType" aria-label="Enquiry purpose">
                      <SelectValue placeholder="Select enquiry type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Ask about this property</SelectItem>
                      <SelectItem value="viewing">Request a viewing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="I’m interested in this property and would like to know more…"
                  value={formData.message}
                  onChange={e => handleChange('message', e.target.value)}
                  maxLength={5000}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Your Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  maxLength={200}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  maxLength={320}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+27 12 345 6789"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  maxLength={50}
                  required
                />
              </div>

              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <Label htmlFor="property-enquiry-website">Website</Label>
                <Input
                  id="property-enquiry-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.website}
                  onChange={e => handleChange('website', e.target.value)}
                />
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <Checkbox
                  id="property-enquiry-consent"
                  checked={formData.consentAccepted}
                  onCheckedChange={checked => handleChange('consentAccepted', checked === true)}
                />
                <Label
                  htmlFor="property-enquiry-consent"
                  className="text-xs leading-5 text-slate-600"
                >
                  I agree to be contacted about this enquiry. See our{' '}
                  <a
                    className="text-primary underline"
                    href="/legal/privacy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Privacy Notice
                  </a>
                  .
                </Label>
              </div>

              {submissionError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
                >
                  {submissionError}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={createLeadMutation.isPending}
                >
                  Not now
                </Button>
                <Button type="submit" className="flex-1" disabled={createLeadMutation.isPending}>
                  {createLeadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {submitLabel}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
