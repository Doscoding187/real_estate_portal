/**
 * Step 2: Profile Details
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 13.4, 13.7
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { type OnboardingState, type OnboardingAction } from '../useOnboardingReducer';

const HEADLINE_MAX = 180;
const LOGO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const LOGO_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type ProfileDetailsStepProps = {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
};

export function ProfileDetailsStep({ state, dispatch, onNext, onBack }: ProfileDetailsStepProps) {
  const isPending = state.pendingStep === 2;
  const error = state.errors[2];
  const headlineRemaining = HEADLINE_MAX - state.headline.length;

  const upsertProfile = trpc.servicesEngine.upsertProviderProfile.useMutation({
    onSuccess: () => {
      dispatch({ type: 'CLEAR_ERROR', step: 2 });
      dispatch({ type: 'SET_PENDING', step: null });
      onNext();
    },
    onError: (err) => {
      dispatch({ type: 'SET_ERROR', step: 2, message: err.message || 'Failed to save. Please try again.' });
      dispatch({ type: 'SET_PENDING', step: null });
    },
  });

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!LOGO_ACCEPTED_TYPES.includes(file.type)) {
      dispatch({ type: 'SET_ERROR', step: 2, message: 'Please upload a JPEG, PNG, or WebP image.' });
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      dispatch({ type: 'SET_ERROR', step: 2, message: 'Image must be under 5 MB.' });
      return;
    }

    dispatch({ type: 'CLEAR_ERROR', step: 2 });
    dispatch({ type: 'SET_FIELD', field: 'logoFile', value: file });
    const previewUrl = URL.createObjectURL(file);
    dispatch({ type: 'SET_FIELD', field: 'logoPreviewUrl', value: previewUrl });
  }

  function handleContinue() {
    if (isPending) return;
    dispatch({ type: 'SET_PENDING', step: 2 });
    dispatch({ type: 'CLEAR_ERROR', step: 2 });
    upsertProfile.mutate({
      headline: state.headline.trim() || undefined,
      bio: state.bio.trim() || undefined,
      contactEmail: state.contactEmail.trim() || undefined,
      contactPhone: state.contactPhone.trim() || undefined,
      websiteUrl: state.websiteUrl.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">Complete your profile</h2>
        <p className="text-sm text-slate-500">Help customers know who they're hiring</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="headline">Headline</Label>
            <span className={`text-xs ${headlineRemaining < 20 ? 'text-amber-600' : 'text-slate-400'}`}>
              {headlineRemaining}/{HEADLINE_MAX}
            </span>
          </div>
          <Input
            id="headline"
            value={state.headline}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'headline', value: e.target.value.slice(0, HEADLINE_MAX) })}
            placeholder="e.g. Trusted plumber serving Cape Town for 10+ years"
            maxLength={HEADLINE_MAX}
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profileBio">About your business</Label>
          <Textarea
            id="profileBio"
            value={state.bio}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'bio', value: e.target.value })}
            placeholder="Describe your experience, specialisations, and what makes you stand out"
            rows={4}
            disabled={isPending}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={state.contactEmail}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'contactEmail', value: e.target.value })}
              placeholder="hello@yourcompany.co.za"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Contact phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={state.contactPhone}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'contactPhone', value: e.target.value })}
              placeholder="e.g. 082 000 0000"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input
            id="websiteUrl"
            type="url"
            value={state.websiteUrl}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'websiteUrl', value: e.target.value })}
            placeholder="https://yourcompany.co.za"
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="logoUpload">Business logo</Label>
          <div className="flex items-center gap-4">
            {state.logoPreviewUrl && (
              <img
                src={state.logoPreviewUrl}
                alt="Logo preview"
                className="h-16 w-16 rounded-lg object-cover border"
              />
            )}
            <Input
              id="logoUpload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              disabled={isPending}
              className="cursor-pointer"
            />
          </div>
          <p className="text-xs text-slate-400">JPEG, PNG, or WebP · max 5 MB</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isPending}>
          {isPending ? 'Saving…' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
