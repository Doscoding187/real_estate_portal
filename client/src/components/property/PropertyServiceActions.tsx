import { useLocation } from 'wouter';
import {
  Landmark,
  ClipboardCheck,
  Truck,
  Wrench,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import {
  getServiceActionsForListing,
  reasonKeyToLabel,
  type ServiceAction,
} from '@/features/services/propertyServiceActions';

const ICON_MAP: Record<string, LucideIcon> = {
  finance_legal: Landmark,
  inspection_compliance: ClipboardCheck,
  moving: Truck,
  home_improvement: Wrench,
  insurance: ShieldCheck,
};

interface PropertyServiceActionsProps {
  listingType?: string | null;
  propertyId: number;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  isDevelopmentLinked?: boolean;
}

function buildCtaUrl(action: ServiceAction, props: PropertyServiceActionsProps): string {
  const params = new URLSearchParams();
  params.set('propertyId', String(props.propertyId));
  params.set('sourceSurface', 'journey_injection');
  params.set('intentStage', action.intentStage);
  params.set('recommendedCategory', action.category);
  params.set('reasonKey', action.reasonKey);
  if (props.suburb) params.set('suburb', props.suburb);
  if (props.city) params.set('city', props.city);
  if (props.province) params.set('province', props.province);
  return `/services/request/${action.category}?${params.toString()}`;
}

export function PropertyServiceActions(props: PropertyServiceActionsProps) {
  const [, setLocation] = useLocation();

  const actions = getServiceActionsForListing(props.listingType, props.isDevelopmentLinked);
  if (actions.length === 0) return null;

  return (
    <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-bold text-slate-900">Get help with this property</h2>
        <p className="text-sm leading-relaxed text-slate-500">
          Recommended services based on this listing and your property journey.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(action => {
          const Icon = ICON_MAP[action.category] || Wrench;
          const reasonLabel = reasonKeyToLabel(action.reasonKey);
          return (
            <button
              key={action.reasonKey}
              type="button"
              onClick={() => setLocation(buildCtaUrl(action, props))}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm transition group-hover:bg-blue-100">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{action.label}</p>
                {reasonLabel && (
                  <p className="mt-0.5 text-xs font-medium text-blue-600">{reasonLabel}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
