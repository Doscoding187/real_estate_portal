import {
  getLocalMediaMaxBytes,
  getMediaStorageAdapter,
  writeLocalMediaObject,
} from '../_core/mediaStorage';
import {
  confirmDeveloperMediaUpload,
  reserveDeveloperMediaUpload,
  type DeveloperMediaCategory,
} from '../services/developerMediaAuthority';

import type { DeveloperTestContext } from './developerTestContext';

function mediaTypeFor(category: DeveloperMediaCategory): 'image' | 'video' | 'floorplan' | 'pdf' {
  if (category === 'development_image' || category === 'unit_gallery') return 'image';
  if (category === 'development_video') return 'video';
  if (category === 'development_document') return 'pdf';
  return 'floorplan';
}

export type ConfirmedDeveloperTestMedia = {
  url: string;
  key: string;
  storageKey: string;
  uploadReceipt: string;
  mediaReceipt: string;
  fileName: string;
  fileSize: number;
  category: DeveloperMediaCategory;
};

/**
 * Test-only fixture helper that follows the same reserve → bytes → confirm
 * protocol as the mounted Developer uploader. It deliberately cannot create
 * an arbitrary URL fixture for Developer-owned development media.
 */
export async function createConfirmedDeveloperTestMedia(
  context: DeveloperTestContext,
  input: {
    developmentId?: number | null;
    unitId?: string | null;
    category?: DeveloperMediaCategory;
    fileName?: string;
    contentType?: string;
    body?: Buffer;
  } = {},
): Promise<ConfirmedDeveloperTestMedia> {
  if (getMediaStorageAdapter() !== 'local') {
    throw new Error('Developer media test fixtures require the governed local media adapter.');
  }

  const category = input.category ?? 'development_image';
  const mediaType = mediaTypeFor(category);
  const contentType = input.contentType ?? 'image/png';
  const fileName = input.fileName ?? `developer-fixture-${Date.now()}.png`;
  const reservation = await reserveDeveloperMediaUpload({
    userId: context.userId,
    organisationId: context.organisationId,
    publisherId: context.cataloguePublisherId,
    developmentId: input.developmentId ?? null,
    unitId: input.unitId ?? null,
    category,
    fileName,
    contentType,
  });
  const body = input.body ?? Buffer.from('property-listify-developer-media-test-fixture');

  await writeLocalMediaObject(
    reservation.key,
    contentType,
    (async function* () {
      yield body;
    })(),
    getLocalMediaMaxBytes(mediaType),
  );

  const confirmed = await confirmDeveloperMediaUpload({
    uploadReceipt: reservation.uploadReceipt,
    userId: context.userId,
    organisationId: context.organisationId,
    publisherId: context.cataloguePublisherId,
  });

  return {
    url: confirmed.url,
    key: confirmed.key,
    storageKey: confirmed.key,
    uploadReceipt: confirmed.uploadReceipt,
    mediaReceipt: confirmed.uploadReceipt,
    fileName: confirmed.fileName,
    fileSize: confirmed.fileSize,
    category: confirmed.category,
  };
}
