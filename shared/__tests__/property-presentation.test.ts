import { describe, expect, it } from 'vitest';
import {
  buildPropertyPresentationForMedia,
  getPresentationMediaDescriptor,
  normalizePropertyPresentation,
  safeParsePropertyPresentation,
  summarizePropertyPresentation,
} from '../property-presentation';

describe('property presentation contract', () => {
  it('keeps floor-plan meaning independent from PDF file format', () => {
    const presentation = buildPropertyPresentationForMedia(undefined, [
      {
        id: 'existing:12',
        type: 'floorplan',
        fileName: 'ground-floor.pdf',
        presentationLabel: 'Ground floor',
      },
    ]);

    expect(presentation?.media).toEqual([
      { mediaId: 'existing:12', kind: 'floorplan', label: 'Ground floor' },
    ]);
    expect(
      getPresentationMediaDescriptor(presentation, { id: 'existing:12', type: 'floorplan' }),
    ).toEqual({ kind: 'floorplan', label: 'Ground floor' });
  });

  it('accepts only approved Matterport URLs and derives the public launch URL', () => {
    const parsed = safeParsePropertyPresentation({
      media: [],
      virtualTour: {
        provider: 'matterport',
        sourceUrl: 'https://my.matterport.com/show/?m=abc123',
      },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data?.virtualTour?.embedUrl).toBe(
        'https://my.matterport.com/show/?m=abc123',
      );
    }
    expect(
      safeParsePropertyPresentation({
        media: [],
        virtualTour: { provider: 'matterport', sourceUrl: 'https://evil.example/embed' },
      }).success,
    ).toBe(false);
  });

  it('separates floorplans, documents, video and virtual-tour signals', () => {
    const presentation = normalizePropertyPresentation({
      media: [{ mediaId: 'plan-1', kind: 'floorplan', label: 'Site plan' }],
      virtualTour: {
        provider: 'matterport',
        sourceUrl: 'https://my.matterport.com/show/?m=plan-tour',
      },
    });
    const summary = summarizePropertyPresentation(
      [
        { id: 'image-1', type: 'image' },
        { id: 'video-1', type: 'video' },
        { id: 'plan-1', type: 'floorplan' },
        { id: 'doc-1', type: 'pdf' },
      ],
      presentation,
    );

    expect(summary).toEqual({
      photoCount: 1,
      hasVideo: true,
      hasFloorplan: true,
      hasDocuments: true,
      hasVirtualTour: true,
    });
  });
});
