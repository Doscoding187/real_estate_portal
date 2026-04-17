import { MapPin, Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Thabo Mkhize',
    location: 'Johannesburg',
    rating: 5,
    text: 'Found my perfect apartment in Sandton within 2 weeks. The team was professional and responsive throughout the process.',
    initials: 'TM',
    accent: 'from-amber-200 via-orange-200 to-amber-100',
  },
  {
    name: 'Sarah van der Merwe',
    location: 'Cape Town',
    rating: 5,
    text: 'Excellent service! They helped me find a beautiful family home in Constantia. Highly recommend for anyone looking in the Western Cape.',
    initials: 'SM',
    accent: 'from-sky-200 via-blue-200 to-cyan-100',
  },
  {
    name: 'Priya Naidoo',
    location: 'Durban',
    rating: 5,
    text: 'The property insights and market data helped me make an informed decision. Great platform for first-time buyers!',
    initials: 'PN',
    accent: 'from-emerald-200 via-teal-200 to-cyan-100',
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-gradient-to-b from-slate-50/50 to-white py-7 md:py-10">
      <div className="mb-5 text-left md:mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 px-3 py-1 sm:mb-4 sm:px-4 sm:py-2">
          <Star className="h-4 w-4 fill-current text-yellow-500 sm:h-5 sm:w-5" />
          <span className="text-[11px] font-semibold text-yellow-700 sm:text-sm">
            Trusted by Thousands
          </span>
        </div>
        <h2 className="mb-2 text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]">
          What Our Clients Say
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-sm md:leading-relaxed">
          Real experiences from people who found their dream homes
        </p>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white via-white/90 to-transparent md:hidden" />
        <div className="scrollbar-hide flex snap-x gap-3 overflow-x-auto px-0.5 pb-4 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0">
          {testimonials.map((testimonial, idx) => (
            <div
              key={idx}
              className="group relative w-[78vw] max-w-[292px] flex-none snap-start rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl sm:w-[320px] sm:p-6 md:w-auto md:p-8"
            >
              <div className="absolute right-4 top-4 text-4xl font-serif leading-none text-[#2774AE]/10 transition-colors group-hover:text-[#2774AE]/20 sm:right-6 sm:top-6 sm:text-6xl">
                "
              </div>

              <div className="relative">
                <div className="mb-2.5 flex items-center gap-1 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current text-yellow-400 sm:h-5 sm:w-5" />
                  ))}
                </div>
                <p className="mb-4 text-[13px] italic leading-5 text-slate-700 sm:mb-6 sm:text-base sm:leading-relaxed">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center gap-3 border-t border-slate-100 pt-4 sm:gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${testimonial.accent} text-sm font-bold text-slate-800 shadow-sm sm:h-14 sm:w-14 sm:text-base`}
                  >
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 sm:text-base">
                      {testimonial.name}
                    </p>
                    <p className="flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
