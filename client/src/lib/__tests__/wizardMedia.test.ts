import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_SLOTS,
  MEDIA_MAX_BYTES,
  PHOTO_SLOTS,
  SPREADSHEET_MESSAGE,
  documentMeta,
  documentSlotOf,
  hasCoverPhoto,
  photosForSlot,
  rejectionMessage,
  sizeHint,
  slotForPhoto,
  sortDocuments,
  validateDevelopmentMedia,
  validateMediaFile,
} from '../wizardMedia';
import { residentialSaleWorkflow } from '../workflows/residential-sale';

const MB = 1024 * 1024;

describe('guided photo slots', () => {
  it('maps each slot onto an existing public gallery category, one to one', () => {
    expect(PHOTO_SLOTS.map(s => [s.id, s.category])).toEqual([
      ['cover', 'featured'],
      ['entrance', 'outdoors'],
      ['amenities', 'amenities'],
      ['streetscape', 'general'],
      ['neighbourhood', 'photo'],
    ]);
    for (const slot of PHOTO_SLOTS) {
      expect(slotForPhoto({ category: slot.category })).toBe(slot.id);
    }
  });

  it('re-sorts legacy categories into slots', () => {
    expect(slotForPhoto({ category: 'hero' })).toBe('cover');
    expect(slotForPhoto({ category: 'render' })).toBe('streetscape');
    expect(slotForPhoto({})).toBe('streetscape');
    const photos = [{ category: 'amenities' }, { category: 'outdoors' }, { category: 'amenities' }];
    expect(photosForSlot(photos, 'amenities')).toHaveLength(2);
  });

  it('only the cover is limited to one photo', () => {
    expect(PHOTO_SLOTS.filter(s => s.max === 1).map(s => s.id)).toEqual(['cover']);
  });
});

describe('cover photo is required', () => {
  it('needs a cover, not just any photo', () => {
    expect(hasCoverPhoto({ photos: [] })).toBe(false);
    // Removed on purpose: no cover, even though a photo remains.
    expect(hasCoverPhoto({ heroImage: null, photos: [{ category: 'amenities', url: 'a.jpg' }] })).toBe(false);
    expect(hasCoverPhoto({ photos: [{ category: 'featured', url: 'a.jpg' }] })).toBe(true);
    expect(hasCoverPhoto({ photos: [{ category: 'hero', url: 'a.jpg' }] })).toBe(true);
    expect(hasCoverPhoto({ photos: [{ category: 'general', isPrimary: true, url: 'a.jpg' }] })).toBe(true);
    expect(hasCoverPhoto({ heroImage: { url: 'h.jpg' }, photos: [] })).toBe(true);
    expect(validateDevelopmentMedia({ photos: [] })).toHaveLength(1);
    expect(validateDevelopmentMedia({ photos: [{ category: 'featured', url: 'a.jpg' }] })).toEqual([]);
  });

  it('gates the Media step of the sale workflow', () => {
    const step = residentialSaleWorkflow.steps.find(s => s.id === 'development_media')!;
    expect(
      step.validate({ media: { heroImage: null, photos: [{ category: 'outdoors', url: 'x.jpg' }] } } as any).valid,
    ).toBe(false);
    expect(step.validate({ media: { photos: [{ category: 'featured', url: 'x.jpg' }] } } as any).valid).toBe(true);
    expect(step.validate({} as any).valid).toBe(false);
  });
});

describe('size and type checks', () => {
  it('uses the server caps (15 / 80 / 25 MB) and states them in the hints', () => {
    expect(MEDIA_MAX_BYTES).toEqual({ image: 15 * MB, video: 80 * MB, pdf: 25 * MB });
    expect(sizeHint('image')).toContain('15 MB');
    expect(sizeHint('video')).toContain('80 MB');
    expect(sizeHint('pdf')).toContain('25 MB');
  });

  it('rejects oversize files and accepts files at the cap', () => {
    const img = { name: 'a.jpg', type: 'image/jpeg' };
    expect(validateMediaFile({ ...img, size: 15 * MB }, 'image')).toBeNull();
    expect(validateMediaFile({ ...img, size: 15 * MB + 1 }, 'image')).toBe('too large (max 15 MB).');
    expect(rejectionMessage({ ...img, size: 15 * MB + 1 }, 'image')).toBe('a.jpg: too large (max 15 MB).');
    expect(validateMediaFile({ name: 'v.mp4', type: 'video/mp4', size: 80 * MB + 1 }, 'video')).toMatch(/80 MB/);
    expect(validateMediaFile({ name: 'b.pdf', type: 'application/pdf', size: 25 * MB + 1 }, 'pdf')).toMatch(/25 MB/);
    expect(validateMediaFile({ ...img, size: 0 }, 'image')).toMatch(/empty/);
  });

  it('rejects a wrong photo or video type', () => {
    expect(validateMediaFile({ name: 'a.bmp', type: 'image/bmp', size: 10 }, 'image')).toMatch(/supported photo/);
    expect(validateMediaFile({ name: 'a.avi', type: 'video/x-msvideo', size: 10 }, 'video')).toMatch(/supported video/);
  });
});

describe('documents are PDF only', () => {
  const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  it('accepts a PDF', () => {
    expect(validateMediaFile({ name: 'brochure.pdf', type: 'application/pdf', size: 5 * MB }, 'pdf')).toBeNull();
  });

  it('rejects .xlsx with the private-spreadsheet message', () => {
    expect(validateMediaFile({ name: 'prices.xlsx', type: xlsx, size: 100 }, 'pdf')).toBe(SPREADSHEET_MESSAGE);
    // Even when the browser gives no content type.
    expect(validateMediaFile({ name: 'prices.XLSX', type: '', size: 100 }, 'pdf')).toBe(SPREADSHEET_MESSAGE);
    expect(validateMediaFile({ name: 'prices.csv', type: 'text/csv', size: 100 }, 'pdf')).toBe(SPREADSHEET_MESSAGE);
  });

  it('rejects other non-PDF files', () => {
    expect(validateMediaFile({ name: 'a.docx', type: 'application/msword', size: 10 }, 'pdf')).toMatch(/PDF/);
  });

  it('keeps document metadata the public page can read and the brochure first', () => {
    expect(DOCUMENT_SLOTS.map(s => s.id)).toEqual(['brochure', 'site_plan', 'spec_sheet', 'price_list']);
    const spec = documentMeta('spec_sheet');
    expect(spec).toMatchObject({ documentType: 'spec_sheet', category: 'document', title: 'Specification sheet' });
    // The public spec-sheet link looks for "spec" in title/label/documentType.
    expect(/spec(?:ification)?|finish(?:es)?|fitting/i.test(`${spec.title} ${spec.documentType}`)).toBe(true);
    expect(documentSlotOf(spec)).toBe('spec_sheet');
    const sorted = sortDocuments([
      { id: 'p', ...documentMeta('price_list') },
      { id: 'old' },
      { id: 'b', ...documentMeta('brochure') },
    ]);
    expect(sorted.map(d => d.id)).toEqual(['b', 'p', 'old']);
  });
});
