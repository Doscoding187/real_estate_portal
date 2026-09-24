import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BadgeCheck, ClipboardCheck, MapPinned } from 'lucide-react';

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
            Put your property service in front of the right audience.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
            Property Listify Services is a focused directory for repairs, moving, finance and legal
            help, inspections, insurance, and property media. Providers publish a clear service
            profile and receive requests from people working through a property journey.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login?next=%2Fservice%2Fprofile">
              <Button className="bg-[#0f3d91] hover:bg-[#0a2e6e]">
                Provider sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/services">
              <Button variant="outline">Browse the directory</Button>
            </Link>
          </div>
        </section>

        <Card className="border-[#0f3d91]/10 bg-white shadow-[0_24px_90px_-50px_rgba(15,61,145,0.55)]">
          <CardHeader>
            <CardTitle>How provider access works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                icon: ClipboardCheck,
                title: 'Build a credible profile',
                copy: 'Describe your business, active services, prices where appropriate, and the areas you cover.',
              },
              {
                icon: MapPinned,
                title: 'List your coverage',
                copy: 'Consumers use your listed service area to understand where you can operate.',
              },
              {
                icon: BadgeCheck,
                title: 'Receive a private request',
                copy: 'Once approved for the directory, consumer requests and account contact context appear in your provider workspace.',
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
              Services V1 uses a small, manually reviewed provider cohort. There are no paid plans
              or automated ranking commitments in this flow.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
