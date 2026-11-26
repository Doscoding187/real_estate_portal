import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { extractConfirmedMediaItems, extractSubmitImages } from '../developmentSubmitPayload';
import { pickBrochureUrl, pickSpecSheetUrl } from '../developmentDocuments';
import { residentialSaleWorkflow } from '../workflows/residential-sale';
import {
  documentMeta,
  groupDocuments,
  guessDocumentSlot,
  normalizePhotosForCover,
  photosForSlot,
  resolveCover,
  slotForPhoto,
  stampDocuments,
} from '../wizardMedia';
import { suggestUnitName } from '../wizardHouseTypes';
import { buildPreviewModel } from '@/components/wizard/previewModel';

const cover = { id: 'c', url: 'https://cdn/c.jpg', category: 'featured', isPrimary: true, storageKey: 'k1', uploadReceipt: 'r1' };
const gate = { id: 'g', url: 'https://cdn/g.jpg', category: 'outdoors', isPrimary: false, storageKey: 'k2', uploadReceipt: 'r2' };

const mediaStep = () => residentialSaleWorkflow.steps.find(s => s.id === 'development_media')!;

describe('removing the cover sticks through save and reopen', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useDevelopmentWizard());
    act(() => result.current.reset());
  });

  it('keeps no cover after removal, in validation, the publish payload and the preview', () => {
    const { result } = renderHook(() => useDevelopmentWizard());
    act(() =>
      result.current.saveWorkflowStepData('development_media', {
        photos: [cover, gate],
        heroImage: cover,
      }),
    );
    expect(mediaStep().validate(result.current.getWizardData() as any).valid).toBe(true);

    // Remove the cover: the step saves heroImage: null and the photo list without it.
    act(() =>
      result.current.saveWorkflowStepData('development_media', {
        photos: normalizePhotosForCover([gate], null),
        heroImage: null,
      }),
    );
    // "Save draft" and reload: the stored step survives a JSON round trip.
    const stored = JSON.parse(JSON.stringify(result.current.stepData.development_media));
    act(() => result.current.reset());
    act(() => result.current.saveWorkflowStepData('development_media', stored));

    const data = result.current.getWizardData() as any;
    expect(data.media.heroImage).toBeNull();
    expect(data.heroImage).toBeUndefined();
    expect(extractSubmitImages(data).some(i => i.url === cover.url || i.category === 'hero')).toBe(false);
    const check = mediaStep().validate(data);
    expect(check.valid).toBe(false);
    expect(buildPreviewModel(data).coverUrl).toBeNull();
  });
});

describe('one cover rule', () => {
  it('slots by the resolved cover and keeps exactly one featured photo', () => {
    const old = { id: 'o', url: 'https://cdn/o.jpg', category: 'featured', isPrimary: true };
    const next = { id: 'n', url: 'https://cdn/n.jpg', category: 'general' };
    const saved = normalizePhotosForCover([old, next], next.url);
    expect(saved.find(p => p.id === 'n')).toMatchObject({ category: 'featured', isPrimary: true });
    expect(saved.find(p => p.id === 'o')).toMatchObject({ category: 'general', isPrimary: false });
    expect(saved.filter(p => p.category === 'featured' || p.isPrimary)).toHaveLength(1);
    expect(photosForSlot(saved, 'cover', next.url).map(p => p.id)).toEqual(['n']);
  });

  it('a legacy draft with no explicit cover shows photos[0] as the cover and saves it as one', () => {
    const legacy = [
      { id: 'a', url: 'https://cdn/a.jpg', category: 'general' },
      { id: 'b', url: 'https://cdn/b.jpg', category: 'amenities' },
    ];
    const resolved = resolveCover({ photos: legacy });
    expect(resolved?.id).toBe('a');
    expect(photosForSlot(legacy, 'cover', resolved!.url).map(p => p.id)).toEqual(['a']);
    const saved = normalizePhotosForCover(legacy, resolved!.url);
    expect(saved[0]).toMatchObject({ category: 'featured', isPrimary: true });
    expect(saved[1].category).toBe('amenities');
    // The preview uses the same rule.
    expect(buildPreviewModel({ media: { photos: legacy } }).coverUrl).toBe('https://cdn/a.jpg');
  });

  it('legacy interior photos go to Other photos with their category unchanged', () => {
    const interior = { id: 'i', url: 'https://cdn/i.jpg', category: 'interior' };
    expect(slotForPhoto(interior, 'https://cdn/c.jpg')).toBe('other');
    expect(photosForSlot([interior, gate], 'other', 'https://cdn/c.jpg')).toEqual([interior]);
    expect(normalizePhotosForCover([interior], 'https://cdn/c.jpg')[0].category).toBe('interior');
  });
});

