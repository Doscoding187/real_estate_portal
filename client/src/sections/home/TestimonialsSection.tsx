import { MapPin } from 'lucide-react';

const testimonials = [
  {
    name: 'Thabo Mkhize',
    location: 'Johannesburg',
    rating: 5,
    text: 'Found my perfect apartment in Sandton within 2 weeks. The team was professional and responsive throughout the process.',
    avatar: '👨🏿',
  },
  {
    name: 'Sarah van der Merwe',
    location: 'Cape Town',
    rating: 5,
    text: 'Excellent service! They helped me find a beautiful family home in Constantia. Highly recommend for anyone looking in the Western Cape.',
    avatar: '👩🏼',
  },
  {
    name: 'Priya Naidoo',
    location: 'Durban',
    rating: 5,
    text: 'The property insights and market data helped me make an informed decision. Great platform for first-time buyers!',
    avatar: '👩🏾',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 px-3 sm:px-4 md:px-6 bg-gradient-to-b from-slate-50/50 to-white">
      <div className="text-left mb-8 md:mb-12">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 mb-3 sm:mb-4">
          <span className="text-xl sm:text-2xl">⭐</span>
          <span className="text-xs sm:text-sm font-semibold text-yellow-700">Trusted by Thousands</span>
        </div>
        <h2 className="text-xl md:text-[26px] font-bold text-slate-900 mb-2">What Our Clients Say</h2>
        <p className="text-slate-600 text-xs md:text-sm max-w-2xl leading-relaxed">
          Real experiences from people who found their dream homes
        </p>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-hide px-1 sm:px-2 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0">
        {testimonials.map((testimonial, idx) => (
          <div
            key={idx}
            className="flex-none w-[280px] sm:w-[320px] md:w-auto snap-center relative bg-white p-5 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-slate-200/60 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 group"
          >
            <div className="absolute top-6 right-6 text-6xl text-[#2774AE]/10 group-hover:text-[#2774AE]/20 transition-colors font-serif leading-none">
              "
            </div>

            <div className="relative">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">
                    ★
                  </span>
                ))}
              </div>
              <p className="text-slate-700 mb-6 leading-relaxed text-base italic">"{testimonial.text}"</p>
              <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                <div className="text-5xl">{testimonial.avatar}</div>
                <div>
                  <p className="font-bold text-slate-900 text-base">{testimonial.name}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {testimonial.location}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


