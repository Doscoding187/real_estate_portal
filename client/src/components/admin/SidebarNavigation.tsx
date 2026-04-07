import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { ADMIN_NAV_GROUPS, getAdminNavGroupForPath } from '@/pages/admin/adminRouteRegistry';

const SidebarNavigation: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState('core');

  // Determine active section based on current path to auto-expand
  useEffect(() => {
    setActiveSection(getAdminNavGroupForPath(location));
  }, [location]);

  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-xl border-r border-white/40 w-full pt-4">
      <Accordion
        type="single"
        collapsible
        value={activeSection}
        onValueChange={setActiveSection}
        className="px-4 space-y-2"
      >
        {ADMIN_NAV_GROUPS.map(group => (
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
                  const isActive = location === item.path || location.startsWith(`${item.path}/`);
                  return (
                    <button
                      key={item.label}
                      onClick={() => setLocation(item.path)}
                      className={cn(
                        'text-sm text-left py-2 px-3 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                          : 'text-primary/60 hover:text-primary hover:bg-primary/5',
                      )}
                    >
                      {item.label}
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
