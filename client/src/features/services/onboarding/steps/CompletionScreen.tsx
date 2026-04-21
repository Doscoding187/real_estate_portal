/**
 * Completion Screen (Step 6)
 * Requirements: 12.1, 12.2, 12.3, 12.4
 * Note: WizardProgressIndicator is NOT rendered here.
 */

import { CheckCircle2 } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { formatCategoryLabel } from '@/features/services/catalog';
import { type OnboardingState } from '../useOnboardingReducer';

type CompletionScreenProps = {
  state: OnboardingState;
};

export function CompletionScreen({ state }: CompletionScreenProps) {
  const categoryLabel = state.primaryCategory
    ? formatCategoryLabel(state.primaryCategory)
    : 'your services';

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <CheckCircle2 className="h-16 w-16 text-emerald-500" aria-hidden="true" />

      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">You're live!</h2>
        <p className="text-slate-600">
          <span className="font-medium">{state.companyName || 'Your business'}</span> is now listed
          for <span className="font-medium">{categoryLabel}</span>.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/services/provider/me">
          <Button className="w-full" variant="default">
            View your public profile
          </Button>
        </Link>
        <Link href="/service/dashboard">
          <Button className="w-full" variant="outline">
            Go to your dashboard
          </Button>
        </Link>
        <Link href="/service/profile">
          <Button className="w-full" variant="ghost">
            Complete your profile
          </Button>
        </Link>
      </div>
    </div>
  );
}
