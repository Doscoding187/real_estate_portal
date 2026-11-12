import { BarChart3 } from 'lucide-react';
import { SectionEmptyState } from '@/components/ui/SectionEmptyState';

/**
 * Property market insights. The price and supply figures this section used to show came from
 * tables that no longer exist, and there is no statistics source yet. Until there is one the
 * section keeps its place on the page with an honest empty state. It shows no numbers.
 */
export function HomeMarketInsightsSection() {
  return (
    <section className="home-section bg-white" aria-labelledby="home-insights-heading">
      <div className="home-section-header">
        <h2
          id="home-insights-heading"
          className="home-section-title text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]"
        >
          Property market insights
        </h2>
        <p className="max-w-2xl text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
          See how the property market is moving, area by area.
        </p>
      </div>
      <SectionEmptyState
        icon={BarChart3}
        message="Market insights will appear here as more homes are listed."
        action={{ label: 'Explore areas', href: '/south-africa' }}
      />
    </section>
  );
}
