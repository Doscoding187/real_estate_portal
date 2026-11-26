import { CheckCircle2 } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { formatCategoryLabel } from '@/features/services/catalog';
import { primaryServiceCategoryFromState } from '../useOnboardingReducer';
import { type OnboardingState } from '../useOnboardingReducer';

type CompletionScreenProps = {
  state: OnboardingState;
};

export function CompletionScreen({ state }: CompletionScreenProps) {
  const primaryCategory = primaryServiceCategoryFromState(state);
  const categoryLabel = primaryCategory
    ? formatCategoryLabel(primaryCategory)
    : 'your services';

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <CheckCircle2 className="h-16 w-16 text-blue-700" aria-hidden="true" />
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Profile setup complete</h2>
        <p className="max-w-xl text-slate-600">
          <span className="font-medium">{state.companyName || 'Your business'}</span> is saved with{' '}
          <span className="font-medium">{categoryLabel}</span> details. The Property Listify team
          can now review the profile. It remains private and will appear publicly only if an
          authorised reviewer approves publication.
        </p>
      </div>

      <div className="w-full max-w-xl rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left">
        <p className="text-sm font-semibold text-slate-900">What happens next</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Keep your services and coverage accurate. You can return to your profile to make updates;
          those changes do not bypass the publication review.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link href="/service/profile">
          <Button className="w-full" variant="outline">
            Review profile details
          </Button>
        </Link>
        <p className="text-xs leading-5 text-slate-500">
          Your dashboard will show requests after the profile is published.
        </p>
      </div>
    </div>
  );
}
