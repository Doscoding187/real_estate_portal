import React, { useState, useEffect } from 'react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/advertise/SEOHead';
import { OnboardingStepper, Step } from '@/components/advertise/OnboardingStepper';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Building, MapPin, Search, Check } from 'lucide-react';
import { useLocation } from 'wouter';
import { trackEvent } from '@/lib/tracking';

export interface OnboardingData {
  firstName: string;
  lastName: string;
  agencyName: string;
  ppra: string;
  email: string;
  phone: string;
  coverageAreas: string[];
  crmProvider: string;
  planSelection: string;
}

const defaultData: OnboardingData = {
  firstName: '', lastName: '', agencyName: '', ppra: '', email: '', phone: '',
  coverageAreas: [], crmProvider: 'PropData', planSelection: 'Premium'
};

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

function AccountInfoStep({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Create your Agency Account</h2>
        <p className="text-slate-500 mt-2">We'll use this to set up your billing and public profile.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" value={data.firstName} onChange={(e) => updateData({ firstName: e.target.value })} placeholder="Jane" className="h-12" />
        </div>
        <div className="space-y-3">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" value={data.lastName} onChange={(e) => updateData({ lastName: e.target.value })} placeholder="Doe" className="h-12" />
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="agencyName">Agency Name (Optional)</Label>
        <Input id="agencyName" value={data.agencyName} onChange={(e) => updateData({ agencyName: e.target.value })} placeholder="Elite Realtors" className="h-12" />
      </div>

      <div className="space-y-3">
        <Label htmlFor="ppra">PPRA Number</Label>
        <Input id="ppra" value={data.ppra} onChange={(e) => updateData({ ppra: e.target.value })} placeholder="e.g. 1234567" className="h-12" />
      </div>

      <div className="space-y-3">
        <Label htmlFor="email">Work Email</Label>
        <Input id="email" type="email" value={data.email} onChange={(e) => updateData({ email: e.target.value })} placeholder="jane@eliterealtors.co.za" className="h-12" />
      </div>
      
      <div className="space-y-3">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" value={data.phone} onChange={(e) => updateData({ phone: e.target.value })} placeholder="+27 00 000 0000" className="h-12" />
      </div>
    </div>
  );
}

