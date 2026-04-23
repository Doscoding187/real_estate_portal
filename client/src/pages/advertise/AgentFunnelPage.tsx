import React from 'react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/advertise/SEOHead';
import { Link } from 'wouter';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InteractiveEstimator } from '@/components/advertise/InteractiveEstimator';
import { ProductPreviewMockup } from '@/components/advertise/ProductPreviewMockup';
import { ValueQualificationLayer } from '@/components/advertise/ValueQualificationLayer';
import { SoftCaptureModal } from '@/components/advertise/SoftCaptureModal';
import { trackEvent } from '@/lib/tracking';

export default function AgentFunnelPage() {
  const [isCaptureModalOpen, setIsCaptureModalOpen] = React.useState(false);
  
  React.useEffect(() => {
    trackEvent('agent_funnel_view', { source: 'direct' });
  }, []);

  const handleCTAClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsCaptureModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-x-hidden">
      <SEOHead 
        title="Estate Agent Advertising | Property Platform" 
        description="Grow your real estate agency with verified leads and performance marketing." 
        canonicalUrl="https://platform.com/advertise/sell/agents" 
      />
      
      <EnhancedNavbar />
      
      <main className="flex-1 flex flex-col pt-20">
        {/* --- Hero Section --- */}
        <section className="bg-white border-b border-slate-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10 flex flex-col lg:flex-row items-center gap-16 max-w-7xl">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-6 ring-1 ring-primary/20">
                For Estate Agents & Agencies
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                Stop chasing leads. <br className="hidden lg:block"/>
                <span className="text-primary">Start closing them.</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Put your properties in front of South Africa's highest-intent home buyers. Quality guaranteed. Pay for performance, not impressions.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 shadow-xl shadow-primary/20" onClick={handleCTAClick}>
                  Start Your 14-Day Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-slate-500 font-medium">No credit card required</p>
              </div>
            </div>
            
            <div className="flex-1 w-full relative hidden md:block">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/30 to-blue-500/30 blur-[80px] rounded-full z-0"></div>
              <div className="relative z-10 transform lg:rotate-1 lg:scale-105 transition-transform hover:scale-110 duration-500">
                <ProductPreviewMockup />
              </div>
            </div>
          </div>
        </section>

        {/* --- Qualification Layer --- */}
        <section className="bg-slate-50 py-24 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-4">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">Is this platform right for your agency?</h2>
            </div>
            <ValueQualificationLayer 
              qualifications={[
                "You hold active sole or joint mandates",
                "You are registered with the PPRA",
                "You want to significantly reduce your cost per acquisition",
                "You prefer highly-qualified leads over sheer volume"
              ]}
              disqualifications={[
                "You only handle informal or unregistered rentals",
                "You don't have digital presence or photos of your properties",
                "You operate exclusively outside of South Africa"
              ]}
            />
          </div>
        </section>

        {/* --- Value Proposition Section --- */}
        <section className="bg-white py-24 px-4 overflow-hidden border-t border-slate-100">
          <div className="container mx-auto max-w-7xl">
             <div className="grid lg:grid-cols-2 gap-16 xl:gap-24 items-center">
                <div>
                   <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                     Built for conversion, <br/>not just passive clicks.
                   </h2>
                   <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                     We pre-qualify thousands of buyers every month to ensure the leads you receive are actively searching and financially ready to transact.
                   </p>
                   <ul className="space-y-6">
                     {[
                       'Verified buyer contact information & ID confirmation',
                       'Pre-calculated affordability guidelines',
                       'Automated CRM injection (PropData, Base, etc.)',
                       'Premium agency branding & agent spotlights'
                     ].map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mr-4 mt-1" />
                          <span className="text-lg text-slate-800 font-medium">{feature}</span>
                        </li>
                     ))}
                   </ul>
                </div>
                
                <div className="bg-slate-50 p-10 lg:p-12 rounded-[2rem] border border-slate-100 shadow-2xl relative">
                   <div className="absolute top-0 right-0 -mt-8 mr-4 text-[150px] text-primary/10 leading-none rotate-6 z-0 font-serif">"</div>
                   <blockquote className="relative z-10">
                      <p className="text-2xl text-slate-900 font-medium mb-8 leading-normal">
                        "The quality of leads from this platform is unparalleled. Our agents are spending less time filtering window-shoppers and more time showing properties. Our ROI increased by 40% in the first quarter alone."
                      </p>
                      <footer className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-slate-300 rounded-full bg-[url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop')] bg-cover"></div>
                        <div>
                          <div className="font-bold text-xl text-slate-900">Sarah Jenkins</div>
                          <div className="text-slate-500 font-medium">Principal, Elite Realtors</div>
                        </div>
                      </footer>
                   </blockquote>
                </div>
             </div>
          </div>
        </section>

        {/* --- Interactive Estimator --- */}
        <section className="bg-slate-950 text-white py-32 px-4 relative overflow-hidden">
           {/* Background Glow */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 bg-primary rounded-full blur-[120px] pointer-events-none"></div>
           
           <div className="container mx-auto max-w-7xl relative z-10">
              <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                 <div>
                    <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white mb-6 border border-white/20">
                      Live ROI Calculator
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">Calculate your expected return instantly.</h2>
                    <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                      Adjust your portfolio metrics to see the immediate impact our network can have on your monthly pipeline and bottom line.
                    </p>
                 </div>
                 <div className="transform transition-transform hover:scale-105 duration-500">
                    <InteractiveEstimator />
                 </div>
              </div>
           </div>
        </section>

        {/* --- Urgency / Loss Aversion --- */}
        <section className="bg-rose-50 py-16 px-4 border-y border-rose-100">
           <div className="container mx-auto max-w-4xl text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-rose-900 mb-4">
                Agents in your area are already receiving these leads.
              </h2>
              <p className="text-lg text-rose-800/80 font-medium max-w-2xl mx-auto">
                Don't miss out on active buyers currently searching in your territory. Secure your agency's presence before your competitors do.
              </p>
           </div>
        </section>

        {/* --- Final CTA --- */}
        <section className="bg-primary py-24 px-4 text-center">
           <div className="container mx-auto max-w-4xl">
              <h2 className="text-4xl lg:text-6xl font-bold text-white mb-8 tracking-tight">Ready to dominate your territory?</h2>
              <p className="text-2xl text-primary-foreground/90 mb-12 max-w-2xl mx-auto leading-relaxed">
                Join top-performing agents already leveraging our platform. Setup takes less than 5 minutes.
              </p>
              <Button size="lg" variant="secondary" onClick={handleCTAClick} className="text-xl h-16 px-12 text-primary bg-white hover:bg-slate-50 shadow-2xl transition-all hover:-translate-y-1">
                Start Your Free Trial
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
           </div>
        </section>
      </main>

      <Footer />
      
      <SoftCaptureModal 
        isOpen={isCaptureModalOpen} 
        onClose={() => setIsCaptureModalOpen(false)} 
        nextRoute="/advertise/sell/agents/onboarding" 
      />
    </div>
  );
}
