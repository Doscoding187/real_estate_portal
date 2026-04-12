import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  Clock,
  Unlock,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';

// ─── Types ───────────────────────────────────────────────────────────────────

type PartnerType = 'independent_agent' | 'small_brokerage' | 'referral_partner' | 'individual' | '';
type BuyerIntent = 'ready' | 'regular' | 'exploring' | '';

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  partnerType: PartnerType;
  buyerIntent: BuyerIntent;
};

const PARTNER_LABELS: Record<Exclude<PartnerType, ''>, string> = {
  independent_agent: 'Independent Property Agent',
  small_brokerage: 'Small Brokerage',
  referral_partner: 'Referral Partner',
  individual: 'Individual With Qualified Buyer',
};

const INTENT_LABELS: Record<Exclude<BuyerIntent, ''>, string> = {
  ready: 'I already have a buyer ready to refer',
  regular: 'I regularly work with buyers',
  exploring: "I'm exploring / getting started",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  interestedDevId?: number | null;
  /** Pass the loaded developments list so we can show the dev name */
  developments?: Array<{ id: number; name: string; suburb?: string | null; city?: string | null }>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReferralApplyModal({ isOpen, onClose, interestedDevId, developments }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    phone: '',
    partnerType: '',
    buyerIntent: '',
  });

  const interestedDev = useMemo(() => {
    if (!interestedDevId || !developments) return null;
    return developments.find(d => d.id === interestedDevId) ?? null;
  }, [interestedDevId, developments]);

  const notes = useMemo(() => {
    const parts: string[] = [];
    if (form.partnerType) parts.push(`Applicant type: ${PARTNER_LABELS[form.partnerType]}`);
    if (form.buyerIntent) parts.push(`Buyer intent: ${INTENT_LABELS[form.buyerIntent]}`);
    if (interestedDevId) parts.push(`Interested Development ID: ${interestedDevId}`);
    return parts.join(' | ');
  }, [form.partnerType, form.buyerIntent, interestedDevId]);

  const canSubmit =
    form.fullName.trim().length >= 2 &&
    form.email.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.partnerType !== '';

  const mutation = trpc.distribution.submitReferrerApplication.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: err => {
      toast.error(err.message || 'Failed to submit application. Please try again.');
    },
  });

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error('Please fill in your name, email, phone, and role.');
      return;
    }
    mutation.mutate({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      partnerType: form.partnerType as Exclude<PartnerType, ''>,
      notes,
    });
  };

  const handleClose = () => {
    onClose();
    // Brief delay before resetting so the exit animation plays
    setTimeout(() => {
      setSubmitted(false);
      setForm({ fullName: '', email: '', phone: '', partnerType: '', buyerIntent: '' });
    }, 300);
  };

  const handleExploreOpportunities = () => {
    handleClose();
    setTimeout(() => {
      document.getElementById('available-developments')?.scrollIntoView({ behavior: 'smooth' });
    }, 350);
  };

  // ─── Select field helper ─────────────────────────────────────────────────

  const SelectField = ({
    label,
    value,
    onChange,
    placeholder,
    children,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    children: React.ReactNode;
  }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden border-slate-200 shadow-2xl"
        showCloseButton={false}
      >
        {submitted ? (
          /* ── SUCCESS STATE ─────────────────────────────────────────── */
          <div className="flex flex-col items-center text-center px-8 py-10">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-sm text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted</h2>
            <p className="text-sm text-slate-600 max-w-xs mb-8">
              We review every application manually. You'll receive access details by email once
              approved.
            </p>

            <div className="w-full space-y-3 mb-8">
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-left">
                <Mail className="h-4 w-4 shrink-0 text-blue-600" />
                <p className="text-sm text-slate-700">Confirmation email on its way</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-left">
                <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-sm text-slate-700">Review typically within 24–48 hours</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-left">
                <Unlock className="h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-sm text-slate-700">
                  Access email will contain your login link
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-6 italic">
              If you already have a buyer, keep their details ready — you'll need them to submit
              your first referral.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleExploreOpportunities}
              >
                Explore Opportunities
              </Button>
              <Button variant="outline" className="flex-1 border-slate-300" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          /* ── FORM STATE ────────────────────────────────────────────── */
          <>
            {/* Header */}
            <div className="relative bg-slate-900 px-6 py-5">
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-sm text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-300">
                Referral Network
              </div>
              <h2 className="text-xl font-bold text-white">Join the Referral Network</h2>
              <p className="mt-1 text-sm text-slate-400">
                Takes 2 minutes. No buyer required to apply.
              </p>
            </div>

            {/* Dev context banner */}
            {interestedDev && (
              <div className="flex items-center gap-2 border-b border-slate-100 bg-blue-50 px-6 py-3">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                <p className="text-xs text-slate-700">
                  Applying to refer buyers for{' '}
                  <strong className="font-semibold text-slate-900">{interestedDev.name}</strong>
                  {(interestedDev.suburb || interestedDev.city) && (
                    <span className="text-slate-500">
                      {' '}
                      · {interestedDev.suburb || interestedDev.city}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Form body */}
            <div className="px-6 py-5 space-y-4">
              {/* Name + Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Full Name
                  </label>
                  <Input
                    value={form.fullName}
                    onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                    placeholder="Your full name"
                    className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="name@domain.com"
                    className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone / WhatsApp
                </label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+27 ..."
                  className="h-11 bg-slate-50 border-slate-200 focus:border-blue-500"
                />
              </div>

              {/* Role + Intent row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="I am a..."
                  value={form.partnerType}
                  onChange={v => setForm(p => ({ ...p, partnerType: v as PartnerType }))}
                  placeholder="Select role"
                >
                  <option value="independent_agent">Independent Property Agent</option>
                  <option value="small_brokerage">Small Brokerage</option>
                  <option value="referral_partner">Referral Partner</option>
                  <option value="individual">Individual With Qualified Buyer</option>
                </SelectField>

                <SelectField
                  label="What best describes you?"
                  value={form.buyerIntent}
                  onChange={v => setForm(p => ({ ...p, buyerIntent: v as BuyerIntent }))}
                  placeholder="Select situation"
                >
                  <option value="ready">I already have a buyer ready</option>
                  <option value="regular">I regularly work with buyers</option>
                  <option value="exploring">I'm exploring / getting started</option>
                </SelectField>
              </div>

              {/* CTA row */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <Link
                  href="/login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 text-center sm:text-left"
                  onClick={handleClose}
                >
                  Already have access? Sign in
                </Link>
                <Button
                  className="h-11 bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white font-bold shadow-md hover:opacity-90 group"
                  disabled={!canSubmit || mutation.isPending}
                  onClick={handleSubmit}
                >
                  {mutation.isPending ? 'Submitting...' : 'Get Access'}
                  {!mutation.isPending && (
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
