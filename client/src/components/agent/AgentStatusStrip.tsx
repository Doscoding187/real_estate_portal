import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ShieldCheck, ShieldQuestion, ShieldX, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

type StatusPayload = {
  packageSelected: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  subscriptionStatus?: string;
};

type ApprovalTone = {
  label: string;
  detail: string;
  className: string;
  icon: typeof ShieldCheck;
};

const APPROVAL_TONES: Record<string, ApprovalTone> = {
  approved: {
    label: 'Profile approved',
    detail: 'Your professional profile is approved for Property Listify surfaces.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: ShieldCheck,
  },
  pending: {
    label: 'Profile under review',
    detail:
      'Your profile is queued for review. You can keep preparing your presence while payment is verified.',
    className: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: ShieldQuestion,
  },
  rejected: {
    label: 'Profile needs attention',
    detail: 'Your profile was not approved. Contact Property Listify support for next steps.',
    className: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: ShieldX,
  },
  suspended: {
    label: 'Profile suspended',
    detail: 'Your profile is suspended. Contact Property Listify support for next steps.',
    className: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: ShieldX,
  },
};

export function AgentStatusStrip() {
  const [status, setStatus] = useState<StatusPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<StatusPayload>('/agent/onboarding-status')
      .then(result => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) return null;

  const tone = APPROVAL_TONES[status.approvalStatus] ?? APPROVAL_TONES.pending;
  const ToneIcon = tone.icon;
  const paidStates: Record<string, string> = {
    active: 'Launch Access active',
    pending_payment: 'Invoice issued — payment outstanding',
    payment_under_review: 'Payment proof under review',
    expired: 'Launch Access expired',
  };
  const commercialLabel =
    paidStates[status.subscriptionStatus ?? ''] ??
    (status.packageSelected ? 'Commercial term in progress' : 'Launch Access not started');
  const showRenewalCta =
    !status.packageSelected || status.subscriptionStatus === 'expired';

  return (
    <div
      data-testid="agent-status-strip"
      className={cn(
        'flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
        tone.className,
      )}
    >
      <div className="flex items-start gap-2">
        <ToneIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">{tone.label}.</span> {tone.detail}
        </p>
      </div>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="font-medium">{commercialLabel}</span>
        {showRenewalCta && (
          <Link
            href="/agent/select-package"
            className="rounded-full border border-current px-3 py-1 text-xs font-semibold hover:bg-white/60"
          >
            showRenewalCta && status.subscriptionStatus === 'expired'
              ? 'Renew Launch Access'
              : 'Get Launch Access'
          </Link>
        )}
      </div>
    </div>
  );
}
