import { describe, expect, it } from 'vitest';
import { projectUnitMedia } from '../developmentSalesProjectionService';

describe('projectUnitMedia', () => {
  it('projects only public media fields from a stored JSON value', () => {
    const media = projectUnitMedia(
      JSON.stringify({
        gallery: [
          {
            id: 'gallery-1',
            url: 'https://cdn.example.com/unit.jpg',
            storageKey: 'private/key.jpg',
            uploadedBy: 42,
            isPrimary: true,
          },
        ],
        floorPlans: [
          {
            id: 'plan-1',
            url: '/files/unit-plan.pdf',
            fileName: 'Unit plan.pdf',
            type: 'pdf',
            uploadReceipt: 'secret',
          },
        ],
        renders: [
          {
            id: 'render-1',
            url: 'https://cdn.example.com/tour.mp4',
            type: 'video',
          },
        ],
      }),
    );

    expect(media).toEqual({
      gallery: [
        {
          url: 'https://cdn.example.com/unit.jpg',
          fileName: null,
          type: 'image',
        },
      ],
      floorPlans: [{ url: '/files/unit-plan.pdf', fileName: 'Unit plan.pdf', type: 'pdf' }],
      renders: [
        {
          url: 'https://cdn.example.com/tour.mp4',
          fileName: null,
          type: 'video',
        },
      ],
    });
  });

  it('parses double-encoded media payloads and string URL entries', () => {
    const media = projectUnitMedia(
      JSON.stringify(
        JSON.stringify({
          gallery: ['/placeholders/development_placeholder_1.png'],
          floorPlans: [],
          renders: [],
        }),
      ),
    );

    expect(media.gallery).toEqual([
      {
        url: '/placeholders/development_placeholder_1.png',
        fileName: null,
        type: 'image',
      },
    ]);
  });

  it('drops unsafe URLs while keeping valid sibling assets', () => {
    const media = projectUnitMedia({
      gallery: [
        { url: 'javascript:alert(1)' },
        { url: '//evil.example.com/image.jpg' },
        { url: 'data:image/png;base64,AAAA' },
        { url: '/safe/image.jpg' },
      ],
      floorPlans: [{ url: 'https://cdn.example.com/plan' }],
      renders: [{ url: 'https://cdn.example.com/render.png' }],
    });

    expect(media.gallery).toEqual([{ url: '/safe/image.jpg', fileName: null, type: 'image' }]);
    expect(media.floorPlans).toEqual([
      { url: 'https://cdn.example.com/plan', fileName: null, type: 'pdf' },
    ]);
    expect(media.renders).toEqual([
      { url: 'https://cdn.example.com/render.png', fileName: null, type: 'image' },
    ]);
  });

  it('deduplicates assets, caps collections, and trims file names', () => {
    const gallery = Array.from({ length: 20 }, (_, index) => ({
      url: `/gallery/${index}.jpg`,
    }));
    gallery.push({ url: '/gallery/0.jpg' });
    const media = projectUnitMedia({
      gallery,
      floorPlans: [{ url: '/plan.pdf', type: 'pdf', fileName: `  ${'x'.repeat(300)}  ` }],
      renders: [],
    });

    expect(media.gallery).toHaveLength(12);
    expect(media.gallery[0]?.url).toBe('/gallery/0.jpg');
    expect(media.floorPlans[0]?.fileName).toHaveLength(255);
  });

  it('returns empty folders for missing, invalid, or legacy shapes', () => {
    for (const value of [null, undefined, '', 'not-json', 42, [], ['/plain.jpg']]) {
      expect(projectUnitMedia(value)).toEqual({
        gallery: [],
        floorPlans: [],
        renders: [],
      });
    }
  });
});
