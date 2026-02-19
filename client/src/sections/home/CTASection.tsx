import { Button } from '@/components/ui/button';

type CTASectionProps = {
  onBrowse: () => void;
};

export function CTASection({ onBrowse }: CTASectionProps) {
  return (
    <section className="py-16 bg-white">
      <div className="relative rounded-2xl md:rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#2774AE] via-[#2D68C4] to-[#0F52BA] px-4 py-10 sm:px-6 sm:py-12 md:px-12 md:py-20 text-center shadow-2xl">
        <div className="absolute top-0 left-0 w-48 md:w-96 h-48 md:h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-48 md:w-96 h-48 md:h-96 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 md:mb-6 text-white tracking-tight leading-tight">
            Ready to Find Your Dream Property?
          </h2>
          <p className="text-sm sm:text-base md:text-xl mb-6 md:mb-10 text-blue-50 leading-relaxed max-w-2xl mx-auto">
            Join thousands of satisfied users. Whether you're buying, renting, or selling.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={onBrowse}
              className="bg-white text-[#2774AE] hover:bg-blue-50 font-bold text-sm sm:text-base md:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto shadow-2xl hover:shadow-3xl transition-all transform hover:-translate-y-1 hover:scale-105 w-full sm:w-auto"
            >
              Browse All Properties
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#2774AE] font-bold text-sm sm:text-base md:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto transition-all hover:scale-105 w-full sm:w-auto"
            >
              List Your Property
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
