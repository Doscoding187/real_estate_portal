export type DistributionMediaAssetType = 'image' | 'pdf' | 'video';

export type DistributionMediaAsset = {
  url: string;
  fileName: string | null;
  type: DistributionMediaAssetType;
};

export type DistributionUnitMedia = {
  gallery: DistributionMediaAsset[];
  floorPlans: DistributionMediaAsset[];
  renders: DistributionMediaAsset[];
};

export function emptyDistributionUnitMedia(): DistributionUnitMedia {
  return { gallery: [], floorPlans: [], renders: [] };
}

export function distributionUnitMediaCount(
  media: DistributionUnitMedia | null | undefined,
): number {
  if (!media) return 0;
  return media.gallery.length + media.floorPlans.length + media.renders.length;
}
