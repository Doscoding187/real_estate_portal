import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import {
  getPropertyServiceActions,
  type PropertyServiceAction,
} from '@/features/services/propertyServiceActions';

type PropertyServiceActionsProps = {
  propertyId: number;
  listingType?: string | null;
  propertyType?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  developmentId?: number | string | null;
};

function buildServiceRequestHref({
  action,
  propertyId,
  suburb,
  city,
  province,
}: {
  action: PropertyServiceAction;
  propertyId: number;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
}) {
  const query = new URLSearchParams();

  query.set('propertyId', String(propertyId));
  query.set('intentStage', action.intentStage);
  query.set('sourceSurface', 'journey_injection');
  query.set('reasonKey', action.reasonKey);

  if (suburb) query.set('suburb', suburb);
  if (city) query.set('city', city);
  if (province) query.set('province', province);

  return `/services/request/${action.category}?${query.toString()}`;
}

export function PropertyServiceActions({
  propertyId,
  listingType,
  suburb,
  city,
  province,
  developmentId,
}: PropertyServiceActionsProps) {
  const actions = getPropertyServiceActions({
    listingType,
    isDevelopmentLinked: Boolean(developmentId),
  });

  if (!propertyId || actions.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="property-service-actions-heading"
      className="mt-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="mb-5 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          Property journey support
        </p>
        <h2
          id="property-service-actions-heading"
          className="mt-2 text-2xl font-bold text-slate-900"
        >
          Get help with this property
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Access property services that can support your next step.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map(action => (
          <Link
            key={`${action.category}-${action.reasonKey}`}
            href={buildServiceRequestHref({
              action,
              propertyId,
              suburb,
              city,
              province,
            })}
            className="group flex min-h-40 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{action.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
            </div>

            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
              Start request
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
