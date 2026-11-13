import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeCheck, ClipboardCheck, MapPinned } from 'lucide-react';
import { isJourneyRouteHeld } from '@/lib/publicNavigation';

export default function AdvertiseServicesPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0f3d91]">
            <BadgeCheck className="h-3.5 w-3.5" />
            Service provider access
          </div>
          <h1 className="font-['Sora'] text-4xl font-bold tracking-[-0.05em] text-slate-950 md:text-6xl">
            Give your service business a professional home on Property Listify.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
            Build a shareable business profile, present your services and listed coverage, and let
            customers send requests through Property Listify. Approved providers have a public
            business profile and individual service pages.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login?mode=register&role=service_provider">
              <Button>Apply as a service provider</Button>
            </Link>
            {isJourneyRouteHeld('services') ? null : (
              <Link href="/services">
                <Button variant="outline">Browse the directory</Button>
              </Link>
            )}
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Register, verify your email, complete your profile and submit it for review. Your
            profile stays private until an authorized reviewer approves publication. Applying does
            not guarantee approval or customer enquiries.
          </p>
        </section>

        <Card className="border-[#0f3d91]/10 bg-white shadow-[0_24px_90px_-50px_rgba(15,61,145,0.55)]">
          <CardHeader>
            <CardTitle>How provider access works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                icon: ClipboardCheck,
                title: 'Apply and verify your account',
                copy: 'Create a service-provider account and verify your email before starting business profile setup.',
              },
              {
                icon: MapPinned,
                title: 'Complete your business profile',
                copy: 'Add your business information, services and the areas where you work.',
              },
              {
                icon: BadgeCheck,
                title: 'Wait for publication review',
                copy: 'An authorized reviewer checks profile readiness. If approved, your public business pages can receive customer requests.',
              },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0f3d91]" />
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.copy}</p>
                  </div>
                </div>
              );
            })}
            <p className="text-xs leading-5 text-slate-500">
              Services is opening applications for a controlled provider pilot. Profiles remain
              private until approved. The pilot does not include paid plans or paid placement.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
