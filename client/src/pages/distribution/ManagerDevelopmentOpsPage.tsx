import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function ManagerDevelopmentOpsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const assignedDevelopmentsQuery = trpc.distribution.manager.getAssignedDevelopments.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading || assignedDevelopmentsQuery.isLoading) {
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
            <CardTitle>Manager Distribution Operations</CardTitle>
            <CardDescription>
              Review your assigned developments and process deal documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">
              Assigned developments: {(assignedDevelopmentsQuery.data || []).length}
            </Badge>
          </CardContent>
        </Card>

        {assignedDevelopmentsQuery.error ? (
          <Card>
            <CardContent className="py-8 text-sm text-red-600">
              {assignedDevelopmentsQuery.error.message}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {(assignedDevelopmentsQuery.data || []).map((item: any) => (
            <Card key={`${item.developmentId}-${item.assignedAt}`}>
              <CardHeader>
                <CardTitle className="text-base">{item.developmentName}</CardTitle>
                <CardDescription>
                  {item.city || 'Unknown city'}, {item.province || 'Unknown province'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant={item.isPrimary ? 'default' : 'secondary'}>
                  {item.isPrimary ? 'Primary' : 'Assigned'}
                </Badge>
                <Button
                  onClick={() =>
                    setLocation(`/distribution/manager/developments/${Number(item.developmentId)}`)
                  }
                >
                  View Deals
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {!assignedDevelopmentsQuery.error && !(assignedDevelopmentsQuery.data || []).length ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              No active development assignments found.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
