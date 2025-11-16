import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Building2, Bed, Square, Eye, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import DeveloperSidebar, { DeveloperSection } from '@/components/developer/DeveloperSidebar';
import Overview from '@/components/developer/Overview';
import DevelopmentsList from '@/components/developer/DevelopmentsList';
import UnitsManager from '@/components/developer/UnitsManager';
import LeadsManager from '@/components/developer/LeadsManager';
import TeamManagement from '@/components/developer/TeamManagement';
import DocumentsMedia from '@/components/developer/DocumentsMedia';
import MarketingCampaigns from '@/components/developer/MarketingCampaigns';
import IntegrationsPanel from '@/components/developer/IntegrationsPanel';
import BillingPanel from '@/components/developer/BillingPanel';
import SupportCenter from '@/components/developer/SupportCenter';

export default function PropertyDeveloperDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [section, setSection] = React.useState<DeveloperSection>('dashboard');

  // Fetch developer dashboard data using existing TRPC endpoints
  const { data: properties, isLoading: propertiesLoading } =
    trpc.properties.myProperties.useQuery();

  // Show loading spinner while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not a property developer
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'property_developer') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <SidebarProvider>
      <DeveloperSidebar active={section} onChange={setSection} className="w-64" />
      <SidebarInset>
        <div className="px-4 py-6 w-full">
          <div className="flex items-center gap-3 mb-6">
            <SidebarTrigger />
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="typ-h2">Developer Dashboard</h1>
            <Badge variant="secondary">Property Developer</Badge>
          </div>

          {section === 'dashboard' && <Overview />}
          {section === 'developments' && <DevelopmentsList />}
          {section === 'units' && <UnitsManager />}
          {section === 'leads' && <LeadsManager />}
          {section === 'team' && <TeamManagement />}
          {section === 'documents' && <DocumentsMedia />}
          {section === 'marketing' && <MarketingCampaigns />}
          {section === 'integrations' && <IntegrationsPanel />}
          {section === 'billing' && <BillingPanel />}
          {section === 'support' && <SupportCenter />}

          {section === 'developments' || section === 'units' ? null : null}
          {section === 'dashboard' && (
            <div className="mt-8">
              <Card className="card">
                <CardHeader>
                  <CardTitle className="typ-h3">Recent Listings</CardTitle>
                  <CardDescription>Recently added property listings</CardDescription>
                </CardHeader>
                <CardContent>
                  {propertiesLoading ? (
                    <p className="text-muted-foreground">Loading listings...</p>
                  ) : (properties?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground">No listings yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {properties!.slice(0, 3).map((listing: any) => (
                        <li
                          key={listing.id}
                          className="flex items-center justify-between border-light rounded-12 p-3"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{listing.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {listing.city}, {listing.province}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="btn btn-secondary"
                            size="sm"
                            onClick={() => setLocation(`/property/${listing.id}`)}
                          >
                            View
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
