import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DemandItem = {
  title: string;
  subtitle: string;
  signal: string;
};

type DemandCarouselProps = {
  title: string;
  items: DemandItem[];
};

export function DemandCarousel({ title, items }: DemandCarouselProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map(item => (
          <Card key={`${item.title}-${item.signal}`} className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-slate-600">{item.subtitle}</p>
              <p className="font-medium text-slate-900">{item.signal}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
