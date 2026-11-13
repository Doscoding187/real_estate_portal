import { Clock3 } from 'lucide-react';

import { COMMERCIAL_ACTIVATION_STATE } from '@shared/commercialActivation';

/** Plain wording for public pages that visitors reach from the homepage. */
export const PUBLIC_PUBLISHING_NOTICE = {
  title: 'Publishing is not open yet',
  message:
    'You can set up your profile and prepare listings privately now. Publishing and paid plans open later.',
} as const;

export function CommercialActivationNotice({
  compact = false,
  title = 'Preparation-only onboarding',
  message = COMMERCIAL_ACTIVATION_STATE.message,
}: {
  compact?: boolean;
  title?: string;
  message?: string;
}) {
  return (
    <div
      role="status"
      className={
        compact
          ? 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'
          : 'flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950'
      }
    >
      <Clock3 className={compact ? 'mt-0.5 h-4 w-4 shrink-0' : 'mt-0.5 h-5 w-5 shrink-0'} />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-6">{message}</p>
      </div>
    </div>
  );
}
