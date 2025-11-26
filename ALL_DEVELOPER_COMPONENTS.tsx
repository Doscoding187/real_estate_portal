// ============================================================================
// ALL PROPERTY DEVELOPER DASHBOARD COMPONENTS
// Copy and paste each component as needed
// ============================================================================

// ============================================================================
// 1. DeveloperSidebar.tsx
// File: client/src/components/developer/DeveloperSidebar.tsx
// ============================================================================

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

// ============================================================================
// 2. Overview.tsx
// File: client/src/components/developer/Overview.tsx
// ============================================================================

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

// ============================================================================
// 3. DevelopmentsList.tsx
// File: client/src/components/developer/DevelopmentsList.tsx
// ============================================================================

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

// ============================================================================
// 4. UnitsManager.tsx
// File: client/src/components/developer/UnitsManager.tsx
// ============================================================================

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

// ============================================================================
// 5. LeadsManager.tsx
// File: client/src/components/developer/LeadsManager.tsx
// ============================================================================

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

// ============================================================================
// 6. TeamManagement.tsx
// File: client/src/components/developer/TeamManagement.tsx
// ============================================================================

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

// ============================================================================
// 7. DocumentsMedia.tsx
// File: client/src/components/developer/DocumentsMedia.tsx
// ============================================================================

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

// ============================================================================
// 8. MarketingCampaigns.tsx
// File: client/src/components/developer/MarketingCampaigns.tsx
// ============================================================================

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

// ============================================================================
// 9. IntegrationsPanel.tsx
// File: client/src/components/developer/IntegrationsPanel.tsx
// ============================================================================

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
            <Input placeholder="Enter webhook URL" />
          </div>
          <div>
            <label className="text-sm">API Key</label>
            <Input placeholder="Enter API key" type="password" />
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

// ============================================================================
// 10. BillingPanel.tsx
// File: client/src/components/developer/BillingPanel.tsx
// ============================================================================

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

// ============================================================================
// 11. SupportCenter.tsx
// File: client/src/components/developer/SupportCenter.tsx
// ============================================================================

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
          <Input placeholder="Search help articles" />
          <div className="text-sm text-muted-foreground">No results yet.</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Submit a Ticket</CardTitle>
          <CardDescription>Our team will get back to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Enter subject" />
          <Textarea placeholder="Describe your issue or question" />
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

// ============================================================================
// END OF COMPONENTS
// ============================================================================
