import { useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, CheckCircle2 } from 'lucide-react';
import { APP_TITLE } from '@/const';

export default function ActivationComplete() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const next = params.get('next') || '/login';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Home className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">{APP_TITLE}</h1>
          </div>
          <p className="text-muted-foreground">Account activated</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <CardTitle>Activation Complete</CardTitle>
            </div>
            <CardDescription>
              Your password is set and your account is ready. Continue to log in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation(next)} className="w-full">
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
