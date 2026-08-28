import { Box, FileText, Play, Ruler } from 'lucide-react';

export type PublicPropertyMedia = {
  id?: number | string;
  url: string;
  mediaType: 'image' | 'video' | 'floorplan' | 'pdf';
  mimeType?: string | null;
  presentationKind?: 'floorplan' | 'document';
  presentationLabel?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  originalFileName?: string | null;
  displayOrder?: number;
};

export type PublicPropertyVirtualTour = {
  provider: 'matterport';
  embedUrl: string;
  displayLabel?: string;
  status: 'active';
};

interface PropertyMediaTypeSectionProps {
  media: PublicPropertyMedia[];
  virtualTour?: PublicPropertyVirtualTour | null;
}

const ordered = (items: PublicPropertyMedia[]) =>
  items
    .filter(item => Boolean(item.url))
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));

/**
 * Public Property Presentation rendering boundary. Photos stay in the hero
 * gallery; semantic assets are deliberately rendered in their own sections.
 */
export function PropertyMediaTypeSection({ media, virtualTour }: PropertyMediaTypeSectionProps) {
  const videos = ordered(media.filter(item => item.mediaType === 'video'));
  const plans = ordered(
    media.filter(item => item.presentationKind === 'floorplan' || item.mediaType === 'floorplan'),
  );
  const documents = ordered(
    media.filter(
      item =>
        item.presentationKind === 'document' ||
        (item.mediaType === 'pdf' && item.presentationKind !== 'floorplan'),
    ),
  );

  if (videos.length === 0 && plans.length === 0 && documents.length === 0 && !virtualTour) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4">
      {plans.length > 0 && (
        <section
          id="floor-plans"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="mb-4 flex items-start gap-3">
            <Ruler className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Plans & layouts</h2>
              <p className="mt-1 text-sm text-slate-500">
                Understand the property layout before arranging a viewing.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((item, index) => {
              const label = item.presentationLabel || item.originalFileName || 'Property plan';
              const isImage =
                item.mediaType === 'floorplan' &&
                (item.mimeType?.startsWith('image/') === true ||
                  /\.(avif|gif|jpe?g|png|webp)(?:$|\?)/i.test(item.url));
              return isImage ? (
                <a
                  key={item.id ?? `plan-${index}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-blue-300"
                >
                  <img src={item.url} alt={label} className="aspect-[4/3] w-full object-contain" />
                  <span className="block px-3 py-2 text-sm font-semibold text-slate-900">
                    {label}
                  </span>
                </a>
              ) : (
                <a
                  key={item.id ?? `plan-${index}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-28 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <Ruler className="h-8 w-8 shrink-0 text-blue-600" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-900">{label}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      Open plan preview
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section
          id="property-video"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="mb-4 flex items-start gap-3">
            <Play className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Property video</h2>
              <p className="mt-1 text-sm text-slate-500">
                Take a guided walkthrough of the property.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {videos.map((item, index) => (
              <div
                key={item.id ?? `video-${index}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950"
              >
                <video
                  className="aspect-video w-full object-contain"
                  controls
                  preload="metadata"
                  poster={item.thumbnailUrl || item.previewUrl || undefined}
                  src={item.url}
                />
                <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white">
                  <Play className="h-4 w-4" />
                  {item.presentationLabel || 'Walkthrough video'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {virtualTour && (
        <section
          id="virtual-tour"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-start gap-3">
            <Box className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-slate-900">3D / virtual tour</h2>
              <p className="mt-1 text-sm text-slate-500">
                Explore the property in an approved Matterport experience.
              </p>
              <a
                href={virtualTour.embedUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {virtualTour.displayLabel || 'Open 3D tour'}
              </a>
            </div>
          </div>
        </section>
      )}

      {documents.length > 0 && (
        <section
          id="documents"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="mb-4 flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Documents</h2>
              <p className="mt-1 text-sm text-slate-500">
                Public property information supplied by the advertiser.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((item, index) => (
              <a
                key={item.id ?? `document-${index}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-28 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <FileText className="h-8 w-8 shrink-0 text-blue-600" />
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-900">
                    {item.presentationLabel || 'Open property document'}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {item.originalFileName || 'Public property document'}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
