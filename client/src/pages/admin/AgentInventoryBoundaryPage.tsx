import React from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, CalendarClock, Layers3, Link2, Shield } from 'lucide-react';

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

const AgentInventoryBoundaryPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.admin.getAgentInventoryBoundaryReport.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const summary = data?.summary;
  const metrics = data?.metrics || [];
  const unresolvedListings = data?.unresolvedListings || [];
  const boundaryIsClean = (summary?.unresolvedListings || 0) === 0;

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/analytics')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Canonical Inventory Linkage
            </h1>
            <p className="text-slate-500">
              Monitors whether scheduling-eligible listings have exactly one canonical property
              projection.
            </p>
          </div>
        </div>
        <Badge
          className={
            boundaryIsClean
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }
        >
          {boundaryIsClean ? 'Canonical Boundary Clean' : 'Linkage Gaps Present'}
        </Badge>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Shield className="h-5 w-5 text-blue-600" />
            Canonical Scheduling Authority
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-medium text-slate-900">
              Property projections are the sole Agent OS scheduling inventory
            </p>
            <p className="text-sm text-slate-500">
              A listing is schedulable only when properties.sourceListingId resolves it to one
              canonical property record.
            </p>
            {!boundaryIsClean ? (
              <p className="text-sm text-amber-700">
                Unlinked or ambiguous listings are excluded from agent scheduling until their
                canonical projection is repaired.
              </p>
            ) : (
              <p className="text-sm text-green-700">
                Every approved or published listing in the scheduling boundary currently resolves
                canonically.
              </p>
            )}
          </div>

          <Badge className="bg-green-100 text-green-700 border border-green-200">
            Canonical Only
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Layers3 className="h-5 w-5 text-blue-600" />
              Eligible Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{summary?.totalListings || 0}</div>
            <p className="text-sm text-slate-500 mt-1">
              Approved or published listings eligible for scheduling
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Link2 className="h-5 w-5 text-green-600" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {summary?.resolvedListings || 0}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {formatPercent(summary?.resolutionRate || 0)} resolve to canonical properties
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Unlinked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {summary?.unresolvedListings || 0}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Eligible listings missing an unambiguous property link
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <CalendarClock className="h-5 w-5 text-amber-600" />
              Affected Showings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {summary?.unresolvedShowings || 0}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Existing showings attached to currently unlinked listings
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800">Linkage Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric: any) => (
              <div
                key={metric.key}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{metric.label}</p>
                  <p className="text-sm text-slate-500">
                    {metric.total
                      ? `${metric.count} of ${metric.total}`
                      : `${metric.count} records`}
                  </p>
                </div>

                <div className="min-w-[220px] text-right">
                  <div className="text-lg font-bold text-slate-900">
                    {metric.rate != null ? formatPercent(metric.rate) : metric.count}
                  </div>
                  {metric.rate != null ? (
                    <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${Math.min(metric.rate, 1) * 100}%`,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800">Listings Requiring Canonical-Link Repair</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {unresolvedListings.length === 0 ? (
              <p className="text-sm text-slate-500">
                No canonical-link defects in the scheduling-eligible set.
              </p>
            ) : (
              unresolvedListings.map((listing: any) => (
                <div
                  key={listing.listingId}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">{listing.title}</p>
                    <p className="text-sm text-slate-500">
                      #{listing.listingId} - {listing.address}
                      {listing.city ? ` - ${listing.city}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-2">
                      {listing.status}
                    </Badge>
                    <p className="text-sm text-slate-500">
                      Existing showings: {listing.activeShowings}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentInventoryBoundaryPage;
