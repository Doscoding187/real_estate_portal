import { and, desc, eq, lt, sql } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';
import type { PublicAgentVideoPage } from '../../shared/agentPublicVideo';

const { agents, exploreContent } = schema;

export async function listPublicVideosForAgent(
  db: MySql2Database<typeof schema>,
  agentId: number,
  options: { limit?: number; cursor?: number } = {},
): Promise<PublicAgentVideoPage> {
  const limit = Math.min(12, Math.max(1, Math.trunc(options.limit ?? 6)));
  // explore_content is the launch public feed authority. isActive is its
  // publication gate; creatorId is an agent profile ID only for creatorType=agent.
  const rows = await db
    .select({
      id: exploreContent.id,
      title: exploreContent.title,
      description: exploreContent.description,
      thumbnailUrl: exploreContent.thumbnailUrl,
      videoUrl: exploreContent.videoUrl,
    })
    .from(exploreContent)
    .innerJoin(agents, eq(agents.id, exploreContent.creatorId))
    .where(
      and(
        eq(agents.id, agentId),
        eq(agents.status, 'approved'),
        eq(exploreContent.creatorType, 'agent'),
        eq(exploreContent.contentType, 'video'),
        eq(exploreContent.isActive, 1),
        sql`(${exploreContent.videoUrl} LIKE 'https://%' OR ${exploreContent.videoUrl} LIKE 'http://%' OR (${exploreContent.videoUrl} LIKE '/%' AND ${exploreContent.videoUrl} NOT LIKE '//%'))`,
        options.cursor ? lt(exploreContent.id, options.cursor) : undefined,
      ),
    )
    .orderBy(desc(exploreContent.id))
    .limit(limit + 1);

  return {
    items: rows.slice(0, limit).map(row => ({
      ...row,
      // The query requires a playable video URL, not merely a thumbnail.
      videoUrl: row.videoUrl!,
      thumbnailUrl:
        row.thumbnailUrl && /^(https?:\/\/|\/(?!\/))/.test(row.thumbnailUrl)
          ? row.thumbnailUrl
          : null,
    })),
    nextCursor: rows.length > limit ? rows[limit - 1].id : null,
  };
}
