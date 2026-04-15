import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';
import { ArrowRight, Mail } from 'lucide-react';
import { trackEvent } from '@/lib/tracking';

interface SoftCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextRoute: string;
}

export function SoftCaptureModal({ isOpen, onClose, nextRoute }: SoftCaptureModalProps) {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      trackEvent('soft_capture_submitted', { email, source: 'agent_funnel_modal' });
      sessionStorage.setItem('onboarding_email', email);
    }
    onClose();
    setLocation(nextRoute);
  };

  const handleSkip = () => {
    // We could add an skipped event, but omitting for now based on schema
    onClose();
    setLocation(nextRoute);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 mb-2">Uncover your lead potential</DialogTitle>
          <DialogDescription className="text-base text-slate-600">
            Enter your email to secure your agency's territory allocation and see your full lead potential.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input 
              type="email" 
              placeholder="name@youragency.co.za" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-14 pl-10 text-lg border-slate-300"
            />
          </div>
          <div className="flex flex-col gap-3">
            <Button type="submit" size="lg" className="w-full h-12 text-lg">
              Continue to Onboarding <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button type="button" variant="ghost" onClick={handleSkip} className="text-slate-500 hover:text-slate-700">
              Skip for now
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
