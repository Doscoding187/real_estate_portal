import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgencyRecommendedNextStep } from '@shared/agencyJourney';
import { getAgencyJourneyAction } from '@/lib/agencyJourney';

export function ActivationBanner({
  recommendedNextStep,
  onNavigate,
}: {
  recommendedNextStep: AgencyRecommendedNextStep;
  onNavigate: (href: string) => void;
}) {
  const action = getAgencyJourneyAction({ recommendedNextStep });

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{action.title}</p>
            <p className="mt-1 leading-6">{action.description}</p>
          </div>
        </div>
        <Button onClick={() => onNavigate(action.href)}>{action.label}</Button>
      </div>
    </section>
  );
}
