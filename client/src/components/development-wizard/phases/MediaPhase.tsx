import React, { useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Loader2, Plus, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDevelopmentWizard, type MediaItem } from '@/hooks/useDevelopmentWizard';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { useAuth } from '@/_core/hooks/useAuth';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import {
  DOCUMENT_SLOTS,
  IMAGE_TYPES,
  PDF_TYPE,
  PHOTO_SLOTS,
  VIDEO_TYPES,
  documentMeta,
  documentSlotOf,
  groupDocuments,
  normalizePhotosForCover,
  photosForSlot,
  rejectionMessage,
  resolveCover,
  sizeHint,
  slotById,
  stampDocuments,
  type DocumentSlotId,
  type MediaKind,
  type PhotoSlotId,
} from '@/lib/wizardMedia';
import { wizardTokens as t } from '../../wizard/ui/wizardTokens';
import { WizardSection } from '../../wizard/ui/WizardUi';

type SlotKey = PhotoSlotId | 'video' | DocumentSlotId;

const IMAGE_ACCEPT = IMAGE_TYPES.join(',');
const VIDEO_ACCEPT = VIDEO_TYPES.join(',');

/**
 * Media: about the development as a whole (house photos and floor plans go in
 * House types). Guided photo slots -> existing media categories (see
 * lib/wizardMedia.ts), one video, and PDF-only documents for buyers.
 *
 * Upload path: a platform curator (super admin operating as a curated
 * publisher) uses the publisher presign + PUT route; every other user uses the
 * developer reserve + PUT + confirm route. Same two routes as before.
 */