describe('documents survive save and reopen', () => {
  const brochure = { id: 'd1', url: 'https://cdn/b.pdf', fileName: 'b.pdf', storageKey: 'k3', mediaReceipt: 'r3', type: 'pdf', ...documentMeta('brochure') };

  it('the submit payload keeps documentType, title and label', () => {
    const [sent] = extractConfirmedMediaItems([brochure]) as Array<Record<string, unknown>>;
    expect(sent).toMatchObject({ url: brochure.url, documentType: 'brochure', title: 'Brochure', label: 'Brochure' });
    // Also for a curated document that has no upload receipt.
    const [curated] = extractConfirmedMediaItems([{ url: 'https://cdn/s.pdf', ...documentMeta('spec_sheet') }]) as Array<Record<string, unknown>>;
    expect(curated).toMatchObject({ url: 'https://cdn/s.pdf', documentType: 'spec_sheet' });
    // Untyped, receipt-less documents are still plain URLs.
    expect(extractConfirmedMediaItems([{ url: 'https://cdn/x.pdf' }])).toEqual(['https://cdn/x.pdf']);
  });

  it('a reopened typed document lands back in its own slot', () => {
    const reopened = JSON.parse(JSON.stringify(extractConfirmedMediaItems([brochure])));
    const { bySlot, other } = groupDocuments(reopened);
    expect(bySlot.brochure?.url).toBe(brochure.url);
    expect(other).toEqual([]);
  });

  it('legacy untyped documents are placed by file name, else listed under Other documents', () => {
    expect(guessDocumentSlot({ fileName: 'Baltimore Brochure.pdf' })).toBe('brochure');
    expect(guessDocumentSlot({ fileName: 'site-plan.pdf' })).toBe('site_plan');
    expect(guessDocumentSlot({ fileName: 'Specification sheet.pdf' })).toBe('spec_sheet');
    expect(guessDocumentSlot({ fileName: 'Price list Nov.pdf' })).toBe('price_list');
    const docs = [
      { id: '1', url: 'u1', fileName: 'brochure.pdf' },
      { id: '2', url: 'u2', fileName: 'mystery.pdf' },
      { id: '3', url: 'u3', fileName: 'brochure-v2.pdf' },
    ];
    const { bySlot, other } = groupDocuments(docs);
    expect(bySlot.brochure?.id).toBe('1');
    expect(other.map(d => d.id)).toEqual(['2', '3']);
    // Saving stamps the type on slotted legacy documents; the others stay as they are.
    const stamped = stampDocuments(docs);
    expect(stamped.find(d => d.id === '1')).toMatchObject({ documentType: 'brochure' });
    expect(stamped.find(d => d.id === '2')).not.toHaveProperty('documentType');
  });

  it('re-uploading a slot replaces its document (no duplicate)', () => {
    const next = { id: 'd2', url: 'https://cdn/b2.pdf', ...documentMeta('brochure') };
    const { bySlot } = groupDocuments([brochure]);
    const kept = [brochure].filter(d => d !== bySlot.brochure);
    const saved = stampDocuments([...kept, next]);
    expect(saved.filter(d => d.documentType === 'brochure')).toHaveLength(1);
    expect(saved[0].url).toBe('https://cdn/b2.pdf');
  });
});

describe('public brochure button', () => {
  const resolve = (item: unknown) =>
    typeof item === 'string' ? item : ((item as any)?.url ?? null);

  it('only a brochure opens the brochure button; spec sheet only opens its own link', () => {
    const docs = [
      { url: 'site.pdf', documentType: 'site_plan' },
      { url: 'spec.pdf', documentType: 'spec_sheet' },
      { url: 'prices.pdf', documentType: 'price_list' },
    ];
    expect(pickBrochureUrl(docs, resolve)).toBeNull();
    expect(pickSpecSheetUrl(docs, resolve)).toBe('spec.pdf');
    expect(pickBrochureUrl([...docs, { url: 'b.pdf', documentType: 'brochure' }], resolve)).toBe('b.pdf');
  });

  it('legacy untyped documents count as a brochure only when named like one', () => {
    expect(pickBrochureUrl([{ url: 'https://x/files/plan.pdf' }], resolve)).toBeNull();
    expect(pickBrochureUrl(['https://x/files/plan.pdf'], resolve)).toBeNull();
    expect(pickBrochureUrl([{ url: 'https://x/a.pdf', fileName: 'Baltimore Brochure.pdf' }], resolve)).toBe(
      'https://x/a.pdf',
    );
    expect(pickSpecSheetUrl([{ url: 'https://x/a.pdf', fileName: 'Specification sheet.pdf' }], resolve)).toBe(
      'https://x/a.pdf',
    );
  });
});

describe('house type names are always unique', () => {
  it('numbers twins with the same size, beds and baths', () => {
    const twin = { unitSize: 91, bedrooms: 3, bathrooms: 2 };
    expect(suggestUnitName({ ...twin, homeType: 'freestanding' }, [], [])).toBe('91 m² 3-bedroom house');
    expect(suggestUnitName({ ...twin, homeType: 'freestanding' }, [twin], [twin])).toBe(
      '91 m² 3-bedroom house (2 baths) (2)',
    );
    expect(suggestUnitName({ ...twin, homeType: 'freestanding' }, [twin, twin], [twin, twin])).toBe(
      '91 m² 3-bedroom house (2 baths) (3)',
    );
  });
});
