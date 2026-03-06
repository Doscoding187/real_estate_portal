import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PartnerMyReferralsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);

  const referralsQuery = trpc.distribution.partner.listMyReferrals.useQuery(
    {
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 100,
    },
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );

  if (loading || referralsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-24">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>My Referrals</CardTitle>
            <CardDescription>Track referral status and required document progress.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/submit')}>
              Submit New Referral
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/partner/referrals/accelerator')}
            >
              Open Referral Accelerator
            </Button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              Status
              <select
                className="h-9 rounded border border-input bg-background px-2"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="viewing_scheduled">Submitted</option>
                <option value="application_submitted">Application Submitted</option>
                <option value="contract_signed">Contract Signed</option>
                <option value="bond_approved">Bond Approved</option>
                <option value="commission_pending">Commission Pending</option>
                <option value="commission_paid">Commission Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </CardContent>
        </Card>

        {referralsQuery.error ? (
          <Card>
            <CardContent className="py-6 text-sm text-red-600">{referralsQuery.error.message}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Referral Deals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(referralsQuery.data?.items || []).map(item => (
              <button
                key={item.dealId}
                className="w-full rounded border bg-white p-3 text-left transition hover:border-blue-300"
                onClick={() => setLocation(`/distribution/partner/referrals/${Number(item.dealId)}`)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.development.name}</p>
                    <p className="text-xs text-slate-500">Deal #{item.dealId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.status}</Badge>
                    <Badge variant="outline">
                      {item.docProgress.verifiedRequiredCount}/{item.docProgress.requiredCount} docs
                    </Badge>
                  </div>
                </div>
              </button>
            ))}

            {!referralsQuery.error && !(referralsQuery.data?.items || []).length ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No referrals found for this filter.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
