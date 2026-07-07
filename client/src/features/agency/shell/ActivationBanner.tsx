import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkspaceId } from '../workspace/types';

export function ActivationBanner({
  billingNeedsAttention,
  onNavigate,
}: {
  billingNeedsAttention: boolean;
  onNavigate: (workspace: WorkspaceId) => void;
}) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              {billingNeedsAttention
                ? 'Finish billing to unlock the full agency workflow.'
                : 'Invite team members to complete agency activation.'}
            </p>
            <p className="mt-1 leading-6">
              {billingNeedsAttention
                ? 'Your agency profile is configured, but subscription activation is still pending.'
                : 'Billing is active. Team setup is the next activation checkpoint.'}
            </p>
          </div>
        </div>
        <Button onClick={() => onNavigate(billingNeedsAttention ? 'billing' : 'team')}>
          {billingNeedsAttention ? 'Open billing' : 'Open team'}
        </Button>
      </div>
    </section>
  );
}
