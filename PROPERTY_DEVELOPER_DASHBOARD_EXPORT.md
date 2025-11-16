# Property Developer Dashboard - Complete Export for Lovable

## 📋 Overview

This document contains the complete code structure for the Property Developer Dashboard. Use this to build the skeleton in Lovable, then integrate it back into the main codebase.

---

## 🎯 Route Configuration

### Route in App.tsx

```tsx
// Property Developer Dashboard Route
<Route path="/developer/dashboard">
  <RequireRole role="property_developer">
    <PropertyDeveloperDashboard />
  </RequireRole>
</Route>
```

### Login Redirect Logic

```tsx
// In Login.tsx
if (role === 'property_developer') {
  redirectPath = '/developer/dashboard';
}
```

---

## 🔐 Authentication & Guards

### RequireRole Component

**File:** `client/src/components/RequireRole.tsx`

```tsx
import { useAuth } from '@/_core/hooks/useAuth';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export const RequireRole = ({ role, children }: { role: string; children: React.ReactNode }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || user?.role !== role) {
      if (window.location.pathname !== '/login') {
        setLocation('/login');
      }
    }
  }, [isAuthenticated, user, loading, role, setLocation]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-slate-600">Checking access…</span>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== role) {
    return null;
  }

  return <>{children}</>;
};
```

---

## 📱 Main Dashboard Component

### PropertyDeveloperDashboard

**File:** `client/src/pages/PropertyDeveloperDashboard.tsx`

```tsx
import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Building2 } from 'lucide-react';
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
            <h1 className="text-2xl font-bold">Developer Dashboard</h1>
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

          {section === 'dashboard' && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Listings</CardTitle>
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
                          className="flex items-center justify-between border-b pb-2"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{listing.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {listing.city}, {listing.province}
                            </div>
                          </div>
                          <Button
                            variant="outline"
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
```

---

## 🔧 Component Files

### 1. DeveloperSidebar

**File:** `client/src/components/developer/DeveloperSidebar.tsx`

```tsx
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Building2,
  Boxes,
  Users,
  FolderOpen,
  Megaphone,
  PlugZap,
  CreditCard,
  LifeBuoy,
} from 'lucide-react';

export type DeveloperSection =
  | 'dashboard'
  | 'developments'
  | 'units'
  | 'leads'
  | 'team'
  | 'documents'
  | 'marketing'
  | 'integrations'
  | 'billing'
  | 'support';

type Props = {
  active: DeveloperSection;
  onChange: (section: DeveloperSection) => void;
  className?: string;
};

export function DeveloperSidebar({ active, onChange, className }: Props) {
  return (
    <Sidebar collapsible="icon" variant="inset" className={className}>
      <SidebarHeader className="px-3 py-2">
        <div className="font-semibold">Developer</div>
        <div className="text-xs text-muted-foreground">Property Dashboard</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={active === 'dashboard'}
                  onClick={() => onChange('dashboard')}
                >
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={active === 'developments'}
                  onClick={() => onChange('developments')}
                >
                  <Building2 />
                  <span>Developments</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={active === 'units'} onClick={() => onChange('units')}>
                  <Boxes />
                  <span>Units</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={active === 'leads'} onClick={() => onChange('leads')}>
                  <Users />
                  <span>Leads</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={active === 'team'} onClick={() => onChange('team')}>
                  <Users />
                  <span>Team</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={active === 'documents'}
                  onClick={() => onChange('documents')}
                >
                  <FolderOpen />
                  <span>Documents & Media</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Growth</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={active === 'marketing'}
                  onClick={() => onChange('marketing')}
                >
                  <Megaphone />
                  <span>Marketing</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={active === 'integrations'}
                  onClick={() => onChange('integrations')}
                >
                  <PlugZap />
                  <span>Integrations</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={active === 'billing'} onClick={() => onChange('billing')}>
              <CreditCard />
              <span>Billing</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={active === 'support'} onClick={() => onChange('support')}>
              <LifeBuoy />
              <span>Support</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default DeveloperSidebar;
```

### 2. Overview Component

**File:** `client/src/components/developer/Overview.tsx`

```tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Home, ClipboardList } from 'lucide-react';

export default function Overview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Total Leads', value: '0', icon: Users },
          { title: 'Total Sales', value: '0', icon: TrendingUp },
          { title: 'Active Developments', value: '0', icon: Home },
          { title: 'Pending Tasks', value: '0', icon: ClipboardList },
        ].map(({ title, value, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardDescription>{title}</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" /> {value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Leads per Day</CardTitle>
            <CardDescription>Recent lead activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Chart placeholder</div>
            <div className="bg-secondary h-40 rounded" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Where your traffic comes from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Chart placeholder</div>
            <div className="bg-secondary h-40 rounded" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Units Sold vs Available</CardTitle>
          <CardDescription>Inventory breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary">Sold: 0</Badge>
            <Badge variant="outline">Available: 0</Badge>
          </div>
          <div className="bg-secondary h-6 rounded mt-4" />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. DevelopmentsList Component

**File:** `client/src/components/developer/DevelopmentsList.tsx`

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export default function DevelopmentsList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Developments</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Add Development
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Developments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Units Available</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Visibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>-</TableCell>
                <TableCell>
                  <Badge variant="outline">Coming Soon</Badge>
                </TableCell>
                <TableCell>0</TableCell>
                <TableCell>0</TableCell>
                <TableCell>
                  <Badge variant="secondary">Private</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4. UnitsManager Component

**File:** `client/src/components/developer/UnitsManager.tsx`

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function UnitsManager() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Units</h2>
        <div className="flex gap-2">
          <Button variant="outline">Bulk Upload CSV</Button>
          <Button variant="outline">Add Unit Type</Button>
          <Button variant="outline">Edit Pricing</Button>
          <Button variant="outline">Update Availability</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Units Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Photos</TableHead>
                <TableHead>Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5. LeadsManager Component

**File:** `client/src/components/developer/LeadsManager.tsx`

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function LeadsManager() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Leads</h2>
        <div className="flex gap-2">
          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="viewing">Viewing</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lead Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  <Badge variant="secondary">New</Badge>
                </TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 6. TeamManagement Component

**File:** `client/src/components/developer/TeamManagement.tsx`

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function TeamManagement() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Team</h2>
        <Button>Invite Member</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Internal Team</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>External Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 7. DocumentsMedia Component

**File:** `client/src/components/developer/DocumentsMedia.tsx`

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DocumentsMedia() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Documents & Media</h2>
      <Card>
        <CardHeader>
          <CardTitle>Folders</CardTitle>
          <CardDescription>Organize price lists, brochures, floor plans, videos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Price Lists', 'Brochures', 'Floor Plans', 'Videos'].map(name => (
              <div key={name} className="border rounded p-3">
                <div className="font-medium">{name}</div>
                <div className="text-xs text-muted-foreground">0 files</div>
                <div className="mt-2">
                  <Badge variant="outline">Private</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 8. MarketingCampaigns Component

**File:** `client/src/components/developer/MarketingCampaigns.tsx`

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MarketingCampaigns() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Marketing & Campaigns</h2>
        <Button>Boost Development</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
          <CardDescription>Impressions, clicks, cost, ROI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No active campaigns.</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Order Placements</CardTitle>
          <CardDescription>Order banners or featured placements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Coming soon.</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 9. IntegrationsPanel Component

**File:** `client/src/components/developer/IntegrationsPanel.tsx`

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function IntegrationsPanel() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Integrations</h2>
      <Card>
        <CardHeader>
          <CardTitle>API Settings</CardTitle>
          <CardDescription>Webhook URLs and credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm">Webhook URL</label>
            <Input placeholder="https://example.com/webhook" />
          </div>
          <div>
            <label className="text-sm">API Key</label>
            <Input placeholder="********" type="password" />
          </div>
          <Button>Save</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
          <CardDescription>External CRM/ERP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Not connected.</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 10. BillingPanel Component

**File:** `client/src/components/developer/BillingPanel.tsx`

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function BillingPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Current plan and billing cycle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No subscription found.</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Campaign Billing</CardTitle>
          <CardDescription>History of marketing spend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No campaign charges.</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 11. SupportCenter Component

**File:** `client/src/components/developer/SupportCenter.tsx`

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function SupportCenter() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Help Articles</CardTitle>
          <CardDescription>Search common questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Search help..." />
          <div className="text-sm text-muted-foreground">No results yet.</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Submit a Ticket</CardTitle>
          <CardDescription>Our team will get back to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Subject" />
          <Textarea placeholder="Describe your issue" />
          <Button>Send</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
          <CardDescription>Live support widget</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chat widget placeholder.</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 📦 Dependencies & Libraries

### Required UI Components (from shadcn/ui)

```json
{
  "components": [
    "@/components/ui/card",
    "@/components/ui/badge",
    "@/components/ui/button",
    "@/components/ui/sidebar",
    "@/components/ui/table",
    "@/components/ui/input",
    "@/components/ui/textarea",
    "@/components/ui/select"
  ]
}
```

### Icons

```tsx
import {
  LayoutDashboard,
  Building2,
  Boxes,
  Users,
  FolderOpen,
  Megaphone,
  PlugZap,
  CreditCard,
  LifeBuoy,
  Plus,
  TrendingUp,
  Home,
  ClipboardList,
} from 'lucide-react';
```

### Routing

- Using `wouter` for routing
- Main route: `/developer/dashboard`

### Authentication

- Using custom `useAuth` hook from `@/_core/hooks/useAuth`
- Role check: `user.role === 'property_developer'`

---

## 🎨 Dashboard Features Overview

### Main Sections

1. **Dashboard (Overview)** - Stats, charts, recent activity
2. **Developments** - Manage property developments
3. **Units** - Unit inventory management
4. **Leads** - Lead tracking and management
5. **Team** - Internal team & external agents
6. **Documents & Media** - File organization
7. **Marketing** - Campaigns and promotions
8. **Integrations** - API and webhook settings
9. **Billing** - Subscription and invoices
10. **Support** - Help center and tickets

### Key Features

- ✅ Role-based access control (`property_developer`)
- ✅ Sidebar navigation with collapsible sections
- ✅ Responsive layout with mobile support
- ✅ Loading states and authentication checks
- ✅ Integration with TRPC for data fetching
- ✅ Modern UI with shadcn/ui components
- ✅ Modular component architecture

---

## 🔌 API Integration Points

### TRPC Endpoints Used

```tsx
// Example from PropertyDeveloperDashboard.tsx
const { data: properties, isLoading: propertiesLoading } = trpc.properties.myProperties.useQuery();
```

### Auth Integration

```tsx
const { isAuthenticated, user, loading } = useAuth();
```

---

## 🚀 Implementation Steps for Lovable

1. **Create the skeleton structure** in Lovable
2. **Set up the routing** (`/developer/dashboard`)
3. **Build all 11 components** listed above
4. **Implement the sidebar navigation** with section switching
5. **Add authentication guards** (RequireRole)
6. **Style with Tailwind CSS** and shadcn/ui
7. **Export the complete code** from Lovable
8. **Import back into main codebase** at specified file paths
9. **Connect to existing TRPC endpoints**
10. **Test authentication flow** and redirects

---

## 📁 File Structure Summary

```
client/src/
├── pages/
│   └── PropertyDeveloperDashboard.tsx
├── components/
│   ├── RequireRole.tsx
│   └── developer/
│       ├── DeveloperSidebar.tsx
│       ├── Overview.tsx
│       ├── DevelopmentsList.tsx
│       ├── UnitsManager.tsx
│       ├── LeadsManager.tsx
│       ├── TeamManagement.tsx
│       ├── DocumentsMedia.tsx
│       ├── MarketingCampaigns.tsx
│       ├── IntegrationsPanel.tsx
│       ├── BillingPanel.tsx
│       └── SupportCenter.tsx
└── App.tsx (add route configuration)
```

---

## 🎯 Key Integration Points

### 1. App.tsx Route Addition

```tsx
<Route path="/developer/dashboard">
  <RequireRole role="property_developer">
    <PropertyDeveloperDashboard />
  </RequireRole>
</Route>
```

### 2. Login.tsx Redirect Logic

```tsx
if (role === 'property_developer') {
  redirectPath = '/developer/dashboard';
}
```

### 3. Database User Role

- User role must be: `'property_developer'`
- Stored in `users` table in database

---

## 📝 Notes for Development

- All components use TypeScript with React
- UI built with Tailwind CSS
- Uses shadcn/ui component library
- Icons from lucide-react
- Routing with wouter
- State management with React hooks
- Data fetching with TRPC
- Authentication with custom useAuth hook

---

## ✅ Checklist Before Integration

- [ ] All 11 component files created
- [ ] Main dashboard page implemented
- [ ] Sidebar navigation working
- [ ] Authentication guards in place
- [ ] Route configuration added to App.tsx
- [ ] Login redirect logic updated
- [ ] All imports verified
- [ ] TypeScript types defined
- [ ] Responsive design tested
- [ ] Loading states implemented

---

**End of Export Document**

_This document contains the complete skeleton code for the Property Developer Dashboard. Build this in Lovable, then copy the files back to the exact paths specified above._
