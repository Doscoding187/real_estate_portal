import { useId } from 'react';
import { Button } from '@/components/ui/button';
import type { usePaidLegalAcceptance } from '@/hooks/usePaidLegalAcceptance';

export function PaidCommitmentDisclosure({
  legal,
}: {
  legal: ReturnType<typeof usePaidLegalAcceptance>;
}) {
  const id = useId();
  if (!legal.release)
    return (
      <div
        className="my-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"
        role="status"
      >
        <p>
          {legal.loading
            ? 'Loading the released legal documents…'
            : 'Invoice requests are unavailable until the released legal documents can be reviewed.'}
        </p>
        {!legal.loading && (
          <Button type="button" variant="outline" onClick={legal.reload} className="mt-2">
            Retry legal documents
          </Button>
        )}
      </div>
    );
  const bundle = encodeURIComponent(legal.release.bundleId);
  return (
    <div className="my-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <p>
        The supplier and EFT payee is Property Listify (Pty) Ltd (registration 2026/702814/07). The
        displayed price is payable once by manual EFT for 90 days, with no automatic renewal. Access
        starts after finance matches received funds to the invoice and approves payment; uploading
        proof alone does not activate access. Property Listify is not VAT registered; no VAT is
        charged. Cancellation and refund terms are in the linked Terms. For payment help,{' '}
        <a className="underline" href="mailto:support@propertylistifysa.co.za">
          support@propertylistifysa.co.za
        </a>
        .
      </p>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={legal.accepted}
          onChange={event => legal.setAccepted(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0"
        />
        <label htmlFor={id}>
          I have reviewed the{' '}
          <a
            className="underline"
            href={`/legal/terms?bundle=${bundle}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms of Service ({legal.release.terms.version})
          </a>{' '}
          and{' '}
          <a
            className="underline"
            href={`/legal/privacy?bundle=${bundle}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Notice ({legal.release.privacy.version})
          </a>
          . I accept the Terms and confirm this once-off purchase at the displayed price.
        </label>
      </div>
    </div>
  );
}
