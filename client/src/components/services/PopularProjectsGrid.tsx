import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { POPULAR_PROJECTS, getCategoryMeta } from '@/features/services/catalog';

export function PopularProjectsGrid() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Popular Projects</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {POPULAR_PROJECTS.map(project => (
          <Card key={project.title} className="border-slate-200 bg-white">
            <CardHeader className="space-y-2 pb-2">
              <Badge variant="outline">{getCategoryMeta(project.category).shortLabel}</Badge>
              <CardTitle className="text-lg">{project.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">Typical from</p>
              <p className="text-xl font-semibold text-slate-900">{project.typicalFrom}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
