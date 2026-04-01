import { describe, expect, it } from 'vitest';
import { buildDiscoveryOpsReport } from '../discoveryOpsReportService';

describe('buildDiscoveryOpsReport', () => {
  it('aggregates discovery inventory, engagement, and health alerts', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            groupBy: () => ({
              orderBy: async () => [
                { key: 'video', count: 9 },
                { key: 'service', count: 3 },
              ],
            }),
            orderBy: async () => [
              {
                contentId: 44,
                title: '',
                contentType: 'video',
                creatorType: 'agent',
                thumbnailUrl: '',
                videoUrl: null,
                createdAt: '2026-03-20T08:00:00.000Z',
                isFeatured: 1,
              },
            ],
          }),
          groupBy: () => ({
            orderBy: async () => [
              { day: '2026-03-19', count: 2 },
              { day: '2026-03-20', count: 4 },
            ],
          }),
        }),
      }),
    } as any;

    let callIndex = 0;
    db.select = () => {
      callIndex += 1;

      if (callIndex === 1) {
        return {
          from: () => ({
            where: async () => [
              {
                activeContent: 12,
                activeCreators: 5,
                featuredContent: 2,
                videosReady: 10,
              },
            ],
          }),
        };
      }

      if (callIndex === 2) {
        return {
          from: () => ({
            where: () => ({
              groupBy: () => ({
                orderBy: async () => [
                  { key: 'video', count: 9 },
                  { key: 'service', count: 3 },
                ],
              }),
            }),
          }),
        };
      }

      if (callIndex === 3) {
        return {
          from: () => ({
            where: () => ({
              groupBy: () => ({
                orderBy: async () => [
                  { key: 'agent', count: 8 },
                  { key: 'developer', count: 4 },
                ],
              }),
            }),
          }),
        };
      }

      if (callIndex === 4) {
        return {
          from: () => ({
            where: () => ({
              groupBy: () => ({
                orderBy: async () => [
                  { key: 'view', count: 100 },
                  { key: 'complete', count: 45 },
                  { key: 'save', count: 20 },
                  { key: 'share', count: 5 },
                ],
              }),
            }),
          }),
        };
      }

      if (callIndex === 5) {
        return {
          from: () => ({
            where: () => ({
              groupBy: () => ({
                orderBy: async () => [
                  { day: '2026-03-19', count: 2 },
                  { day: '2026-03-20', count: 4 },
                ],
              }),
            }),
          }),
        };
      }

      if (callIndex === 6) {
        return {
          from: () => ({
            where: async () => [
              {
                missingThumbnail: 3,
                missingVideo: 2,
                missingTitle: 1,
                featuredWithoutMedia: 1,
              },
            ],
          }),
        };
      }

      return {
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: async () => [
                {
                  contentId: 44,
                  title: '',
                  contentType: 'video',
                  creatorType: 'agent',
                  thumbnailUrl: '',
                  videoUrl: null,
                  createdAt: '2026-03-20T08:00:00.000Z',
                  isFeatured: 1,
                },
              ],
            }),
          }),
        }),
      };
    };

    const report = await buildDiscoveryOpsReport(db);

    expect(report.summary).toEqual({
      activeContent: 12,
      activeCreators: 5,
      featuredContent: 2,
      videosReady: 10,
      engagementEvents7d: 170,
      completionRate7d: 0.45,
      saveRate7d: 0.2,
      shareRate7d: 0.05,
    });

    expect(report.inventoryByContentType).toEqual([
      { key: 'video', label: 'video', count: 9 },
      { key: 'service', label: 'service', count: 3 },
    ]);

    expect(report.health).toEqual({
      missingThumbnail: 3,
      missingVideo: 2,
      missingTitle: 1,
      featuredWithoutMedia: 1,
    });

    expect(report.healthAlerts[0]).toEqual(
      expect.objectContaining({
        contentId: 44,
        title: 'Untitled content',
        issues: ['Missing title', 'Missing thumbnail', 'Missing video', 'Featured without media'],
        isFeatured: true,
      }),
    );
  });
});
