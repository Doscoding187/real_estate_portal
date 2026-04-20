import React from 'react';
import { useLocation } from 'wouter';
import { trackEvent } from '@/lib/tracking';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle2, UploadCloud, Link as LinkIcon } from 'lucide-react';

export default function ActivationGate() {
  const [, setLocation] = useLocation();

  const handleAction = (method: 'manual_upload' | 'crm_sync') => {
    trackEvent('activation_clicked', { actionMethod: method });
    // In a real flow, this redirects to the actual upload tool or CRM config
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Banner */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Your agency profile is live.</h1>
          <p className="text-xl text-slate-600 max-w-lg mx-auto">
            You're successfully set up. Active buyers in your territory will start seeing your listings as soon as you publish them.
          </p>
        </div>

        {/* Forced Action Selection */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          <h2 className="text-center font-semibold text-slate-500 uppercase tracking-wider text-sm mb-6">
            Complete your final step
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-2 border-slate-200 hover:border-primary/50 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 group" onClick={() => handleAction('manual_upload')}>
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                  <UploadCloud className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Upload a Listing</h3>
                <p className="text-slate-500 mb-6 min-h-[60px]">
                  Manually create your first property listing right now to immediately test the waters.
                </p>
                <div className="flex items-center text-primary font-semibold group-hover:gap-2 transition-all">
                  Start Upload <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 hover:border-primary/50 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 group" onClick={() => handleAction('crm_sync')}>
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center mb-6 group-hover:bg-amber-100 transition-colors">
                  <LinkIcon className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Sync your CRM</h3>
                <p className="text-slate-500 mb-6 min-h-[60px]">
                  Connect your existing XML feed to automatically import all your active properties.
                </p>
                <div className="flex items-center text-amber-600 font-semibold group-hover:gap-2 transition-all">
                  Setup Sync <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
