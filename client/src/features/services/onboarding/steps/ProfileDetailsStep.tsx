/**
 * Step 2: Profile Details
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 13.4, 13.7
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { z } from 'zod';
import { type OnboardingState, type OnboardingAction } from '../useOnboardingReducer';

function isValidWebsiteUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidContactEmail(value: string) {
  if (!value.trim()) return true;
  return z.string().trim().email().max(320).safeParse(value).success;
}

type ProfileDetailsStepProps = {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
};

export function ProfileDetailsStep({ state, dispatch, onNext, onBack }: ProfileDetailsStepProps) {
  const utils = trpc.useUtils();
  const isPending = state.pendingStep === 2;
  const error = state.errors[2];

  const upsertProfile = trpc.servicesEngine.upsertProviderProfile.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.servicesEngine.myProviderProfile.invalidate(),
        utils.servicesEngine.myOnboardingStatus.invalidate(),
      ]);
      dispatch({ type: 'CLEAR_ERROR', step: 2 });
      dispatch({ type: 'MARK_STEP_SAVED', step: 2 });
      dispatch({ type: 'SET_PENDING', step: null });
      onNext();
    },
    onError: err => {
      dispatch({
        type: 'SET_ERROR',
        step: 2,
        message: err.message || 'Failed to save. Please try again.',
      });
      dispatch({ type: 'SET_PENDING', step: null });
    },
  });

  function handleContinue() {
    if (isPending) return;
    if (!isValidContactEmail(state.contactEmail)) {
      dispatch({
        type: 'SET_ERROR',
        step: 2,
        message: 'Enter a valid contact email address, or clear it if you are using your phone number.',
      });
      return;
    }
    if (!isValidWebsiteUrl(state.websiteUrl)) {
      dispatch({
        type: 'SET_ERROR',
        step: 2,
        message: 'Enter a valid http or https website URL.',
      });
      return;
    }
    if (state.businessYearsInOperation.trim()) {
      const years = Number(state.businessYearsInOperation);
      if (!Number.isInteger(years) || years < 0 || years > 150) {
        dispatch({ type: 'SET_ERROR', step: 2, message: 'Years in operation must be a whole number from 0 to 150.' });
        return;
      }
    }
    if (Object.values(state.socialLinks).some(value => !isValidWebsiteUrl(value))) {
      dispatch({ type: 'SET_ERROR', step: 2, message: 'Enter social links using a valid http or https URL.' });
      return;
    }
    dispatch({ type: 'SET_PENDING', step: 2 });

    dispatch({ type: 'CLEAR_ERROR', step: 2 });
    upsertProfile.mutate({
      contactEmail: state.contactEmail.trim() || null,
      contactPhone: state.contactPhone.trim() || null,
      websiteUrl: state.websiteUrl.trim() || null,
      businessYearsInOperation: state.businessYearsInOperation.trim()
        ? Number(state.businessYearsInOperation)
        : null,
      operatingHours: state.operatingHours.trim() || null,
      socialLinks: {
        facebook: state.socialLinks.facebook.trim() || null,
        instagram: state.socialLinks.instagram.trim() || null,
        linkedin: state.socialLinks.linkedin.trim() || null,
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">Tell customers how to reach you</h2>
        <p className="text-sm text-slate-500">
          Add contact preferences and helpful business details. Your introduction is collected once in the previous step.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Contact email (optional)</Label>
            <Input
              id="contactEmail"
              type="email"
              value={state.contactEmail}
              onChange={e =>
                dispatch({ type: 'SET_FIELD', field: 'contactEmail', value: e.target.value })
              }
              placeholder="hello@yourcompany.co.za"
              disabled={isPending}
            />
            <p className="text-xs text-slate-500">
              Enter a valid email if you want customers to contact you by email. You can use your phone number instead.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Contact phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={state.contactPhone}
              onChange={e =>
                dispatch({ type: 'SET_FIELD', field: 'contactPhone', value: e.target.value })
              }
              placeholder="e.g. 082 000 0000"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="websiteUrl">Existing business website (optional)</Label>
          <Input
            id="websiteUrl"
            type="url"
            value={state.websiteUrl}
            onChange={e =>
              dispatch({ type: 'SET_FIELD', field: 'websiteUrl', value: e.target.value })
            }
            placeholder="https://yourcompany.co.za"
            disabled={isPending}
          />
          <p className="text-xs text-slate-500">
            If your business already has a website, add its link. Leave this blank if it does not.
          </p>
        </div>

        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">Business details for your website <span className="font-normal text-slate-500">(optional)</span></summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="businessYears">Years in operation</Label>
              <Input id="businessYears" type="number" min={0} max={150} value={state.businessYearsInOperation} onChange={event => dispatch({ type: 'SET_FIELD', field: 'businessYearsInOperation', value: event.target.value })} placeholder="e.g. 8" disabled={isPending} />
              <p className="text-xs text-slate-500">This is shown as information supplied by your business, not an independent verification.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="operatingHours">Operating hours</Label>
              <Input id="operatingHours" maxLength={500} value={state.operatingHours} onChange={event => dispatch({ type: 'SET_FIELD', field: 'operatingHours', value: event.target.value })} placeholder="e.g. Mon–Fri, 08:00–17:00" disabled={isPending} />
            </div>
            <p className="sm:col-span-2 text-xs text-slate-500">
              Add links for the social channels your business uses. You can leave these blank.
            </p>
            {(['facebook', 'instagram', 'linkedin'] as const).map(network => (
              <div key={network} className="space-y-1.5">
                <Label htmlFor={`social-${network}`}>
                  {network[0]?.toUpperCase()}{network.slice(1)} URL (optional)
                </Label>
                <Input id={`social-${network}`} type="url" value={state.socialLinks[network]} onChange={event => dispatch({ type: 'SET_FIELD', field: 'socialLinks', value: { ...state.socialLinks, [network]: event.target.value } })} placeholder={`https://${network}.com/your-business`} disabled={isPending} />
              </div>
            ))}
          </div>
        </details>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save contact details and continue'}
        </Button>
      </div>
    </div>
  );
}