export function MediaPhase() {
  const { saveWorkflowStepData, getWizardData, stepData, stepErrors, currentStepId } =
    useDevelopmentWizard();
  const editingDevelopmentId = useDevelopmentWizard(state => state.editingId);
  const { user } = useAuth();
  const { context: publisherContext } = usePublisherContext();
  const isCuratedPublisherMode =
    user?.role === 'super_admin' && publisherContext?.mode === 'platform_curator';

  const reserveMediaUpload = trpc.developer.reserveMediaUpload.useMutation();
  const confirmMediaUpload = trpc.developer.confirmMediaUpload.useMutation();
  const presignCuratedUpload = trpc.upload.presign.useMutation();

  const [busy, setBusy] = useState<SlotKey | null>(null);
  const [slotErrors, setSlotErrors] = useState<Partial<Record<SlotKey, string[]>>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  // Source of truth: stepData.development_media; fall back to the wizard data
  // (legacy drafts keep their media there).
  const saved = (stepData?.development_media ?? {}) as Record<string, any>;
  const wizardMedia = ((getWizardData() as Record<string, any>)?.media ?? {}) as Record<string, any>;
  const photos: any[] = saved.photos ?? wizardMedia.photos ?? [];
  const videos: any[] = saved.videos ?? wizardMedia.videos ?? [];
  // Older drafts may hold documents as bare URLs; give them an id and a file name.
  const documents: any[] = (
    saved.documents ??
    wizardMedia.documents ??
    wizardMedia.brochures ??
    []
  ).map((doc: any, index: number) =>
    typeof doc === 'string'
      ? { id: `doc-legacy-${index}`, url: doc, fileName: doc.split('/').pop() || 'Document.pdf' }
      : { id: doc?.id ?? `doc-legacy-${index}`, ...doc },
  );

  // ONE cover rule (lib/wizardMedia.ts resolveCover): the draft's heroImage; older drafts
  // without one show their first photo as the cover; null means it was removed on purpose.
  const heroSource = 'heroImage' in saved ? saved.heroImage : wizardMedia.heroImage;
  const cover = resolveCover({ heroImage: heroSource, photos });
  const coverUrl: string | null = cover?.url ?? null;
  const { bySlot: docBySlot, other: otherDocs } = groupDocuments(documents);

  const errors = (currentStepId && stepErrors?.[currentStepId]) || [];
  const mediaError = errors.find((e: any) => e?.field === 'media')?.message as string | undefined;

  /**
   * Saves the step. `cover` is the URL of the new cover, `null` for "no cover", or
   * left out to keep the current one. Exactly one photo is saved as the cover; the
   * heroImage mirrors it so the preview and the publish payload agree.
   */
  const persist = (next: {
    photos?: any[];
    videos?: any[];
    documents?: any[];
    cover?: string | null;
  }) => {
    const nextPhotos = next.photos ?? photos;
    const wantedCover = next.cover !== undefined ? next.cover : coverUrl;
    const normalized = normalizePhotosForCover(nextPhotos, wantedCover);
    const hero = wantedCover ? (normalized.find(p => p.url === wantedCover) ?? null) : null;
    saveWorkflowStepData('development_media', {
      photos: normalized,
      videos: next.videos ?? videos,
      documents: stampDocuments(next.documents ?? documents),
      heroImage: hero,
    });
  };

  /** One upload: curated publisher route or developer reserve/confirm route. */
  const uploadOne = async (file: File, kind: MediaKind) => {
    const receiptCategory =
      kind === 'video'
        ? 'development_video'
        : kind === 'pdf'
          ? 'development_document'
          : 'development_image';
    if (isCuratedPublisherMode) {
      const target = await presignCuratedUpload.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });
      const response = await fetch(target.url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!response.ok) throw new Error(`Upload failed with status ${response.status}.`);
      return {
        url: target.publicUrl as string,
        storageKey: target.key as string,
        fileSize: file.size,
        uploadReceipt: undefined as string | undefined,
      };
    }
    const reservation = await reserveMediaUpload.mutateAsync({
      filename: file.name,
      contentType: file.type,
      category: receiptCategory,
      ...(editingDevelopmentId ? { developmentId: editingDevelopmentId } : {}),
    });
    const response = await fetch(reservation.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!response.ok) throw new Error(`Upload failed with status ${response.status}.`);
    const confirmed = await confirmMediaUpload.mutateAsync({
      uploadReceipt: reservation.uploadReceipt,
    });
    return {
      url: confirmed.url as string,
      storageKey: confirmed.key as string,
      fileSize: confirmed.fileSize as number,
      uploadReceipt: confirmed.uploadReceipt as string | undefined,
    };
  };

  const upload = async (slot: SlotKey, files: File[]) => {
    const kind: MediaKind = slot === 'video' ? 'video' : isDocumentSlot(slot) ? 'pdf' : 'image';
    // The cover and the video hold one file; documents hold one per slot.
    const single = slot === 'cover' || slot === 'video' || isDocumentSlot(slot);
    const chosen = single ? files.slice(0, 1) : files;

    // Client-side checks use the same limits as the server.
    // Rejections stay visible under the slot until the next good upload there.
    const accepted: File[] = [];
    const problems: string[] = [];
    for (const file of chosen) {
      const problem = rejectionMessage(file, kind);
      if (problem) problems.push(problem);
      else accepted.push(file);
    }
    setSlotErrors(prev => ({ ...prev, [slot]: problems.length ? problems : undefined }));
    if (accepted.length === 0) return;

    setBusy(slot);
    const added: any[] = [];
    for (const file of accepted) {
      try {
        const result = await uploadOne(file, kind);
        const base = {
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url: result.url,
          fileName: file.name,
          fileSize: result.fileSize,
          storageKey: result.storageKey,
          displayOrder: 0,
          uploadedAt: new Date(),
          ...(result.uploadReceipt ? { uploadReceipt: result.uploadReceipt } : {}),
        };
        if (kind === 'image') {
          const def = slotById(slot as PhotoSlotId);
          added.push({
            ...base,
            type: 'image',
            category: def.category,
            isPrimary: slot === 'cover',
          });
        } else if (kind === 'video') {
          added.push({ ...base, type: 'video', category: 'videos', isPrimary: false });
        } else {
          added.push({
            ...base,
            type: 'pdf',
            isPrimary: false,
            ...documentMeta(slot as DocumentSlotId),
          });
        }
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setBusy(null);
    if (added.length === 0) return;

    if (kind === 'image') {
      // A new cover replaces the old one, which stops being featured/primary.
      const kept = slot === 'cover' ? photos.filter(p => p.url !== coverUrl) : photos;
      const known = new Set(kept.map(p => p.url));
      const fresh = added.filter(p => !known.has(p.url));
      persist({
        photos: [...kept, ...fresh],
        ...(slot === 'cover' ? { cover: fresh[0]?.url ?? coverUrl } : {}),
      });
    } else if (kind === 'video') {
      persist({ videos: added });
    } else {
      // One document per slot: a new upload replaces that slot's file.
      const kept = documents.filter(
        d => d !== docBySlot[slot as DocumentSlotId] && documentSlotOf(d) !== slot,
      );
      persist({ documents: [...kept, ...added] });
    }
    toast.success(accepted.length === 1 ? `Uploaded ${accepted[0].name}` : `Uploaded ${added.length} files`);
  };

  const remove = (id: string) => {
    if (id === 'cover-hero') {
      persist({ cover: null });
      return;
    }
    const photo = photos.find(p => p.id === id);
    if (photo) {
      // Removing the cover leaves the draft without one (no other photo is promoted).
      persist({
        photos: photos.filter(p => p.id !== id),
        ...(photo.url === coverUrl ? { cover: null } : {}),
      });
    } else if (videos.some(v => v.id === id)) persist({ videos: videos.filter(v => v.id !== id) });
    else persist({ documents: documents.filter(d => d.id !== id) });
  };

  const openPicker = (slot: SlotKey) => inputs.current[slot]?.click();

  const hiddenInput = (slot: SlotKey, accept: string, multiple: boolean) => (
    <input
      ref={el => {
        inputs.current[slot] = el;
      }}
      type="file"
      className="hidden"
      accept={accept}
      multiple={multiple}
      aria-label={`Upload ${slot}`}
      data-testid={`media-input-${slot}`}
      onChange={e => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (files.length) void upload(slot, files);
      }}
    />
  );

  const slotError = (slot: SlotKey) =>
    slotErrors[slot]?.length ? (
      <div role="alert" data-testid={`media-error-${slot}`} className="text-xs text-red-700">
        {slotErrors[slot]!.map(message => (
          <p key={message}>{message}</p>
        ))}
      </div>
    ) : null;

  const addButton = (slot: SlotKey, label: string) => (
    <button
      type="button"
      onClick={() => openPicker(slot)}
      disabled={busy !== null}
      className="inline-flex h-16 min-w-16 items-center justify-center gap-1 rounded-md border border-dashed border-slate-400 bg-white px-3 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy === slot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      {label}
    </button>
  );

  const coverPresent = Boolean(coverUrl);
  const otherPhotos = photosForSlot(photos, 'other', coverUrl);

  return (
    <div className={cn(t.card, 'flex flex-col gap-7')}>
      <div className="flex items-start gap-4">
        <div className={t.headIconTile}>
          <ImageIcon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Development photos, video &amp; documents
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            About the development as a whole. These appear on the development page and on the
            publisher&rsquo;s profile. Photos and floor plans of each house go in House types.
          </p>
        </div>
      </div>

      <WizardSection label="Photos" hint={sizeHint('image')}>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {PHOTO_SLOTS.map(slot => {
            const inSlot = photosForSlot(photos, slot.id, coverUrl);
            // A cover that is only held as the draft's heroImage still shows in its slot.
            const items =
              slot.id === 'cover' && cover && inSlot.length === 0
                ? [{ id: 'cover-hero', fileName: 'Cover photo', ...cover }]
                : inSlot;
            const missingCover = slot.id === 'cover' && !coverPresent && Boolean(mediaError);
            return (
              <div
                key={slot.id}
                data-testid={`media-slot-${slot.id}`}
                className={cn(
                  'flex flex-col gap-2.5 rounded-lg border bg-white p-3.5',
                  missingCover ? 'border-red-400' : 'border-slate-200',
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{slot.title}</div>
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs font-semibold',
                      slot.id === 'cover' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700',
                    )}
                  >
                    {slot.need}
                  </span>
                </div>
                <p className="text-[13px] leading-snug text-slate-600">{slot.guide}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="group relative h-16 w-24 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={item.url}
                        alt={item.fileName || slot.title}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${item.fileName || slot.title}`}
                        onClick={() => remove(item.id)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {slot.max === 1 && items.length >= 1
                    ? addButton(slot.id, 'Replace')
                    : addButton(slot.id, 'Add')}
                </div>
                {slotError(slot.id)}
                {hiddenInput(slot.id, IMAGE_ACCEPT, slot.max !== 1)}
              </div>
            );
          })}
        </div>
        {mediaError ? (
          <p role="alert" className="mt-3 text-xs text-red-700">
            {mediaError}
          </p>
        ) : null}
        {otherPhotos.length > 0 ? (
          <div data-testid="media-other-photos" className="mt-3.5 rounded-lg border border-slate-200 bg-white p-3.5">
            <div className="text-sm font-semibold text-slate-900">Other photos</div>
            <p className="text-[13px] text-slate-600">
              Saved earlier and kept as they are. They still show on the development page.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {otherPhotos.map(item => (
                <div
                  key={item.id}
                  className="relative h-16 w-24 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                >
                  <img
                    src={item.url}
                    alt={item.fileName || 'Other photo'}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${item.fileName || 'other photo'}`}
                    onClick={() => remove(item.id)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </WizardSection>

      <WizardSection label="Video" hint={sizeHint('video')}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-slate-500" />
            <div>
              <div className="text-sm font-semibold text-slate-900">Development video</div>
              <div className="text-[13px] text-slate-600">
                {videos[0]?.fileName ?? 'A walkthrough or drone clip. Optional.'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {videos[0] ? (
              <button
                type="button"
                aria-label="Remove video"
                onClick={() => remove(videos[0].id)}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            {addButton('video', videos[0] ? 'Replace' : 'Upload video')}
          </div>
          <div className="w-full">{slotError('video')}</div>
          {hiddenInput('video', VIDEO_ACCEPT, false)}
        </div>
      </WizardSection>

      <WizardSection label="Documents for buyers" hint={sizeHint('pdf')}>
        <div className="flex flex-col gap-2.5">
          {DOCUMENT_SLOTS.map(slot => {
            const doc = docBySlot[slot.id];
            return (
              <div
                key={slot.id}
                data-testid={`media-doc-${slot.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5"
              >
                <div className="max-w-[70%]">
                  <div className="text-sm font-semibold text-slate-900">{slot.title}</div>
                  <div className="text-[13px] leading-snug text-slate-600">{slot.guide}</div>
                  {doc ? (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-700">
                      <FileText className="h-4 w-4 text-red-600" />
                      <span className="truncate">{doc.fileName || 'Document.pdf'}</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {doc ? (
                    <button
                      type="button"
                      aria-label={`Remove ${slot.title}`}
                      onClick={() => remove(doc.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                  {addButton(slot.id, doc ? 'Replace PDF' : 'Upload PDF')}
                </div>
                <div className="w-full">{slotError(slot.id)}</div>
                {hiddenInput(slot.id, PDF_TYPE, false)}
              </div>
            );
          })}
          {otherDocs.length > 0 ? (
            <div data-testid="media-other-docs" className="rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="text-sm font-semibold text-slate-900">Other documents</div>
              <p className="text-[13px] text-slate-600">
                Saved earlier and not matched to a slot above. Remove any you no longer want.
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {otherDocs.map(doc => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 text-xs text-slate-700">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <FileText className="h-4 w-4 flex-none text-red-600" />
                      <span className="truncate">{doc.fileName || doc.title || 'Document'}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${doc.fileName || doc.title || 'document'}`}
                      onClick={() => remove(doc.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </WizardSection>
    </div>
  );
}

function isDocumentSlot(slot: SlotKey): slot is DocumentSlotId {
  return DOCUMENT_SLOTS.some(d => d.id === slot);
}
