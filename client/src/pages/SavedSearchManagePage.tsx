import { useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Loader2, BellOff, PauseCircle, AlertCircle, BellRing } from 'lucide-react';

import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';

function getActionIcon(action?: 'pause' | 'unsubscribe_email') {
  if (action === 'pause') {
    return PauseCircle;
  }

  if (action === 'unsubscribe_email') {
    return BellOff;
  }

  return BellRing;
}

export default function SavedSearchManagePage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const token = params.get('token') || '';
  const hasSubmittedRef = useRef(false);

  const mutation = trpc.savedSearch.applyDeliveryActionByToken.useMutation();

  useEffect(() => {
    if (!token || hasSubmittedRef.current || mutation.isPending || mutation.isSuccess) {
      return;
    }

    hasSubmittedRef.current = true;
    mutation.mutate({ token });
  }, [mutation, token]);

  const action = mutation.data?.action;
  const ActionIcon = getActionIcon(action);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-xl">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                {mutation.isError || !token ? (
                  <AlertCircle className="h-10 w-10 text-destructive" />
                ) : mutation.isPending || !mutation.data ? (
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                ) : (
                  <ActionIcon className="h-10 w-10 text-primary" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {!token
                ? 'Invalid saved-search link'
                : mutation.isPending
                  ? 'Updating your saved-search alerts'
                  : mutation.isSuccess
                    ? 'Saved-search alerts updated'
                    : 'Unable to update saved-search alerts'}
            </CardTitle>
            <CardDescription>
              {!token
                ? 'This link is incomplete.'
                : mutation.isPending
                  ? 'Applying your email preference now.'
                  : mutation.data?.message || mutation.error?.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {mutation.data ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Saved search</div>
                    <div className="font-semibold text-slate-900">
                      {mutation.data.savedSearch.name}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {mutation.data.action === 'pause' ? 'Paused' : 'Email off'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    Email {mutation.data.savedSearch.emailEnabled ? 'on' : 'off'}
                  </Badge>
                  <Badge variant="outline">
                    In-app {mutation.data.savedSearch.inAppEnabled ? 'on' : 'off'}
                  </Badge>
                  <Badge variant="outline">
                    Cadence {mutation.data.savedSearch.notificationFrequency}
                  </Badge>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => setLocation('/user/dashboard')}>
                Open dashboard
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setLocation('/login?redirect=/user/dashboard')}
              >
                Log in to manage alerts
              </Button>
            </div>

            <Button variant="ghost" className="w-full" onClick={() => setLocation('/')}>
              Return home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
