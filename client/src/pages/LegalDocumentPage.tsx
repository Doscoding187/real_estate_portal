import { useEffect, useState } from 'react';
import { HomeLayout } from '@/layouts/HomeLayout';
import { apiFetch } from '@/lib/api';
import { applySeo } from '@/lib/seo';
import type { RegistrationLegalRelease } from '@/lib/registrationLegal';

export function LegalDocumentUnavailable({ title }: { title: string }) {
  useEffect(() => {
    applySeo({
      title: `${title} | Property Listify`,
      description: title,
      canonicalPath: window.location.pathname,
    });
  }, [title]);
  return (
    <HomeLayout>
      <main className="mx-auto max-w-4xl px-5 pb-16 pt-28 text-slate-900">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p role="status" className="my-6">
          This document is temporarily unavailable. For assistance, contact
          support@propertylistifysa.co.za.
        </p>
      </main>
    </HomeLayout>
  );
}

export default function LegalDocumentPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const [release, setRelease] = useState<RegistrationLegalRelease | null>(null);
  const [failed, setFailed] = useState(false);
  const title = kind === 'terms' ? 'Terms of Service' : 'Privacy Notice';
  useEffect(() => {
    applySeo({
      title: `${title} | Property Listify`,
      description: title,
      canonicalPath: `/legal/${kind}`,
    });
    const controller = new AbortController();
    const bundle = new URLSearchParams(window.location.search).get('bundle');
    setRelease(null);
    setFailed(false);
    void apiFetch<RegistrationLegalRelease>(
      bundle ? `/legal/releases/${encodeURIComponent(bundle)}` : '/auth/registration-legal',
      { signal: controller.signal },
    )
      .then(value => {
        if (!controller.signal.aborted) setRelease(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [kind, title]);
  const document = release?.[kind];
  return (
    <HomeLayout>
      <main className="mx-auto max-w-4xl px-5 pb-16 pt-28 text-slate-900">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {document && release ? (
          <>
            <p className="my-5 text-sm">
              Version {document.version} · Effective {release.effectiveAt.slice(0, 10)}
            </p>
            <article className="whitespace-pre-wrap break-words font-sans text-base leading-7">
              {document.content}
            </article>
            <button
              type="button"
              className="mt-8 underline print:hidden"
              onClick={() => window.print()}
            >
              Print or save this document
            </button>
          </>
        ) : (
          <p role="status" className="my-6">
            {failed
              ? 'This document is temporarily unavailable. New account registration is paused. For assistance, contact support@propertylistifysa.co.za.'
              : 'Loading document…'}
          </p>
        )}
      </main>
    </HomeLayout>
  );
}
