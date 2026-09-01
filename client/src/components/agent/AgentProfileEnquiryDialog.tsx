import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createLeadCaptureRequestId,
  publicLeadCaptureAcknowledgement,
  publicLeadConsent,
} from '@/lib/leadCapture';
import { trpc } from '@/lib/trpc';

type AgentProfileEnquiryDialogProps = {
  agentId: number;
  agentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
};

type AgentProfileEnquiryForm = {
  name: string;
  email: string;
  phone: string;
  message: string;
  consentAccepted: boolean;
  website: string;
};

const emptyForm = (): AgentProfileEnquiryForm => ({
  name: '',
  email: '',
  phone: '',
  message: '',
  consentAccepted: false,
  website: '',
});

/**
 * A person-to-person public enquiry. The server verifies that the agent is
 * approved and commercially entitled before it accepts this direct CRM route.
 */
export function AgentProfileEnquiryDialog({
  agentId,
  agentName,
  open,
  onOpenChange,
  onSubmitted,
}: AgentProfileEnquiryDialogProps) {
  const [form, setForm] = useState<AgentProfileEnquiryForm>(emptyForm);
  const [captureRequestId, setCaptureRequestId] = useState(() => createLeadCaptureRequestId());
  const [acknowledgement, setAcknowledgement] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setCaptureRequestId(createLeadCaptureRequestId());
    setAcknowledgement(null);
    setSubmissionError(null);
  }, [open, agentId]);

  const createLeadMutation = trpc.leads.create.useMutation({
    onSuccess: result => {
      const message = publicLeadCaptureAcknowledgement(
        result,
        `Your enquiry has been sent to ${agentName}. They can now follow up from their Property Listify workspace.`,
      );
      setAcknowledgement(message);
      setSubmissionError(null);
      onSubmitted?.();
      toast.success(message);
    },
    onError: error => {
      const code = String(error.data?.code || '');
      const message =
        code === 'TOO_MANY_REQUESTS'
          ? 'Too many enquiries were submitted from this connection. Please wait a minute and try again.'
          : code === 'NOT_FOUND'
            ? 'This agent is not currently accepting new enquiries. You can still browse other Property Listify agents.'
            : code === 'BAD_REQUEST'
              ? 'Please check your details and try again.'
              : 'We could not save your enquiry. Your details are still here, so you can try again.';
      setSubmissionError(message);
      toast.error(message);
    },
  });

  const update = <K extends keyof AgentProfileEnquiryForm>(
    field: K,
    value: AgentProfileEnquiryForm[K],
  ) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      const message = 'Please complete your name, email address and message.';
      setSubmissionError(message);
      toast.error(message);
      return;
    }

    if (!form.consentAccepted) {
      const message = 'Please agree to be contacted about this enquiry.';
      setSubmissionError(message);
      toast.error(message);
      return;
    }

    setSubmissionError(null);
    createLeadMutation.mutate({
      agentId,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      message: form.message.trim(),
      leadType: 'inquiry',
      source: 'agent_profile',
      sourceSurface: 'agent_profile_enquiry',
      leadSource: 'agent_profile',
      website: form.website,
      captureRequestId,
      consent: publicLeadConsent('agent_profile_enquiry_dialog'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-w-[520px] sm:p-6"
        data-testid="agent-profile-enquiry-dialog"
      >
        {acknowledgement ? (
          <div className="space-y-5 py-2" role="status" aria-live="polite">
            <DialogHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <DialogTitle>Enquiry received</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-600">
                {acknowledgement}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Property Listify has recorded your enquiry against {agentName}&rsquo;s public
              profile, so the agent can continue the conversation in their workspace.
            </div>
            <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send an enquiry</DialogTitle>
              <DialogDescription className="leading-6">
                Your enquiry goes directly to {agentName}&rsquo;s Property Listify workspace. They
                can use it to follow up and help with your property plans.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent-profile-enquiry-name">
                  Your name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="agent-profile-enquiry-name"
                  value={form.name}
                  onChange={event => update('name', event.target.value)}
                  placeholder="Your full name"
                  maxLength={200}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-profile-enquiry-email">
                  Email address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="agent-profile-enquiry-email"
                  type="email"
                  value={form.email}
                  onChange={event => update('email', event.target.value)}
                  placeholder="you@example.com"
                  maxLength={320}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-profile-enquiry-phone">Phone number</Label>
                <Input
                  id="agent-profile-enquiry-phone"
                  type="tel"
                  value={form.phone}
                  onChange={event => update('phone', event.target.value)}
                  placeholder="+27 12 345 6789"
                  maxLength={50}
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-profile-enquiry-message">
                  How can {agentName} help? <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="agent-profile-enquiry-message"
                  value={form.message}
                  onChange={event => update('message', event.target.value)}
                  placeholder="Tell the agent a little about what you are looking for…"
                  maxLength={5000}
                  rows={5}
                  required
                />
              </div>

              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <Label htmlFor="agent-profile-enquiry-website">Website</Label>
                <Input
                  id="agent-profile-enquiry-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={event => update('website', event.target.value)}
                />
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <Checkbox
                  id="agent-profile-enquiry-consent"
                  checked={form.consentAccepted}
                  onCheckedChange={checked => update('consentAccepted', checked === true)}
                />
                <Label
                  htmlFor="agent-profile-enquiry-consent"
                  className="text-xs leading-5 text-slate-600"
                >
                  I agree to be contacted about this enquiry. See our{' '}
                  <a
                    className="text-primary underline"
                    href="/legal/privacy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Privacy Policy
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

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={createLeadMutation.isPending}
                  onClick={() => onOpenChange(false)}
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
                      Send enquiry
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
