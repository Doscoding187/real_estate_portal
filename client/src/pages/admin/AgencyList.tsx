import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Plus,
  Search,
  Shield,
  MapPin,
  Mail,
  Phone,
  Globe,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AgencyList() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, refetch } = trpc.agency.list.useQuery({
    search: searchTerm || undefined,
    limit: 50,
    offset: 0,
  });

  const verifyMutation = trpc.agency.verify.useMutation({
    onSuccess: () => {
      toast.success('Agency verification updated');
      refetch();
    },
    onError: error => {
      toast.error(error.message || 'Failed to update verification');
    },
  });

  const deleteMutation = trpc.agency.delete.useMutation({
    onSuccess: () => {
      toast.success('Agency deleted successfully');
      refetch();
    },
    onError: error => {
      toast.error(error.message || 'Failed to delete agency');
    },
  });

  // Redirect if not authenticated or not super admin
  if (!isAuthenticated || user?.role !== 'super_admin') {
    setLocation('/login');
    return null;
  }

  const handleVerify = (id: number, currentStatus: boolean) => {
    verifyMutation.mutate({ id, isVerified: !currentStatus });
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Agencies</h1>
              <p className="text-muted-foreground">Manage real estate agencies on the platform</p>
            </div>
          </div>
          <Button onClick={() => setLocation('/admin/agencies/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Agency
          </Button>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agencies by name, email, or city..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Agencies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {data?.agencies.filter(a => a.isVerified === 1).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {data?.agencies.filter(a => a.subscriptionPlan === 'premium').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {data?.agencies.filter(a => a.subscriptionStatus === 'active').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agency List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading agencies...
            </CardContent>
          </Card>
        ) : !data?.agencies.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No agencies found. Create your first agency to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.agencies.map(agency => (
              <Card key={agency.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{agency.name}</CardTitle>
                        {agency.isVerified === 1 && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge
                          variant={agency.subscriptionPlan === 'premium' ? 'default' : 'secondary'}
                        >
                          {agency.subscriptionPlan}
                        </Badge>
                        <Badge
                          variant={agency.subscriptionStatus === 'active' ? 'default' : 'outline'}
                        >
                          {agency.subscriptionStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agency.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {agency.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {agency.city && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {agency.city}, {agency.province}
                        </span>
                      </div>
                    )}
                    {agency.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{agency.email}</span>
                      </div>
                    )}
                    {agency.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{agency.phone}</span>
                      </div>
                    )}
                    {agency.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <a
                          href={agency.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline truncate"
                        >
                          {agency.website.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-2">
                    <Button
                      variant={agency.isVerified === 1 ? 'outline' : 'default'}
                      size="sm"
                      className="flex-1"
                      onClick={() => handleVerify(agency.id, agency.isVerified === 1)}
                      disabled={verifyMutation.isPending}
                    >
                      {agency.isVerified === 1 ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Unverify
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-1" />
                          Verify
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(agency.id, agency.name)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
