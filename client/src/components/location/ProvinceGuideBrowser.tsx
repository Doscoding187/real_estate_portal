import { Link } from 'wouter';
import { ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { HOME_PROVINCE_OPTIONS } from '@/lib/homeProvinceOptions';
import { PROVINCIAL_CONFIGS } from '@shared/provincialDiscovery';

export function ProvinceGuideBrowser() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="min-h-[44px] rounded-full border-slate-200 text-[#2774AE] hover:bg-blue-50"
        >
          Browse by province <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Explore location guides</DialogTitle>
          <DialogDescription>
            Choose a province to get to know its cities, areas and local property opportunities.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HOME_PROVINCE_OPTIONS.map(name => {
            const province = Object.values(PROVINCIAL_CONFIGS).find(
              config => config.name === name,
            )!;
            return (
              <Link
                key={province.slug}
                href={`/${province.slug}`}
                className="flex min-h-[48px] items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2774AE]"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#2774AE]" aria-hidden="true" />
                  {province.name}
                </span>
                <ArrowRight className="h-4 w-4 text-[#2774AE]" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
