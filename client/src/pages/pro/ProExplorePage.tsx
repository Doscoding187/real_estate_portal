import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProExplorePage() {
  return (
    <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6">
      <Card className="mx-auto max-w-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Explore publishing is not available in Services V1</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-slate-600">
          <p>
            Provider video publishing is outside the current Professional Services directory
            journey. No Explore content is created from this workspace.
          </p>
          <Button asChild variant="outline">
            <Link href="/service/dashboard">Return to provider workspace</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
