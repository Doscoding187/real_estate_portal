import { FileText, Image as ImageIcon, Play } from 'lucide-react';
import {
  distributionUnitMediaCount,
  type DistributionMediaAsset,
  type DistributionUnitMedia,
} from '@shared/distributionUnitMedia';

function assetLabel(asset: DistributionMediaAsset, fallback: string): string {
  return asset.fileName || fallback;
}

function MediaThumbnail({ asset, alt }: { asset: DistributionMediaAsset; alt: string }) {
  if (asset.type === 'video') {
    return (
      <a
        href={asset.url}
        target="_blank"
        rel="noreferrer"
        className="flex h-20 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        title={assetLabel(asset, 'Open render')}
      >
        <Play className="h-5 w-5" />
      </a>
    );
  }
  return (
    <a
      href={asset.url}
      download={asset.fileName ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-md border border-border bg-surface"
      title={assetLabel(asset, 'Open image')}
    >
      <img src={asset.url} alt={alt} loading="lazy" className="h-20 w-full object-cover" />
    </a>
  );
}

export function UnitMediaFolder({
  unitName,
  media,
}: {
  unitName: string;
  media?: DistributionUnitMedia | null;
}) {
  const count = distributionUnitMediaCount(media);
  if (!media || count === 0) {
    return (
      <p className="mt-2 rounded-md border border-dashed border-border px-2.5 py-2 text-[11.5px] text-muted-foreground">
        No unit media published yet.
      </p>
    );
  }

  const gallery = [...media.gallery, ...media.renders];
  const floorPlans = media.floorPlans;

  return (
    <div className="mt-2 rounded-md border border-border bg-surface/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" /> Unit media
        </p>
        <p className="text-[10.5px] text-muted-foreground">
          {count} file{count === 1 ? '' : 's'}
        </p>
      </div>

      {gallery.length ? (
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {gallery.map((asset, index) => (
            <MediaThumbnail
              key={`${asset.url}-${index}`}
              asset={asset}
              alt={`${unitName} media ${index + 1}`}
            />
          ))}
        </div>
      ) : null}

      {floorPlans.length ? (
        <div className="mt-2 space-y-1">
          {floorPlans.map((asset, index) => (
            <a
              key={`${asset.url}-${index}`}
              href={asset.url}
              download={asset.fileName ?? undefined}
              target="_blank"
              rel="noreferrer"
              title={assetLabel(asset, 'Floor plan')}
              className="flex items-center gap-1.5 rounded-md px-1 py-1 text-[11.5px] font-medium text-[#33507e] hover:bg-white"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{assetLabel(asset, 'Floor plan')}</span>
              <span className="text-[10px] uppercase text-muted-foreground">{asset.type}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
