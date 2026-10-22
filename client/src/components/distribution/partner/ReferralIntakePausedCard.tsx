import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DISTRIBUTION_REFERRAL_INTAKE_PAUSED_MESSAGE,
  DISTRIBUTION_REFERRAL_INTAKE_PAUSED_TITLE,
} from '../../../../../shared/distributionReferralIntake';

export function ReferralIntakePausedCard() {
  return (
    <Card className="border-amber-200 bg-amber-50/70">
      <CardHeader>
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="space-y-1">
            <CardTitle className="text-base">{DISTRIBUTION_REFERRAL_INTAKE_PAUSED_TITLE}</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-700">
              {DISTRIBUTION_REFERRAL_INTAKE_PAUSED_MESSAGE}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-slate-600">
        You can still browse available developments and program terms while this workflow is being
        completed.
      </CardContent>
    </Card>
  );
}