function BusinessCoverageStep({ data, updateData }: StepProps) {
  // Simple mock interaction for coverage areas
  const toggleArea = (area: string) => {
    if (data.coverageAreas.includes(area)) {
       updateData({ coverageAreas: data.coverageAreas.filter(a => a !== area) });
    } else {
       updateData({ coverageAreas: [...data.coverageAreas, area] });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Where do you operate?</h2>
        <p className="text-slate-500 mt-2">Select the primary areas where you hold mandates.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input placeholder="Search for suburbs or cities..." className="h-14 pl-12 text-lg shadow-sm" />
      </div>

      <div className="mt-8 space-y-4">
        <Label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Popular Areas</Label>
        <div className="grid grid-cols-2 gap-4">
          {['Sandton', 'Cape Town City Bowl', 'Umhlanga', 'Pretoria East'].map(area => (
            <div 
              key={area} 
              onClick={() => toggleArea(area)}
              className={`border rounded-lg p-4 flex items-center gap-3 cursor-pointer transition-colors ${data.coverageAreas.includes(area) ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'}`}
            >
              <MapPin className={`${data.coverageAreas.includes(area) ? 'text-primary' : 'text-slate-400'} w-5 h-5`} />
              <span className={`font-medium ${data.coverageAreas.includes(area) ? 'text-primary' : 'text-slate-700'}`}>{area}</span>
              {data.coverageAreas.includes(area) && <Check className="ml-auto text-primary w-5 h-5" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListingsSetupStep({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900">How do you manage listings?</h2>
        <p className="text-slate-500 mt-2">We support automated XML feeds from all major CRM providers.</p>
      </div>

      <div className="space-y-4">
        {['PropData', 'Base', 'VaultRE', 'Manual Upload'].map((provider, i) => (
          <div 
            key={provider} 
            onClick={() => updateData({ crmProvider: provider })}
            className={`border-2 rounded-xl p-5 flex items-center justify-between cursor-pointer transition-colors ${data.crmProvider === provider ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/40'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${data.crmProvider === provider ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                {i === 3 ? <Building className="w-5 h-5"/> : <span className="font-bold">{provider[0]}</span>}
              </div>
              <span className={`font-semibold text-lg ${data.crmProvider === provider ? 'text-primary' : 'text-slate-700'}`}>{provider}</span>
            </div>
            {data.crmProvider === provider && <Check className="text-primary w-6 h-6" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanSelectionStep({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900">Select your package</h2>
        <p className="text-slate-500 mt-2">You won't be charged during your 14-day free trial.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card 
           className={`border-2 hover:border-primary/40 transition-colors relative h-full flex flex-col cursor-pointer ${data.planSelection === 'Standard' ? 'border-primary shadow-lg shadow-primary/10' : 'border-slate-200'}`}
           onClick={() => updateData({ planSelection: 'Standard' })}
        >
          <CardContent className="p-8 flex flex-col flex-1">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Standard</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-slate-900">R1,499</span>
              <span className="text-slate-500">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center text-slate-600"><Check className="w-5 h-5 text-emerald-500 mr-3" /> Up to 50 active listings</li>
              <li className="flex items-center text-slate-600"><Check className="w-5 h-5 text-emerald-500 mr-3" /> Standard directory profile</li>
              <li className="flex items-center text-slate-600"><Check className="w-5 h-5 text-emerald-500 mr-3" /> Basic CRM integration</li>
            </ul>
            <button className={`w-full py-3 rounded-lg border-2 font-semibold transition-colors ${data.planSelection === 'Standard' ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              {data.planSelection === 'Standard' ? 'Selected' : 'Select Standard'}
            </button>
          </CardContent>
        </Card>

        <Card 
           className={`border-2 relative h-full flex flex-col cursor-pointer transition-colors ${data.planSelection === 'Premium' ? 'border-primary shadow-xl shadow-primary/10' : 'border-slate-200 hover:border-primary/40'}`}
           onClick={() => updateData({ planSelection: 'Premium' })}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide uppercase">Most Popular</div>
          <CardContent className="p-8 flex flex-col flex-1">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Premium</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-slate-900">R2,999</span>
              <span className="text-slate-500">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center text-slate-600"><Check className="w-5 h-5 text-emerald-500 mr-3" /> Unlimited active listings</li>
              <li className="flex items-center text-slate-600"><Check className="w-5 h-5 text-emerald-500 mr-3" /> Featured directory profile</li>
              <li className="flex items-center text-slate-600"><Check className="w-5 h-5 text-emerald-500 mr-3" /> Priority CRM integration</li>
              <li className="flex items-center text-slate-600"><Check className="w-5 h-5 text-emerald-500 mr-3" /> Pre-qualified buyer badges</li>
            </ul>
            <button className={`w-full py-3 rounded-lg border-2 font-semibold transition-colors ${data.planSelection === 'Premium' ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              {data.planSelection === 'Premium' ? 'Selected' : 'Select Premium'}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AgentOnboardingPage() {
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState<OnboardingData>(() => {
    try {
      const saved = localStorage.getItem('agent_funnel_data');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    
    // Attempt to pull soft capture email if available
    try {
       const softEmail = sessionStorage.getItem('onboarding_email');
       if (softEmail) {
          return { ...defaultData, email: softEmail };
       }
    } catch(e) {}

    return defaultData;
  });

  useEffect(() => {
    trackEvent('onboarding_started', { email: formData.email });
  }, []);

  useEffect(() => {
    try {
       localStorage.setItem('agent_funnel_data', JSON.stringify(formData));
    } catch(e) {}
  }, [formData]);

  const updateForm = (updates: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const steps: Step[] = [
    {
      id: 'account',
      title: 'Agent Details',
      component: <AccountInfoStep data={formData} updateData={updateForm} />
    },
    {
      id: 'coverage',
      title: 'Service Areas',
      component: <BusinessCoverageStep data={formData} updateData={updateForm} />
    },
    {
      id: 'listings',
      title: 'CRM Setup',
      component: <ListingsSetupStep data={formData} updateData={updateForm} />
    },
    {
      id: 'plan',
      title: 'Plan Selection',
      component: <PlanSelectionStep data={formData} updateData={updateForm} />
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOHead 
        title="Agent Onboarding | Property Platform" 
        description="Set up your real estate agency profile and start receiving buyer leads." 
      />
      
      {/* Minimal Header for Focus */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex justify-between items-center z-10 relative shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation('/')}>
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xl">P</div>
          <span className="font-bold text-xl text-slate-900 tracking-tight hidden sm:block">Platform</span>
        </div>
        <div className="text-sm font-medium text-slate-500">Partner Onboarding</div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <OnboardingStepper 
          steps={steps} 
          onComplete={async () => {
             trackEvent('onboarding_completed', { 
               agencyName: formData.agencyName || 'Unknown', 
               planSelection: formData.planSelection 
             });

             try {
                // Clear the cache so future visits start fresh
                localStorage.removeItem('agent_funnel_data');
                localStorage.removeItem('agent_funnel_step');
                sessionStorage.removeItem('onboarding_email');
                
                // Force Activation loop
                setLocation('/activation');
             } catch(e) {
                console.error('Failed to init agent:', e);
             }
          }} 
        />
      </main>
    </div>
  );
}
