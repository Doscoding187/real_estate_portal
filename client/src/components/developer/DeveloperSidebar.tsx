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
};

export function DeveloperSidebar({ active, onChange }: Props) {
  return (
    <Sidebar collapsible="icon" variant="inset">
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
