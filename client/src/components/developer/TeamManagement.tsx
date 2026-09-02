import { useLocation } from 'wouter';
import { ShieldCheck, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Team membership has a canonical organisation model, but invitation and
 * permission-management workflows are not part of the Developer launch MVP.
 * Keep this direct URL honest instead of offering an inert invite control.
 */
export default function TeamManagement() {
  const [, setLocation] = useLocation();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-700">Developer workspace</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Team access</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Team collaboration is provisioned with Property Listify during the launch MVP. The
          workspace does not yet offer self-service invitations, role changes, or removals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Controlled team provisioning
          </CardTitle>
          <CardDescription>
            This protects the organisation identity that owns public developments and receives
            development enquiries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <p>
              Request access when you need another person provisioned. Property Listify will confirm
              the organisation, role, and lead-access scope before making a change.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setLocation('/contact')}>Request team access</Button>
            <Button variant="outline" onClick={() => setLocation('/developer/settings')}>
              View organisation settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
