import { Button } from '@/components/ui/button';

type CTASectionProps = {
  onBrowse: () => void;
};

export function CTASection({ onBrowse }: CTASectionProps) {
  return (
    <section className="home-section bg-white">
      <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#2774AE] via-[#2D68C4] to-[#0F52BA] px-4 py-7 text-center shadow-2xl sm:px-6 sm:py-8 md:rounded-[2rem] md:px-12 md:py-12">
        <div className="absolute left-0 top-0 hidden h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl sm:block md:h-96 md:w-96" />
        <div className="absolute bottom-0 right-0 hidden h-48 w-48 translate-x-1/2 translate-y-1/2 rounded-full bg-white/10 blur-3xl sm:block md:h-96 md:w-96" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mx-auto mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-50">
            Start your search
          </div>
          <h2 className="mb-3 text-[1.65rem] font-bold leading-[1.08] tracking-tight text-white sm:mb-4 sm:text-3xl md:mb-6 md:text-5xl">
            Ready to find your next home?
          </h2>
          <p className="mx-auto mb-5 max-w-[30rem] text-[13px] leading-5 text-blue-50 sm:text-base md:mb-10 md:text-xl md:leading-relaxed">
            Explore homes for sale, compare the details that matter, and contact the people
            responsible for the property.
          </p>
          <div className="flex items-center justify-center">
            <Button
              size="lg"
              onClick={onBrowse}
              className="h-auto w-full rounded-full bg-white px-5 py-3.5 text-sm font-bold text-[#2774AE] shadow-2xl transition-all hover:-translate-y-1 hover:scale-[1.01] hover:bg-blue-50 sm:w-auto sm:px-8 sm:py-5 sm:text-base md:text-lg"
            >
              Browse homes for sale
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
