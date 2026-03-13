import { Building2, ChevronRight, Globe, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DeveloperOverviewProps {
  developerName: string;
  developerLogo?: string | null;
  developerDescription?: string | null;
  developerWebsite?: string | null;
  developerSlug?: string | null;
  headOfficeLocation?: string | null;
  projectCount?: number | null;
  foundedYear?: number | null;
  isVerified?: boolean;
}

export function DeveloperOverview({
  developerName,
  developerLogo,
  developerDescription,
  developerWebsite,
  developerSlug,
  headOfficeLocation,
  projectCount,
  foundedYear,
  isVerified = false,
}: DeveloperOverviewProps) {
  const currentYear = new Date().getFullYear();
  const yearsExperience =
    foundedYear && foundedYear > 1900 && foundedYear <= currentYear
      ? currentYear - foundedYear
      : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h3 className="text-xl font-bold text-slate-900">Developer Overview</h3>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
              {developerLogo ? (
                <img
                  src={developerLogo}
                  alt={developerName}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Building2 className="h-8 w-8 text-slate-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-lg font-bold text-slate-900">{developerName}</h4>
                {isVerified && (
                  <Badge className="border-none bg-orange-500 px-3 py-0.5 text-xs font-medium text-white hover:bg-orange-600">
                    VERIFIED DEVELOPER
                  </Badge>
                )}
              </div>

              {headOfficeLocation && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" />
                  <span>{headOfficeLocation}</span>
                </div>
              )}

              {developerWebsite && (
                <a
                  href={developerWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Visit Website
                </a>
              )}
            </div>
          </div>

          <p className="mt-5 line-clamp-3 text-sm leading-relaxed text-slate-600">
            {developerDescription?.trim()
              ? developerDescription
              : 'Professional property developer focused on delivering quality developments.'}
          </p>
        </div>

        <div className="flex h-full flex-col justify-between rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {(yearsExperience || projectCount) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {yearsExperience ? (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center">
                    <div className="text-2xl font-bold text-orange-500">{yearsExperience}+</div>
                    <p className="mt-1 text-xs font-medium text-slate-500">Years Experience</p>
                  </div>
                ) : null}

                {projectCount ? (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center">
                    <div className="text-2xl font-bold text-orange-500">{projectCount}</div>
                    <p className="mt-1 text-xs font-medium text-slate-500">Public Developments</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {developerSlug ? (
            <Button
              asChild
              variant="outline"
              className="mt-6 h-12 justify-between rounded-lg border-slate-200"
            >
              <a href={`/developer/${developerSlug}`}>
                <span className="font-medium text-slate-700">View Developer Profile</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
