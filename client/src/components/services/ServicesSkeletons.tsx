import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProviderCardSkeleton() {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="grid gap-2 md:grid-cols-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DemandCarouselSkeleton() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-slate-200 bg-white">
            <CardHeader className="space-y-2 pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function PopularProjectsGridSkeleton() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="border-slate-200 bg-white">
            <CardHeader className="space-y-2 pb-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
