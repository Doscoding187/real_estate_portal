import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/_core/hooks/useAuth';
import { encodeCanonicalLocationId } from '@shared/locationAuthority';
import { trpc } from '@/lib/trpc';
import { buildCanonicalSavedSearchCriteria } from '@/lib/searchIntent';
import { DEFAULT_SAVED_SEARCH_DELIVERY_PREFERENCES } from '@/lib/savedSearchUtils';

type SuburbListingAlertVariant = 'card' | 'inline';

interface SuburbListingAlertProps {
  suburbName: string;
  suburbId: number;
  suburbSlug: string;
  citySlug: string;
  provinceSlug: string;
  variant?: SuburbListingAlertVariant;
}

export function SuburbListingAlert({
  suburbName,
  suburbId,
  suburbSlug,
  citySlug,
  provinceSlug,
  variant = 'card',
}: SuburbListingAlertProps) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [saved, setSaved] = useState(false);

  const createMutation = trpc.savedSearch.create.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success(`Alert set — we'll watch ${suburbName} for new listings.`);
    },
    onError: error => toast.error(error.message),
  });

  const handleActivate = () => {
    if (saved || loading || createMutation.isPending) return;

    if (!isAuthenticated) {
      setLocation(
        `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }

    const criteria = buildCanonicalSavedSearchCriteria({
      transactionType: null,
      geography: {
        level: 'suburb',
        province: provinceSlug,
        city: citySlug,
        suburb: suburbSlug,
        locationId: encodeCanonicalLocationId('suburb', suburbId),
      },
      filters: {},
      resultState: { sort: 'relevance', page: 0 },
      defaults: { propertyCategory: 'residential', sort: 'relevance' },
    });

    createMutation.mutate({
      name: `New listings in ${suburbName}`,
      criteria,
      notificationFrequency: 'weekly',
      emailEnabled: DEFAULT_SAVED_SEARCH_DELIVERY_PREFERENCES.emailEnabled,
      inAppEnabled: DEFAULT_SAVED_SEARCH_DELIVERY_PREFERENCES.inAppEnabled,
    });
  };

  if (variant === 'inline') {
    return (
      <div
        className={`suburb-guide-alert-strip${saved ? ' suburb-guide-alert-strip--saved' : ''}`}
        aria-live="polite"
      >
        {saved ? (
          <>
            <CheckCircle2 size={18} aria-hidden="true" />
            <p>
              <strong>We're watching {suburbName}.</strong> New matching listings will appear in
              your dashboard alerts.
            </p>
            <Link href="/dashboard#alerts">Review alerts</Link>
          </>
        ) : (
          <>
            <Bell size={18} aria-hidden="true" />
            <p>
              <strong>Get {suburbName} listings as they are published.</strong> One tap sets a
              weekly email and dashboard alert.
            </p>
            <button
              type="button"
              onClick={handleActivate}
              disabled={loading || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              ) : null}
              {isAuthenticated ? 'Alert me' : 'Sign in to set an alert'}
            </button>
          </>
        )}
      </div>
    );
  }

  if (saved) {
    return (
      <div
        className="suburb-guide-guidance__card suburb-guide-guidance__card--static"
        aria-live="polite"
      >
        <span className="suburb-guide-guidance__icon">
          <CheckCircle2 size={18} aria-hidden="true" />
        </span>
        <strong>We're watching {suburbName}</strong>
        <span>
          New sale and rental listings will show up in your dashboard alerts and email.{' '}
          <Link href="/dashboard#alerts">Review alerts</Link>
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="suburb-guide-guidance__card suburb-guide-guidance__card--action"
      onClick={handleActivate}
      disabled={loading || createMutation.isPending}
    >
      <span className="suburb-guide-guidance__icon">
        <Bell size={18} aria-hidden="true" />
      </span>
      <strong>Set a {suburbName} listing alert</strong>
      <span>
        {isAuthenticated
          ? `Get a weekly email and dashboard alert when new ${suburbName} listings are published.`
          : `Sign in and we'll email you when new ${suburbName} listings are published.`}
        {createMutation.isPending ? ' Setting it up…' : ''}
      </span>
    </button>
  );
}
