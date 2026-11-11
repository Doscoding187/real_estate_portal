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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">PropertyListify</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Founder sign-in</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Admin access for the PropertyListify owner account.
        </p>
        {founderLoginAvailable ? (
          <Button
            asChild
            className="h-12 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <a href={getApiUrl('/auth/google/start')}>Founder sign-in with Google</a>
          </Button>
        ) : (
          <p role="status" className="text-sm text-slate-700 dark:text-slate-300">
            Founder sign-in is not available.
          </p>
        )}
      </div>
    </main>
  );
}
