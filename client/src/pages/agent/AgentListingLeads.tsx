import { useMemo } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { AgentSidebar } from '@/components/agent/AgentSidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Menu, ArrowLeft, Mail, Phone } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function AgentListingLeads() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/agent/listings/:id');
  const { isAuthenticated, user, loading } = useAuth();

  const propertyId = useMemo(() => Number(params?.id || 0), [params?.id]);
  const allowedRoles = new Set(['agent', 'agency_admin', 'super_admin']);

  const {
    data,
    isLoading,
    error,
  } = trpc.listing.getLeads.useQuery(
    {
      propertyId,
      limit: 100,
      offset: 0,
    },
    {
      enabled: match && propertyId > 0 && !loading && isAuthenticated,
      retry: false,
    },
  );

  if (!loading && !isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (!loading && !allowedRoles.has(user?.role || '')) {
    setLocation('/dashboard');
    return null;
  }

  if (!match || !propertyId || Number.isNaN(propertyId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FA]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-slate-700">Invalid listing reference.</p>
            <Button className="mt-4" onClick={() => setLocation('/agent/listings')}>
              Back to Listings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F4F7FA]">
      <AgentSidebar />

      <Sheet>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <AgentSidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1 lg:pl-64 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Listing Leads</h1>
              <p className="text-slate-500 mt-1">Property #{propertyId}</p>
            </div>
            <Button variant="outline" onClick={() => setLocation('/agent/listings')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-slate-500">Loading leads...</div>
              ) : error ? (
                <div className="p-6 text-rose-600">{error.message}</div>
              ) : !data?.leads?.length ? (
                <div className="p-6 text-slate-500">No leads found for this listing.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.leads.map((lead: any) => (
                    <div key={lead.id} className="p-4 md:p-5">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{lead.name}</p>
                          <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {lead.email}
                            </span>
                            {lead.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {lead.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{lead.status}</Badge>
                          <Badge variant="outline">{lead.leadType}</Badge>
                        </div>
                      </div>
                      {lead.message && <p className="mt-3 text-sm text-slate-700">{lead.message}</p>}
                      <p className="mt-2 text-xs text-slate-500">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'Unknown date'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
