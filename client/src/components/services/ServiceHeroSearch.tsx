import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CategoryChips } from './CategoryChips';
import {
  SERVICE_CATEGORIES,
  type ServiceCategory,
  type SourceSurface,
} from '@/features/services/catalog';

export type ServiceHeroSearchSubmit = {
  category: ServiceCategory;
  location: string;
  sourceSurface: SourceSurface;
};

type ServiceHeroSearchProps = {
  title: string;
  subtitle: string;
  defaultCategory?: ServiceCategory;
  defaultLocation?: string;
  submitLabel?: string;
  sourceSurface?: SourceSurface;
  onSubmit: (input: ServiceHeroSearchSubmit) => void;
};

export function ServiceHeroSearch({
  title,
  subtitle,
  defaultCategory = 'home_improvement',
  defaultLocation = '',
  submitLabel = 'Start matching',
  sourceSurface = 'directory',
  onSubmit,
}: ServiceHeroSearchProps) {
  const [category, setCategory] = useState<ServiceCategory>(defaultCategory);
  const [location, setLocation] = useState(defaultLocation);

  const categoryLabel = useMemo(
    () => SERVICE_CATEGORIES.find(item => item.value === category)?.label || 'Service',
    [category],
  );

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-50 via-white to-sky-50 p-6 shadow-sm md:p-10">
      <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-amber-200/30 blur-2xl" />
      <div className="absolute -bottom-20 -right-12 h-56 w-56 rounded-full bg-sky-200/30 blur-2xl" />
      <div className="relative space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Services Marketplace
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-slate-600">{subtitle}</p>
        </div>

        <Card className="border-slate-200/80 bg-white/95 shadow-lg">
          <CardContent className="space-y-4 p-5 md:p-6">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Service
                </span>
                <select
                  value={category}
                  onChange={event => setCategory(event.target.value as ServiceCategory)}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none ring-0 transition focus:border-slate-500"
                >
                  {SERVICE_CATEGORIES.map(item => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Location
                </span>
                <Input
                  value={location}
                  onChange={event => setLocation(event.target.value)}
                  placeholder="Suburb or city"
                />
              </label>

              <div className="flex items-end">
                <Button
                  className="w-full md:w-auto"
                  onClick={() => onSubmit({ category, location: location.trim(), sourceSurface })}
                >
                  {submitLabel}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Popular
              </span>
              <CategoryChips active={category} onSelect={setCategory} />
            </div>
            <p className="text-sm text-slate-600">
              You are searching for <span className="font-medium text-slate-900">{categoryLabel}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
