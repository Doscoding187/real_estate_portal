import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch, getApiUrl } from '@/lib/api';

/**
 * Unlinked founder entry. Not referenced from public UI; the server still
 * enforces all Google sign-in restrictions.
 */
export default function FounderLogin() {
  const [founderLoginAvailable, setFounderLoginAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const status = await apiFetch<{ founderLoginAvailable: boolean }>('/auth/google/status', {
          signal: controller.signal,
        });
        if (active && status?.founderLoginAvailable === true) setFounderLoginAvailable(true);
      } catch {
        /* Availability remains false unless the server explicitly enables it. */
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-slate-900 dark:text-slate-100">
      <h1 className="text-2xl font-bold">Founder sign-in</h1>
      {founderLoginAvailable ? (
        <Button asChild variant="outline" className="h-12 w-full rounded-xl">
          <a href={getApiUrl('/auth/google/start')}>Founder sign-in with Google</a>
        </Button>
      ) : (
        <p role="status">Founder sign-in is not available.</p>
      )}
    </main>
  );
}
