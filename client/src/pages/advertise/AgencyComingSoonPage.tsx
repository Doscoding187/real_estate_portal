import React, { useState } from 'react';
import { Link } from 'wouter';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/advertise/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { trackEvent } from '@/lib/tracking';

export default function AgencyComingSoonPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => {
      trackEvent('agency_founding_interest', { email, agencyName: name });
      setSubmitted(true);
    },
    onError: (err) => {
      setError(err.message || 'Something went wrong. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setError('');
    createLead.mutate({
      name: name.trim(),
      email: email.trim(),
      message: 'Agency founding partner interest',
      source: 'agency_founding_interest',
      leadSource: 'agency_founding_interest',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOHead
        title="Agency Solutions | Coming Soon"
        description="Enterprise-grade agency and brokerage management tools are on their way. Apply early for founding partner access."
        canonicalUrl="/advertise/sell/agencies"
      />
      <EnhancedNavbar />

      <main className="flex-1 flex items-center justify-center pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <Link href="/advertise/sell">
            <a className="inline-flex items-center text-slate-500 hover:text-primary mb-12 font-medium transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Solutions
            </a>
          </Link>

          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Building2 className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
            Agency tools are being built.
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-lg mx-auto">
            Multi-agent management, territory dominance tools, and recruitment dashboards are on their way. Apply now for early founding access.
          </p>

          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-5 py-3 rounded-full mb-10">
            <Clock className="w-4 h-4" />
            Founding agency access opens soon
          </div>

          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 animate-in fade-in duration-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">You're on the list.</h2>
              <p className="text-slate-600">
                We'll notify you personally when Agency access opens. Founding partners get priority onboarding and locked-in pricing.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-left">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Request early access</h2>
              <p className="text-slate-500 text-sm mb-6">
                We'll contact you directly when Agency tools are ready. No spam, no obligation.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="agency-name" className="block text-sm font-medium text-slate-700 mb-1">
                    Agency or Brokerage Name
                  </label>
                  <Input
                    id="agency-name"
                    type="text"
                    placeholder="e.g. Apex Realty Group"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="agency-email" className="block text-sm font-medium text-slate-700 mb-1">
                    Your Email Address
                  </label>
                  <Input
                    id="agency-email"
                    type="email"
                    placeholder="principal@youragency.co.za"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 mb-4">{error}</p>
              )}

              {/* Honeypot — must stay hidden and empty */}
              <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

              <Button
                type="submit"
                className="w-full"
                disabled={createLead.isPending || !name.trim() || !email.trim()}
              >
                {createLead.isPending ? 'Reserving your spot…' : 'Reserve My Founding Access'}
              </Button>
            </form>
          )}

          <p className="text-sm text-slate-500 mt-8">
            Are you an individual agent?{' '}
            <Link href="/advertise/sell/agents">
              <a className="text-primary font-semibold hover:underline">
                Browse agent solutions instead →
              </a>
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
