import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { RegistrationLegalRelease } from '@/lib/registrationLegal';

/** Each product selection starts with a fresh, unchecked purchase choice. */
export function usePaidLegalAcceptance(
  selectionKey: string | null,
  quote:
    | {
        planId: number;
        amountDue: number;
        currency: string;
      }
    | undefined,
) {
  const [loaded, setLoaded] = useState<{ key: string; release: RegistrationLegalRelease } | null>(
    null,
  );
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    setAccepted(false);
    setLoading(Boolean(selectionKey));
    if (selectionKey) {
      void apiFetch<RegistrationLegalRelease>('/auth/registration-legal', { cache: 'no-store' })
        .then(value => {
          if (!cancelled && value?.bundleId && value.terms?.version && value.privacy?.version) {
            setLoaded({ key: selectionKey, release: value });
          }
        })
        .catch(() => {
          /* The unavailable state keeps the commitment closed. */
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [selectionKey, revision]);
  const release = loaded?.key === selectionKey ? loaded.release : null;
  const choice =
    release && accepted && selectionKey && quote && quote.currency === 'ZAR'
      ? {
          bundleId: release.bundleId,
          termsAccepted: true as const,
          purchaseAccepted: true as const,
          quote: { ...quote, currency: 'ZAR' as const },
        }
      : undefined;
  return {
    release,
    accepted,
    setAccepted,
    loading,
    choice,
    reload: () => {
      setLoaded(null);
      setAccepted(false);
      setRevision(value => value + 1);
    },
  };
}
