import { FileText, Play, Ruler } from 'lucide-react';

export type PublicPropertyMedia = {
  id?: number | string;
  url: string;
  mediaType: 'image' | 'video' | 'floorplan' | 'pdf';
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  originalFileName?: string | null;
  displayOrder?: number;
};

interface PropertyMediaTypeSectionProps {
  media: PublicPropertyMedia[];
}

/**
 * Non-image public media has an explicit rendering boundary. In particular,
 * floorplans and PDFs are links/documents, never silently routed through the
 * property's ordinary image gallery or hero slot.
 */
export function PropertyMediaTypeSection({ media }: PropertyMediaTypeSectionProps) {
  const nonImageMedia = media
    .filter(item => item.mediaType !== 'image' && Boolean(item.url))
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));

  if (nonImageMedia.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900">More property media</h2>
        <p className="mt-1 text-sm text-slate-500">
          Videos and documents are available separately from the photo gallery.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {nonImageMedia.map((item, index) => {
          if (item.mediaType === 'video') {
            return (
              <div
                key={item.id ?? `${item.mediaType}-${index}`}
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
                  Property video
                </div>
              </div>
            );
          }

          const isFloorplan = item.mediaType === 'floorplan';
          return (
            <a
              key={item.id ?? `${item.mediaType}-${index}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-28 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
            >
              {isFloorplan ? (
                <Ruler className="h-8 w-8 shrink-0 text-blue-600" />
              ) : (
                <FileText className="h-8 w-8 shrink-0 text-blue-600" />
              )}
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900">
                  {isFloorplan ? 'View floor plan' : 'Open property document'}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {item.originalFileName || (isFloorplan ? 'Floor plan' : 'PDF document')}
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
