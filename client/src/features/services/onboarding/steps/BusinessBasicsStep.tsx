/**
 * Step 1: Business Basics
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 13.4, 13.7
 */

import { Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { type OnboardingState, type OnboardingAction } from '../useOnboardingReducer';

type BusinessBasicsStepProps = {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
};

export function BusinessBasicsStep({ state, dispatch, onNext }: BusinessBasicsStepProps) {
  const utils = trpc.useUtils();
  const [uploadError, setUploadError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const isPending = state.pendingStep === 1;
  const error = state.errors[1];

  const registerIdentity = trpc.servicesEngine.registerProviderIdentity.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.servicesEngine.myProviderProfile.invalidate(),
        utils.servicesEngine.myOnboardingStatus.invalidate(),
      ]);
      dispatch({ type: 'CLEAR_ERROR', step: 1 });
      dispatch({ type: 'MARK_STEP_SAVED', step: 1 });
      dispatch({ type: 'SET_PENDING', step: null });
      onNext();
    },
    onError: err => {
      dispatch({ type: 'SET_ERROR', step: 1, message: err.message || 'Failed to save. Please try again.' });
      dispatch({ type: 'SET_PENDING', step: null });
    },
  });
  const presignLogo = trpc.upload.presign.useMutation();

  const canContinue = !isPending && !uploadingLogo;

  function handleContinue() {
    if (!canContinue) return;
    if (state.companyName.trim().length < 2) {
      dispatch({ type: 'SET_ERROR', step: 1, message: 'Enter a business name to continue.' });
      return;
    }
    dispatch({ type: 'SET_PENDING', step: 1 });
    dispatch({ type: 'CLEAR_ERROR', step: 1 });
    registerIdentity.mutate({
      companyName: state.companyName.trim(),
      logoUrl: state.logoUrl.trim() || undefined,
      businessType: state.businessType || undefined,
    });
  }

  async function uploadLogo(file?: File) {
    setUploadError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Choose a JPG, PNG, WebP or AVIF image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('The brand image must be 10 MB or smaller.');
      return;
    }
    setUploadingLogo(true);
    try {
      const reservation = await presignLogo.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });
      const response = await fetch(new URL(reservation.url, window.location.origin), {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error('The brand image upload did not complete.');
      dispatch({ type: 'SET_FIELD', field: 'logoUrl', value: reservation.publicUrl });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The brand image could not be uploaded.');
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h2 className="text-[27px] font-bold tracking-[-0.025em] text-[#071b4a]">Your business</h2>
        <p className="text-base leading-6 text-[#25385d]">
          Start with your business identity. You do not need to write marketing copy or a separate business introduction.
        </p>
      </div>

      <div className="pt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="companyName" className="text-[15px] font-semibold text-[#071b4a]">Business name <span className="text-red-500">*</span></Label>
          <Input
            id="companyName"
            value={state.companyName}
            onChange={e => dispatch({ type: 'SET_FIELD', field: 'companyName', value: e.target.value })}
            placeholder="e.g. Acme Maintenance Services"
            disabled={isPending}
            aria-required="true"
            className="h-11 rounded-xl border-[#d8e0ec] px-4 text-[15px] shadow-none placeholder:text-[#8290aa] focus-visible:ring-[#0868da]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="businessType" className="text-[15px] font-semibold text-[#071b4a]">Business type</Label>
          <select
            id="businessType"
            value={state.businessType || ''}
            onChange={event => dispatch({ type: 'SET_FIELD', field: 'businessType', value: event.target.value || null })}
            className="h-11 w-full rounded-xl border border-[#d8e0ec] bg-white px-4 text-[15px] text-[#25385d] outline-none focus:border-[#0868da] focus:ring-2 focus:ring-[#0868da]/15"
            disabled={isPending}
          >
            <option value="">Select business type</option>
            <option value="independent_professional">Independent professional</option>
            <option value="registered_company">Registered company</option>
            <option value="partnership">Partnership</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="providerBrandImage" className="text-[15px] font-semibold text-[#071b4a]">Logo or brand image <span className="font-normal text-slate-500">(optional)</span></Label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-h-[82px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#cbd7e8] bg-[#fbfdff] px-3 py-3 text-center text-sm font-medium text-[#0868da] transition hover:bg-[#f4f8ff]">
              <span className="inline-flex items-center gap-2">
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingLogo ? 'Uploading…' : state.logoUrl ? 'Replace brand image' : 'Upload logo or choose a file'}
              </span>
              <span className="text-xs font-normal text-[#8290aa]">JPG, PNG or WebP (max 10 MB)</span>
              <input
                id="providerBrandImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={isPending || uploadingLogo}
                onChange={event => void uploadLogo(event.target.files?.[0])}
              />
            </label>
            {state.logoUrl && <img src={state.logoUrl} alt="Business brand preview" className="h-12 w-12 rounded-lg border object-cover" />}
          </div>
          {uploadError && <p role="alert" className="text-sm text-red-700">{uploadError}</p>}
        </div>

      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button onClick={handleContinue} disabled={!canContinue} className="h-11 w-full rounded-xl bg-[#0868da] text-sm font-semibold shadow-[0_5px_14px_-5px_rgba(8,104,218,0.65)] hover:bg-[#075bc4] sm:w-[205px]">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  );
}
