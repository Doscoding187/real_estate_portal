import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COST_GUIDES } from '@/features/services/catalog';

export function CostGuidesSection() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Cost Guides & Advice</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {COST_GUIDES.map(guide => (
          <Card key={guide.title} className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{guide.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">{guide.description}</p>
              <Link href={guide.href} className="text-sm font-medium text-slate-900 underline">
                Read guide
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
