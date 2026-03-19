import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

type ComingSoonModuleProps = {
  title: string;
  description?: string;
};

export default function ComingSoonModule({
  title,
  description = 'This module is not available yet.',
}: ComingSoonModuleProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-4 p-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-slate-500 mt-1">{description}</p>
      </div>

      <div>
        <Button variant="outline" onClick={() => setLocation('/admin/overview')}>
          Back to Overview
        </Button>
      </div>
    </div>
  );
}

