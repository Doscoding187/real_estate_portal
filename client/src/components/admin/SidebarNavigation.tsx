import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  LayoutDashboard,
  Building2,
  Users,
  Home,
  CreditCard,
  BarChart3,
  MessageSquare,
  FileText,
  Settings,
  Shield,
  TrendingUp,
  Megaphone,
  Handshake,
  Code,
  User,
  Star,
  DollarSign,
  CheckCircle,
  Briefcase,
  Activity,
  Layers,
  Lock,
  Globe,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

const SidebarNavigation: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState('core');

  // Determine active section based on current path to auto-expand
  useEffect(() => {
    if (location.startsWith('/admin/overview') || location === '/admin') setActiveSection('core');
    else if (location.startsWith('/admin/properties')) setActiveSection('core');
    else if (location.startsWith('/admin/development')) setActiveSection('core');
    else if (location.startsWith('/admin/approvals')) setActiveSection('core');
    else if (location.startsWith('/admin/ecosystem')) setActiveSection('ecosystem');
    else if (location.startsWith('/admin/agencies')) setActiveSection('ecosystem');
    else if (location.startsWith('/admin/agents')) setActiveSection('ecosystem');
    else if (location.startsWith('/admin/agents')) setActiveSection('ecosystem');
    else if (location.startsWith('/admin/developers')) setActiveSection('ecosystem');
    else if (location.startsWith('/admin/publisher')) setActiveSection('ecosystem');
    else if (location.startsWith('/admin/revenue')) setActiveSection('revenue');
    else if (location.startsWith('/admin/subscriptions')) setActiveSection('revenue');
    else if (location.startsWith('/admin/marketing')) setActiveSection('revenue');
    else if (location.startsWith('/admin/monetization')) setActiveSection('revenue');
    else if (location.startsWith('/admin/partners')) setActiveSection('revenue');
    else if (location.startsWith('/admin/analytics')) setActiveSection('insights');
    else if (location.startsWith('/admin/users')) setActiveSection('system');
    else if (location.startsWith('/admin/settings')) setActiveSection('system');
  }, [location]);

  const groups = [
    {
      id: 'core',
      title: 'CORE OPERATIONS',
      icon: Layers,
      items: [
        { name: 'Dashboard', path: '/admin/overview', icon: LayoutDashboard },
        { name: 'Listings', path: '/admin/properties', icon: Home },
        { name: 'Developments', path: '/admin/development-approvals', icon: Building2 }, // Using Approvals as likely intent for "Projects"
        { name: 'Approvals', path: '/admin/approvals', icon: CheckCircle },
      ],
    },
    {
      id: 'ecosystem',
      title: 'ECOSYSTEM',
      icon: Globe,
      items: [
        { name: 'Overview', path: '/admin/ecosystem', icon: LayoutDashboard },
        { name: 'Agencies', path: '/admin/agencies', icon: Building2 },
        { name: 'Agents', path: '/admin/agents', icon: Users },

        { name: 'Developers', path: '/admin/developers', icon: Code },
        { name: 'Publisher / Emulator', path: '/admin/publisher', icon: Building2 },
        { name: 'End Users', path: '/admin/users', icon: User }, // Specific User Management
      ],
    },
    {
      id: 'revenue',
      title: 'REVENUE & GROWTH',
      icon: TrendingUp,
      items: [
        { name: 'Revenue Center', path: '/admin/revenue', icon: DollarSign },
        { name: 'Subscriptions', path: '/admin/subscriptions', icon: CreditCard },
        { name: 'Featured Placements', path: '/admin/marketing', icon: Star },
        { name: 'Location Monetization', path: '/admin/monetization', icon: DollarSign },
        { name: 'Partner Network', path: '/admin/partners', icon: Handshake },
      ],
    },
    {
      id: 'insights',
      title: 'INSIGHTS',
      icon: Activity,
      items: [
        { name: 'Platform Analytics', path: '/admin/analytics', icon: BarChart3 },
        { name: 'Financial Tracking', path: '/admin/revenue', icon: FileText }, // Reusing Revenue for now
      ],
    },
    {
      id: 'system',
      title: 'SYSTEM',
      icon: Settings,
      items: [
        { name: 'User & Role Management', path: '/admin/users', icon: Users },
        { name: 'Content Manager', path: '/admin/content', icon: FileText },
        { name: 'Communications', path: '/admin/communications', icon: MessageSquare },
        { name: 'Settings & Integrations', path: '/admin/settings', icon: Settings },
        { name: 'System & Security', path: '/admin/system', icon: Shield },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-xl border-r border-white/40 w-full pt-4">
      <Accordion
        type="single"
        collapsible
        value={activeSection}
        onValueChange={setActiveSection}
        className="px-4 space-y-2"
      >
        {groups.map(group => (
          <AccordionItem key={group.id} value={group.id} className="border-none">
            <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-lg hover:bg-primary/5 text-primary/70 font-medium data-[state=open]:bg-primary/10 data-[state=open]:text-primary mb-1">
              <div className="flex items-center gap-3">
                <group.icon className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{group.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-2">
              <div className="flex flex-col gap-1 ml-4 border-l border-primary/20 pl-4 mt-1">
                {group.items.map(item => {
                  const isActive = location === item.path;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setLocation(item.path)}
                      className={cn(
                        'text-sm text-left py-2 px-3 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                          : 'text-primary/60 hover:text-primary hover:bg-primary/5',
                      )}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default SidebarNavigation;
